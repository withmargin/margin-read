import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../../shared/defaults";
import type { ExtensionSettings, TextSegment } from "../../shared/types";
import { anthropicCompatibleProvider, anthropicProvider } from "./anthropic";

const segments: TextSegment[] = [
  { id: "a", text: "Hello" },
  { id: "b", text: "World" }
];

function makeSettings(overrides: Partial<ExtensionSettings> = {}): ExtensionSettings {
  return { ...DEFAULT_SETTINGS, provider: "anthropic", apiKey: "ant-test", ...overrides };
}

interface FetchCall {
  url: string;
  init: RequestInit;
  body: Record<string, unknown>;
}

function stubFetch(response: Response): { fetch: typeof fetch; calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  const fakeFetch = vi.fn((input: RequestInfo | URL, init: RequestInit = {}) => {
    const rawBody = init.body;
    const body = typeof rawBody === "string" ? (JSON.parse(rawBody) as Record<string, unknown>) : {};
    calls.push({ url: stringifyUrl(input), init, body });
    return Promise.resolve(response);
  });
  return { fetch: fakeFetch, calls };
}

function stringifyUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  return input.url;
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("anthropicProvider.translate", () => {
  it("posts to /v1/messages with the documented browser-access header and tool schema", async () => {
    const body = JSON.stringify({
      content: [
        {
          type: "tool_use",
          name: "return_translations",
          input: { translations: [{ id: "a", text: "你好" }] }
        }
      ]
    });
    const { fetch: stub, calls } = stubFetch(new Response(body, { status: 200 }));
    vi.stubGlobal("fetch", stub);

    const results = await anthropicProvider.translate(
      segments,
      makeSettings({ providerEndpoint: "https://api.anthropic.com/v1/messages", model: "claude-3-5-haiku-latest" })
    );

    expect(results).toEqual([{ id: "a", text: "你好" }]);
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("ant-test");
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    expect(headers["anthropic-dangerous-direct-browser-access"]).toBe("true");
    expect(calls[0].body.model).toBe("claude-3-5-haiku-latest");
    expect(calls[0].body.tool_choice).toEqual({ type: "tool", name: "return_translations" });
    expect((calls[0].body.tools as Array<{ name: string }>)[0].name).toBe("return_translations");
  });

  it("falls back to text content when tool_use is missing", async () => {
    const body = JSON.stringify({
      content: [{ type: "text", text: '{"translations":[{"id":"b","text":"世界"}]}' }]
    });
    const { fetch: stub } = stubFetch(new Response(body, { status: 200 }));
    vi.stubGlobal("fetch", stub);

    const results = await anthropicProvider.translate(segments, makeSettings());

    expect(results).toEqual([{ id: "b", text: "世界" }]);
  });

  it("throws when content is empty", async () => {
    const { fetch: stub } = stubFetch(new Response(JSON.stringify({ content: [] }), { status: 200 }));
    vi.stubGlobal("fetch", stub);

    await expect(anthropicProvider.translate(segments, makeSettings())).rejects.toThrow(
      /did not include translated content/
    );
  });

  it("propagates non-2xx errors with provider status", async () => {
    const { fetch: stub } = stubFetch(new Response("forbidden", { status: 403 }));
    vi.stubGlobal("fetch", stub);

    await expect(anthropicProvider.translate(segments, makeSettings())).rejects.toThrow(/403/);
  });

  it("filters tool_use entries with empty input", async () => {
    const body = JSON.stringify({
      content: [
        { type: "tool_use", name: "return_translations", input: null },
        { type: "text", text: '{"translations":[{"id":"a","text":"fallback"}]}' }
      ]
    });
    const { fetch: stub } = stubFetch(new Response(body, { status: 200 }));
    vi.stubGlobal("fetch", stub);

    const results = await anthropicProvider.translate(segments, makeSettings());
    expect(results).toEqual([{ id: "a", text: "fallback" }]);
  });
});

