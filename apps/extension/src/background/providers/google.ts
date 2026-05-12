import type { ExtensionSettings, ProviderModel, TextSegment, TranslationResult } from "../../shared/types";
import {
  assertProviderResponse,
  buildTranslationPayload,
  parseTranslations,
  TRANSLATION_SYSTEM_PROMPT
} from "./shared";
import type { TranslationProvider } from "./types";

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

interface GeminiModelListResponse {
  models?: Array<{
    name?: string;
    displayName?: string;
    supportedGenerationMethods?: string[];
  }>;
}

export const googleProvider: TranslationProvider = {
  id: "google",
  translate: translateWithGoogle,
  listModels: listGoogleModels
};

async function translateWithGoogle(
  segments: TextSegment[],
  settings: ExtensionSettings
): Promise<TranslationResult[]> {
  const endpoint = buildGenerateContentEndpoint(settings);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json"
      },
      systemInstruction: {
        parts: [{ text: TRANSLATION_SYSTEM_PROMPT }]
      },
      contents: [
        {
          role: "user",
          parts: [{ text: buildTranslationPayload(segments, settings) }]
        }
      ]
    })
  });

  await assertProviderResponse(response);

  const payload = (await response.json()) as GeminiGenerateContentResponse;
  const content = payload.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;

  if (!content) {
    throw new Error("Provider response did not include translated content.");
  }

  return parseTranslations(content, segments);
}

async function listGoogleModels(settings: ExtensionSettings): Promise<ProviderModel[]> {
  const endpoint = `${stripTrailingSlash(settings.providerEndpoint)}?key=${encodeURIComponent(settings.apiKey)}`;
  const response = await fetch(endpoint);
  await assertProviderResponse(response);

  const payload = (await response.json()) as GeminiModelListResponse;
  return (payload.models ?? [])
    .filter(
      (model): model is { name: string; displayName?: string; supportedGenerationMethods?: string[] } =>
        typeof model.name === "string" &&
        model.name.length > 0 &&
        (model.supportedGenerationMethods?.includes("generateContent") ?? true)
    )
    .map((model) => ({ id: model.name.replace(/^models\//, ""), displayName: model.displayName }));
}

function buildGenerateContentEndpoint(settings: ExtensionSettings): string {
  return `${stripTrailingSlash(settings.providerEndpoint)}/${encodeURIComponent(settings.model)}:generateContent?key=${encodeURIComponent(settings.apiKey)}`;
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/$/, "");
}
