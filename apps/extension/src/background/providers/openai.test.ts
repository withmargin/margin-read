import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../../shared/defaults";
import type { ExtensionSettings, TextSegment } from "../../shared/types";
import { openaiCompatibleProvider, openaiProvider } from "./openai";

const segments: TextSegment[] = [
  { id: "a", text: "Hello" },
  { id: "b", text: "World" }
];

function makeSettings(overrides: Partial<ExtensionSettings> = {}): ExtensionSettings {
  return { ...DEFAULT_SETTINGS, ...overrides };
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

describe("openaiProvider.translate", () => {
  it("posts to the configured endpoint with bearer auth, system prompt, and strict json_schema", async () => {
    const body = JSON.stringify({
      choices: [{ message: { content: '{"translations":[{"id":"a","text":"你好"}]}' } }]
    });
    const { fetch: stub, calls } = stubFetch(new Response(body, { status: 200 }));
    vi.stubGlobal("fetch", stub);

    const results = await openaiProvider.translate(
      segments,
      makeSettings({
        provider: "openai",
        apiKey: "sk-test",
        model: "gpt-4o-mini",
        providerEndpoint: "https://api.openai.com/v1/chat/completions"
      })
    );

    expect(results).toEqual([{ id: "a", text: "你好" }]);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.openai.com/v1/chat/completions");
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe("Bearer sk-test");
    const responseFormat = calls[0].body.response_format as {
      type: string;
      json_schema: { name: string; strict: boolean; schema: { type: string } };
    };
    expect(responseFormat.type).toBe("json_schema");
    expect(responseFormat.json_schema.name).toBe("translations");
    expect(responseFormat.json_schema.strict).toBe(true);
    expect(responseFormat.json_schema.schema.type).toBe("object");
    expect(calls[0].body.model).toBe("gpt-4o-mini");
    expect((calls[0].body.messages as Array<{ role: string }>)[0].role).toBe("system");
  });

  it("throws when provider returns no content", async () => {
    const { fetch: stub } = stubFetch(new Response(JSON.stringify({ choices: [{}] }), { status: 200 }));
    vi.stubGlobal("fetch", stub);

    await expect(openaiProvider.translate(segments, makeSettings({ provider: "openai", apiKey: "sk-test" }))).rejects.toThrow(
      /did not include translated content/
    );
  });

  it("propagates non-2xx errors with provider status", async () => {
    const { fetch: stub } = stubFetch(new Response("unauthorized", { status: 401 }));
    vi.stubGlobal("fetch", stub);

    await expect(openaiProvider.translate(segments, makeSettings({ provider: "openai", apiKey: "bad" }))).rejects.toThrow(
      /401/
    );
  });
});

describe("openaiCompatibleProvider.translate", () => {
  it("omits the Authorization header when api key is empty", async () => {
    const body = JSON.stringify({
      choices: [{ message: { content: '{"translations":[{"id":"a","text":"hola"}]}' } }]
    });
    const { fetch: stub, calls } = stubFetch(new Response(body, { status: 200 }));
    vi.stubGlobal("fetch", stub);

    await openaiCompatibleProvider.translate(
      segments,
      makeSettings({
        provider: "openai-compatible",
        apiKey: "",
        providerEndpoint: "http://localhost:1234/v1/chat/completions"
      })
    );

    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("uses json_object (not json_schema) when openAICompatibleJsonMode is on", async () => {
    const body = JSON.stringify({
      choices: [{ message: { content: '{"translations":[]}' } }]
    });
    const { fetch: stub, calls } = stubFetch(new Response(body, { status: 200 }));
    vi.stubGlobal("fetch", stub);

    await openaiCompatibleProvider.translate(
      segments,
      makeSettings({ provider: "openai-compatible", openAICompatibleJsonMode: true })
    );

    expect(calls[0].body.response_format).toEqual({ type: "json_object" });
  });

  it("omits response_format entirely when openAICompatibleJsonMode is off", async () => {
    const body = JSON.stringify({
      choices: [{ message: { content: '{"translations":[]}' } }]
    });
    const { fetch: stub, calls } = stubFetch(new Response(body, { status: 200 }));
    vi.stubGlobal("fetch", stub);

    await openaiCompatibleProvider.translate(
      segments,
      makeSettings({ provider: "openai-compatible", openAICompatibleJsonMode: false })
    );

    expect(calls[0].body.response_format).toBeUndefined();
  });
});

describe("openaiProvider.listModels", () => {
  it("returns sorted model ids", async () => {
    const body = JSON.stringify({
      data: [{ id: "gpt-4o" }, { id: "gpt-3.5-turbo" }, { id: "" }, { foo: "bar" }]
    });
    const { fetch: stub, calls } = stubFetch(new Response(body, { status: 200 }));
    vi.stubGlobal("fetch", stub);

    const models = await openaiProvider.listModels(
      makeSettings({
        provider: "openai",
        apiKey: "sk-test",
        providerEndpoint: "https://api.openai.com/v1/chat/completions"
      })
    );

    expect(models).toEqual([{ id: "gpt-3.5-turbo" }, { id: "gpt-4o" }]);
    expect(calls[0].url).toBe("https://api.openai.com/v1/models");
  });

  it("preserves the host but rewrites pathname for compatible endpoints", async () => {
    const { fetch: stub, calls } = stubFetch(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    vi.stubGlobal("fetch", stub);

    await openaiCompatibleProvider.listModels(
      makeSettings({
        provider: "openai-compatible",
        apiKey: "",
        providerEndpoint: "http://localhost:1234/v1/chat/completions"
      })
    );

    expect(calls[0].url).toBe("http://localhost:1234/v1/models");
  });
});
