import { extractJsonObject } from "../../shared/json";
import type { ExtensionSettings, TextSegment, TranslationResult } from "../../shared/types";

export const TRANSLATION_SYSTEM_PROMPT =
  "You are a translation engine for a browser extension. Return only valid JSON. Preserve meaning, names, URLs, code-like tokens, and formatting where practical.";

export function buildTranslationPayload(segments: TextSegment[], settings: ExtensionSettings): string {
  const source =
    settings.sourceLanguage.trim().toLowerCase() === "auto"
      ? "auto-detected source language"
      : settings.sourceLanguage.trim();

  return JSON.stringify({
    task: "Translate each segment for bilingual webpage reading.",
    sourceLanguage: source,
    targetLanguage: settings.targetLanguage,
    outputSchema: {
      translations: [{ id: "segment id", text: "translated text" }]
    },
    segments
  });
}

export function getTranslationSchema(): object {
  return {
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
          required: ["id", "text"]
        }
      }
    },
    required: ["translations"]
  };
}

export async function assertProviderResponse(response: Response): Promise<void> {
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Provider request failed with ${response.status}: ${detail.slice(0, 240)}`);
  }
}

export function parseTranslations(content: string, segments: TextSegment[]): TranslationResult[] {
  return validateTranslations(JSON.parse(extractJsonObject(content)), segments);
}

export function validateTranslations(value: unknown, segments: TextSegment[]): TranslationResult[] {
  const translations =
    typeof value === "object" && value !== null && "translations" in value && Array.isArray(value.translations)
      ? value.translations
      : [];
  const validIds = new Set(segments.map((segment) => segment.id));

  return translations.filter(
    (translation): translation is TranslationResult =>
      isTranslationResult(translation) &&
      validIds.has(translation.id) &&
      translation.text.trim().length > 0
  );
}

function isTranslationResult(value: unknown): value is TranslationResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "text" in value &&
    typeof value.text === "string"
  );
}
