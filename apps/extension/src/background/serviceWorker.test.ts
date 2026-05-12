import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CACHE_KEY_PREFIX, DEFAULT_SETTINGS, SETTINGS_KEY } from "../shared/defaults";
import type { ExtensionSettings, RuntimeMessage, TextSegment, TranslationResult } from "../shared/types";
import type * as ServiceWorkerModuleType from "./serviceWorker";

type ServiceWorkerModule = typeof ServiceWorkerModuleType;

interface FetchCall {
  url: string;
  init: RequestInit;
}

interface TranslateBatchResult {
  ok: boolean;
  results?: TranslationResult[];
  error?: string;
}

interface ListModelsResult {
  ok: boolean;
  models?: Array<{ id: string }>;
  error?: string;
}

interface GetSettingsResult {
  ok: boolean;
  settings?: ExtensionSettings;
}

interface ClearCacheResult {
  ok: boolean;
}

interface UnsupportedResult {
  ok: boolean;
  error?: string;
}

type MessageListener = (
  message: RuntimeMessage,
  sender: unknown,
  sendResponse: (response: unknown) => void
) => boolean | undefined;

const storageStore = new Map<string, unknown>();
const fetchCalls: FetchCall[] = [];
let fetchResponder: (url: string, init: RequestInit) => Response | Promise<Response> = () => new Response("noop");
let registeredListener: MessageListener | undefined;

async function loadModule(): Promise<ServiceWorkerModule> {
  vi.resetModules();
  return import("./serviceWorker");
}

