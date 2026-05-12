import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../../shared/defaults";
import type { ExtensionSettings, TextSegment } from "../../shared/types";
import { googleProvider } from "./google";

const segments: TextSegment[] = [
  { id: "a", text: "Hello" },
  { id: "b", text: "World" }
];

function makeSettings(overrides: Partial<ExtensionSettings> = {}): ExtensionSettings {
  return {
    ...DEFAULT_SETTINGS,
    provider: "google",
    apiKey: "g-test",
    providerEndpoint: "https://generativelanguage.googleapis.com/v1beta/models",
    model: "gemini-1.5-flash",
    ...overrides
  };
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

describe("googleProvider.translate", () => {
  it("encodes model name into the generateContent path and key into the query string", async () => {
    const body = JSON.stringify({
      candidates: [
        {
          content: {
            parts: [{ text: '{"translations":[{"id":"a","text":"你好"}]}' }]
          }
        }
      ]
    });
    const { fetch: stub, calls } = stubFetch(new Response(body, { status: 200 }));
    vi.stubGlobal("fetch", stub);

    const results = await googleProvider.translate(segments, makeSettings());

    expect(results).toEqual([{ id: "a", text: "你好" }]);
    expect(calls[0].url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=g-test"
    );
    const generationConfig = calls[0].body.generationConfig as {
      temperature: number;
      responseMimeType: string;
      responseSchema: { type: string; properties: Record<string, unknown> };
    };
    expect(generationConfig.temperature).toBe(0);
    expect(generationConfig.responseMimeType).toBe("application/json");
    expect(generationConfig.responseSchema.type).toBe("object");
    expect(generationConfig.responseSchema.properties).toHaveProperty("translations");
    expect((calls[0].body.systemInstruction as { parts: Array<{ text: string }> }).parts[0].text).toContain(
      "Return only valid JSON"
    );
  });

  it("URL-encodes special characters in model name and api key", async () => {
    const body = JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"translations":[]}' }] } }] });
    const { fetch: stub, calls } = stubFetch(new Response(body, { status: 200 }));
    vi.stubGlobal("fetch", stub);

    await googleProvider.translate(
      segments,
      makeSettings({ model: "gemini-2.0/flash-preview", apiKey: "key with space" })
    );

    expect(calls[0].url).toContain("gemini-2.0%2Fflash-preview:generateContent");
    expect(calls[0].url).toContain("key=key%20with%20space");
  });

  it("trims a trailing slash from the configured endpoint", async () => {
    const body = JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"translations":[]}' }] } }] });
    const { fetch: stub, calls } = stubFetch(new Response(body, { status: 200 }));
    vi.stubGlobal("fetch", stub);

    await googleProvider.translate(
      segments,
      makeSettings({ providerEndpoint: "https://generativelanguage.googleapis.com/v1beta/models/" })
    );

    expect(calls[0].url).not.toContain("models//");
  });

  it("throws when no candidate text is returned", async () => {
    const { fetch: stub } = stubFetch(new Response(JSON.stringify({ candidates: [] }), { status: 200 }));
    vi.stubGlobal("fetch", stub);

    await expect(googleProvider.translate(segments, makeSettings())).rejects.toThrow(/did not include translated content/);
  });

  it("propagates non-2xx errors with provider status", async () => {
    const { fetch: stub } = stubFetch(new Response("quota exceeded", { status: 429 }));
    vi.stubGlobal("fetch", stub);

    await expect(googleProvider.translate(segments, makeSettings())).rejects.toThrow(/429/);
  });
});

describe("googleProvider.listModels", () => {
  it("strips models/ prefix and filters by generateContent support", async () => {
    const body = JSON.stringify({
      models: [
        { name: "models/gemini-1.5-flash", displayName: "Gemini 1.5 Flash", supportedGenerationMethods: ["generateContent"] },
        { name: "models/gemini-1.5-pro", displayName: "Gemini 1.5 Pro", supportedGenerationMethods: ["generateContent", "countTokens"] },
        { name: "models/embedding-001", displayName: "Embedding 001", supportedGenerationMethods: ["embedContent"] },
        { name: "" },
        { displayName: "no name" }
      ]
    });
    const { fetch: stub, calls } = stubFetch(new Response(body, { status: 200 }));
    vi.stubGlobal("fetch", stub);

    const models = await googleProvider.listModels(makeSettings());

    expect(models).toEqual([
      { id: "gemini-1.5-flash", displayName: "Gemini 1.5 Flash" },
      { id: "gemini-1.5-pro", displayName: "Gemini 1.5 Pro" }
    ]);
    expect(calls[0].url).toBe("https://generativelanguage.googleapis.com/v1beta/models?key=g-test");
  });

  it("keeps models without a supportedGenerationMethods field", async () => {
    const body = JSON.stringify({
      models: [{ name: "models/gemini-flash-latest", displayName: "Flash" }]
    });
    const { fetch: stub } = stubFetch(new Response(body, { status: 200 }));
    vi.stubGlobal("fetch", stub);

    const models = await googleProvider.listModels(makeSettings());
    expect(models).toEqual([{ id: "gemini-flash-latest", displayName: "Flash" }]);
  });
});
