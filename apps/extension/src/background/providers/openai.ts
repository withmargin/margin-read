import type { ExtensionSettings, ProviderModel, TextSegment, TranslationResult } from "../../shared/types";
import {
  assertProviderResponse,
  buildTranslationPayload,
  parseTranslations,
  TRANSLATION_SYSTEM_PROMPT
} from "./shared";
import type { TranslationProvider } from "./types";

interface OpenAIChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

interface OpenAIModelListResponse {
  data?: Array<{ id?: string }>;
}

export const openaiProvider: TranslationProvider = {
  id: "openai",
  translate: translateWithOpenAI,
  listModels: listOpenAIModels
};

export const openaiCompatibleProvider: TranslationProvider = {
  id: "openai-compatible",
  translate: translateWithOpenAI,
  listModels: listOpenAIModels
};

async function translateWithOpenAI(
  segments: TextSegment[],
  settings: ExtensionSettings
): Promise<TranslationResult[]> {
  const response = await fetch(settings.providerEndpoint, {
    method: "POST",
    headers: buildOpenAIHeaders(settings),
    body: JSON.stringify({
      model: settings.model,
      temperature: 0,
      ...(shouldRequestJsonMode(settings) ? { response_format: { type: "json_object" } } : {}),
      messages: [
        { role: "system", content: TRANSLATION_SYSTEM_PROMPT },
        { role: "user", content: buildTranslationPayload(segments, settings) }
      ]
    })
  });

  await assertProviderResponse(response);

  const payload = (await response.json()) as OpenAIChatCompletionResponse;
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Provider response did not include translated content.");
  }

  return parseTranslations(content, segments);
}

async function listOpenAIModels(settings: ExtensionSettings): Promise<ProviderModel[]> {
  const response = await fetch(buildModelsEndpoint(settings.providerEndpoint), {
    headers: buildOpenAIHeaders(settings)
  });
  await assertProviderResponse(response);

  const payload = (await response.json()) as OpenAIModelListResponse;
  return (payload.data ?? [])
    .filter((model): model is { id: string } => typeof model.id === "string" && model.id.length > 0)
    .map((model) => ({ id: model.id }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

function buildOpenAIHeaders(settings: ExtensionSettings): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {})
  };
}

function shouldRequestJsonMode(settings: ExtensionSettings): boolean {
  return settings.provider === "openai" || settings.openAICompatibleJsonMode;
}

function buildModelsEndpoint(providerEndpoint: string): string {
  const url = new URL(providerEndpoint);
  url.pathname = "/v1/models";
  url.search = "";
  return url.toString();
}