describe("anthropicCompatibleProvider.translate", () => {
  it("uses Bearer auth and omits browser-access header when api key is provided", async () => {
    const body = JSON.stringify({
      content: [
        {
          type: "tool_use",
          name: "return_translations",
          input: { translations: [{ id: "a", text: "你好" }] }
        }
      ]
    });
    const { fetch: stub, calls } = stubFetch(new Response(body, { status: 200 }));
    vi.stubGlobal("fetch", stub);

    const results = await anthropicCompatibleProvider.translate(
      segments,
      makeSettings({
        provider: "anthropic-compatible",
        apiKey: "test-key",
        providerEndpoint: "http://localhost:8000/v1/messages"
      })
    );

    expect(results).toEqual([{ id: "a", text: "你好" }]);
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-key");
    expect(headers["x-api-key"]).toBeUndefined();
    expect(headers["anthropic-dangerous-direct-browser-access"]).toBeUndefined();
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    expect(calls[0].body.tool_choice).toBeUndefined();
    expect((calls[0].body.tools as Array<{ name: string }>)[0].name).toBe("return_translations");
  });

  it("omits Authorization header when api key is empty", async () => {
    const body = JSON.stringify({
      content: [
        {
          type: "tool_use",
          name: "return_translations",
          input: { translations: [{ id: "a", text: "你好" }] }
        }
      ]
    });
    const { fetch: stub, calls } = stubFetch(new Response(body, { status: 200 }));
    vi.stubGlobal("fetch", stub);

    const results = await anthropicCompatibleProvider.translate(
      segments,
      makeSettings({
        provider: "anthropic-compatible",
        apiKey: "",
        providerEndpoint: "http://localhost:8000/v1/messages"
      })
    );

    expect(results).toEqual([{ id: "a", text: "你好" }]);
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
    expect(headers["x-api-key"]).toBeUndefined();
  });
});

describe("anthropicCompatibleProvider.listModels", () => {
  it("uses Bearer auth when api key is provided", async () => {
    const body = JSON.stringify({ data: [{ id: "local-model" }] });
    const { fetch: stub, calls } = stubFetch(new Response(body, { status: 200 }));
    vi.stubGlobal("fetch", stub);

    const models = await anthropicCompatibleProvider.listModels(
      makeSettings({
        provider: "anthropic-compatible",
        apiKey: "cloud-key",
        providerEndpoint: "http://localhost:8000/v1/messages"
      })
    );

    expect(models).toEqual([{ id: "local-model" }]);
    expect(calls[0].url).toBe("http://localhost:8000/v1/models");
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer cloud-key");
    expect(headers["x-api-key"]).toBeUndefined();
  });

  it("omits Authorization header when api key is empty", async () => {
    const body = JSON.stringify({ data: [{ id: "local-model" }] });
    const { fetch: stub, calls } = stubFetch(new Response(body, { status: 200 }));
    vi.stubGlobal("fetch", stub);

    const models = await anthropicCompatibleProvider.listModels(
      makeSettings({
        provider: "anthropic-compatible",
        apiKey: "",
        providerEndpoint: "http://localhost:8000/v1/messages"
      })
    );

    expect(models).toEqual([{ id: "local-model" }]);
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
    expect(headers["x-api-key"]).toBeUndefined();
  });
});

describe("anthropicProvider.listModels", () => {
  it("returns models with display_name mapped to displayName", async () => {
    const body = JSON.stringify({
      data: [
        { id: "claude-3-5-haiku-latest", display_name: "Claude 3.5 Haiku" },
        { id: "claude-3-opus-latest", display_name: "Claude 3 Opus" },
        { id: "", display_name: "skip" },
        { display_name: "no id" }
      ]
    });
    const { fetch: stub, calls } = stubFetch(new Response(body, { status: 200 }));
    vi.stubGlobal("fetch", stub);

    const models = await anthropicProvider.listModels(
      makeSettings({ providerEndpoint: "https://api.anthropic.com/v1/messages" })
    );

    expect(models).toEqual([
      { id: "claude-3-5-haiku-latest", displayName: "Claude 3.5 Haiku" },
      { id: "claude-3-opus-latest", displayName: "Claude 3 Opus" }
    ]);
    expect(calls[0].url).toBe("https://api.anthropic.com/v1/models");
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("ant-test");
  });
});
