import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../../shared/defaults";
import type { ExtensionSettings, TextSegment } from "../../shared/types";
import {
  assertProviderResponse,
  buildTranslationPayload,
  getTranslationSchema,
  parseTranslations,
  TRANSLATION_SYSTEM_PROMPT,
  validateTranslations
} from "./shared";

const segments: TextSegment[] = [
  { id: "a", text: "Hello" },
  { id: "b", text: "World" }
];

function makeSettings(overrides: Partial<ExtensionSettings> = {}): ExtensionSettings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

describe("TRANSLATION_SYSTEM_PROMPT", () => {
  it("instructs the model to return JSON", () => {
    expect(TRANSLATION_SYSTEM_PROMPT).toContain("Return only valid JSON");
  });
});

interface TranslationPayload {
  sourceLanguage: string;
  targetLanguage: string;
  segments: TextSegment[];
}

function decodePayload(json: string): TranslationPayload {
  return JSON.parse(json) as TranslationPayload;
}

describe("buildTranslationPayload", () => {
  it("encodes target and source language alongside segments", () => {
    const payload = decodePayload(
      buildTranslationPayload(segments, makeSettings({ sourceLanguage: "English", targetLanguage: "繁體中文" }))
    );

    expect(payload).toMatchObject({
      sourceLanguage: "English",
      targetLanguage: "繁體中文",
      segments
    });
  });

  it("normalizes 'auto' to a descriptive label", () => {
    const payload = decodePayload(buildTranslationPayload(segments, makeSettings({ sourceLanguage: "auto" })));

    expect(payload.sourceLanguage).toBe("auto-detected source language");
  });

  it("treats mixed-case 'AUTO' as auto", () => {
    const payload = decodePayload(buildTranslationPayload(segments, makeSettings({ sourceLanguage: " AUTO " })));

    expect(payload.sourceLanguage).toBe("auto-detected source language");
  });

  it("trims explicit source language values", () => {
    const payload = decodePayload(buildTranslationPayload(segments, makeSettings({ sourceLanguage: "  Japanese  " })));

    expect(payload.sourceLanguage).toBe("Japanese");
  });
});

describe("getTranslationSchema", () => {
  it("declares translations as an array of {id, text} and forbids unknown keys", () => {
    expect(getTranslationSchema()).toEqual({
      type: "object",
      properties: {
        translations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              text: { type: "string" }
            },
            required: ["id", "text"],
            additionalProperties: false
          }
        }
      },
      required: ["translations"],
      additionalProperties: false
    });
  });
});

describe("assertProviderResponse", () => {
  it("resolves when response is ok", async () => {
    const response = new Response("ok", { status: 200 });
    await expect(assertProviderResponse(response)).resolves.toBeUndefined();
  });

  it("throws with status and truncated body", async () => {
    const response = new Response("rate limited".repeat(40), { status: 429 });

    await expect(assertProviderResponse(response)).rejects.toThrow(/429/);
  });

  it("truncates very long error bodies to 240 chars", async () => {
    const body = "x".repeat(500);
    const response = new Response(body, { status: 500 });

    await expect(assertProviderResponse(response)).rejects.toThrow(/x{240}(?!x)/);
  });
});

describe("validateTranslations", () => {
  it("keeps results whose id matches a requested segment", () => {
    expect(validateTranslations({ translations: [{ id: "a", text: "你好" }] }, segments)).toEqual([
      { id: "a", text: "你好" }
    ]);
  });

  it("drops unknown ids", () => {
    expect(
      validateTranslations(
        {
          translations: [
            { id: "a", text: "你好" },
            { id: "x", text: "ignored" }
          ]
        },
        segments
      )
    ).toEqual([{ id: "a", text: "你好" }]);
  });

  it("drops empty translations", () => {
    expect(
      validateTranslations(
        {
          translations: [
            { id: "a", text: " " },
            { id: "b", text: "World" }
          ]
        },
        segments
      )
    ).toEqual([{ id: "b", text: "World" }]);
  });

  it("returns an empty list when shape is wrong", () => {
    expect(validateTranslations({ translations: "nope" }, segments)).toEqual([]);
    expect(validateTranslations(null, segments)).toEqual([]);
    expect(validateTranslations({ translations: [42, "text"] }, segments)).toEqual([]);
  });
});

describe("parseTranslations", () => {
  it("parses a fenced JSON payload", () => {
    const content = '```json\n{"translations":[{"id":"a","text":"你好"}]}\n```';
    expect(parseTranslations(content, segments)).toEqual([{ id: "a", text: "你好" }]);
  });

  it("parses a raw JSON payload", () => {
    const content = '{"translations":[{"id":"b","text":"世界"}]}';
    expect(parseTranslations(content, segments)).toEqual([{ id: "b", text: "世界" }]);
  });
});