beforeEach(() => {
  storageStore.clear();
  fetchCalls.length = 0;
  fetchResponder = () => new Response("noop");

  registeredListener = undefined;
  vi.stubGlobal("chrome", {
    runtime: {
      onMessage: {
        addListener: vi.fn((listener: MessageListener) => {
          registeredListener = listener;
        })
      }
    },
    storage: {
      local: {
        get: vi.fn((key: string | null) => {
          if (key === null) {
            return Promise.resolve(Object.fromEntries(storageStore));
          }
          return Promise.resolve({ [key]: storageStore.get(key) });
        }),
        set: vi.fn((values: Record<string, unknown>) => {
          for (const [key, value] of Object.entries(values)) {
            storageStore.set(key, value);
          }
          return Promise.resolve();
        }),
        remove: vi.fn((keys: string[]) => {
          for (const key of keys) {
            storageStore.delete(key);
          }
          return Promise.resolve();
        })
      }
    }
  });

  const fakeFetch = vi.fn((input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    fetchCalls.push({ url, init });
    return Promise.resolve(fetchResponder(url, init));
  });
  vi.stubGlobal("fetch", fakeFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function saveSettings(overrides: Partial<ExtensionSettings>): void {
  storageStore.set(SETTINGS_KEY, { ...DEFAULT_SETTINGS, ...overrides });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("handleMessage GET_SETTINGS", () => {
  it("returns merged settings", async () => {
    saveSettings({ targetLanguage: "繁體中文", apiKey: "stored-key" });
    const { handleMessage } = await loadModule();

    const result = (await handleMessage({ type: "GET_SETTINGS" })) as GetSettingsResult;

    expect(result.ok).toBe(true);
    expect(result.settings?.targetLanguage).toBe("繁體中文");
    expect(result.settings?.apiKey).toBe("stored-key");
  });
});

describe("handleMessage CLEAR_CACHE", () => {
  it("clears persistent cache entries but keeps settings", async () => {
    saveSettings({});
    storageStore.set(`${CACHE_KEY_PREFIX}abc`, "cached");
    storageStore.set(`${CACHE_KEY_PREFIX}def`, "cached2");
    const { handleMessage } = await loadModule();

    const result = (await handleMessage({ type: "CLEAR_CACHE" })) as ClearCacheResult;

    expect(result.ok).toBe(true);
    expect(storageStore.has(`${CACHE_KEY_PREFIX}abc`)).toBe(false);
    expect(storageStore.has(`${CACHE_KEY_PREFIX}def`)).toBe(false);
    expect(storageStore.has(SETTINGS_KEY)).toBe(true);
  });
});

describe("handleMessage TRANSLATE_BATCH", () => {
  const segments: TextSegment[] = [{ id: "s1", text: "Hello" }];

  function stubOpenAIResponse(translations: TranslationResult[]): void {
    fetchResponder = () =>
      jsonResponse({
        choices: [{ message: { content: JSON.stringify({ translations }) } }]
      });
  }

  it("returns an error when api key is missing for a non-local provider", async () => {
    saveSettings({ provider: "openai", apiKey: "" });
    const { handleMessage } = await loadModule();

    const result = (await handleMessage({ type: "TRANSLATE_BATCH", segments })) as TranslateBatchResult;

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Configure an API key/);
    expect(fetchCalls).toHaveLength(0);
  });

  it("allows openai-compatible without an api key", async () => {
    saveSettings({ provider: "openai-compatible", apiKey: "" });
    stubOpenAIResponse([{ id: "s1", text: "你好" }]);
    const { handleMessage } = await loadModule();

    const result = (await handleMessage({ type: "TRANSLATE_BATCH", segments })) as TranslateBatchResult;

    expect(result.ok).toBe(true);
    expect(result.results).toEqual([{ id: "s1", text: "你好" }]);
  });

  it("dispatches through the registry and caches results in session and persistent stores", async () => {
    saveSettings({ provider: "openai", apiKey: "sk-test", cacheMode: "persistent", targetLanguage: "繁體中文" });
    stubOpenAIResponse([{ id: "s1", text: "你好" }]);
    const { handleMessage } = await loadModule();

    const first = (await handleMessage({ type: "TRANSLATE_BATCH", segments })) as TranslateBatchResult;
    expect(first.results).toEqual([{ id: "s1", text: "你好" }]);
    expect(fetchCalls).toHaveLength(1);

    fetchResponder = () => {
      throw new Error("should not refetch on cache hit");
    };

    const second = (await handleMessage({ type: "TRANSLATE_BATCH", segments })) as TranslateBatchResult;
    expect(second.results).toEqual([{ id: "s1", text: "你好" }]);
    expect(fetchCalls).toHaveLength(1);

    const persistentKeys = Array.from(storageStore.keys()).filter((key) => key.startsWith(CACHE_KEY_PREFIX));
    expect(persistentKeys).toHaveLength(1);
  });

  it("skips persistent writes when cacheMode is session", async () => {
    saveSettings({ provider: "openai", apiKey: "sk-test", cacheMode: "session" });
    stubOpenAIResponse([{ id: "s1", text: "Translated" }]);
    const { handleMessage } = await loadModule();

    await handleMessage({ type: "TRANSLATE_BATCH", segments });

    const persistentKeys = Array.from(storageStore.keys()).filter((key) => key.startsWith(CACHE_KEY_PREFIX));
    expect(persistentKeys).toHaveLength(0);
  });

  it("does not write any cache when cacheMode is disabled", async () => {
    saveSettings({ provider: "openai", apiKey: "sk-test", cacheMode: "disabled" });
    stubOpenAIResponse([{ id: "s1", text: "Translated" }]);
    const { handleMessage } = await loadModule();

    await handleMessage({ type: "TRANSLATE_BATCH", segments });
    await handleMessage({ type: "TRANSLATE_BATCH", segments });

    expect(fetchCalls).toHaveLength(2);
    const persistentKeys = Array.from(storageStore.keys()).filter((key) => key.startsWith(CACHE_KEY_PREFIX));
    expect(persistentKeys).toHaveLength(0);
  });

  it("strips Bearer prefix from stored api keys before calling provider", async () => {
    saveSettings({ provider: "openai", apiKey: "Bearer sk-leak" });
    stubOpenAIResponse([{ id: "s1", text: "Done" }]);
    const { handleMessage } = await loadModule();

    await handleMessage({ type: "TRANSLATE_BATCH", segments });

    const headers = fetchCalls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer sk-leak");
  });
});

describe("handleMessage LIST_MODELS", () => {
  function makeSettings(overrides: Partial<ExtensionSettings> = {}): ExtensionSettings {
    return { ...DEFAULT_SETTINGS, ...overrides };
  }

  it("rejects when api key is missing for a non-local provider", async () => {
    const { handleMessage } = await loadModule();

    const result = (await handleMessage({
      type: "LIST_MODELS",
      settings: makeSettings({ provider: "openai", apiKey: "" })
    })) as ListModelsResult;

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Configure an API key/);
  });

  it("dispatches to the registered provider", async () => {
    fetchResponder = () => jsonResponse({ data: [{ id: "gpt-4o" }, { id: "gpt-4o-mini" }] });
    const { handleMessage } = await loadModule();

    const result = (await handleMessage({
      type: "LIST_MODELS",
      settings: makeSettings({ provider: "openai", apiKey: "sk-test" })
    })) as ListModelsResult;

    expect(result.ok).toBe(true);
    expect(result.models).toEqual([{ id: "gpt-4o" }, { id: "gpt-4o-mini" }]);
  });

  it("reports provider errors through the response shape", async () => {
    fetchResponder = () => new Response("unauthorized", { status: 401 });
    const { handleMessage } = await loadModule();

    const result = (await handleMessage({
      type: "LIST_MODELS",
      settings: makeSettings({ provider: "openai", apiKey: "sk-bad" })
    })) as ListModelsResult;

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/401/);
  });
});

describe("runtime listener wiring", () => {
  it("registers a listener on import and dispatches successful responses", async () => {
    saveSettings({});
    await loadModule();
    expect(registeredListener).toBeDefined();

    const sendResponse = vi.fn();
    const returnValue = registeredListener?.({ type: "GET_SETTINGS" }, {}, sendResponse);

    expect(returnValue).toBe(true);
    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalled();
    });
    expect((sendResponse.mock.calls[0][0] as GetSettingsResult).ok).toBe(true);
  });

  it("forwards thrown errors as a failure response", async () => {
    saveSettings({ provider: "openai", apiKey: "sk-test" });
    fetchResponder = () => {
      throw new Error("network down");
    };
    await loadModule();

    const sendResponse = vi.fn();
    registeredListener?.(
      { type: "TRANSLATE_BATCH", segments: [{ id: "s1", text: "Hello world hello world" }] },
      {},
      sendResponse
    );

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalled();
    });
    const response = sendResponse.mock.calls[0][0] as UnsupportedResult;
    expect(response.ok).toBe(false);
    expect(response.error).toMatch(/network down/);
  });
});

describe("handleMessage unknown messages", () => {
  it("returns an error including the message type", async () => {
    const { handleMessage } = await loadModule();

    const result = (await handleMessage({ type: "BOGUS" } as unknown as RuntimeMessage)) as UnsupportedResult;

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/BOGUS/);
  });

  it("falls back to 'unknown' when message has no type field", async () => {
    const { handleMessage } = await loadModule();

    const result = (await handleMessage({} as unknown as RuntimeMessage)) as UnsupportedResult;

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/unknown/);
  });
});
