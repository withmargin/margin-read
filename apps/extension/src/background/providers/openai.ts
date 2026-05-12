import type { ChatCompletion, ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";
import type { Model } from "openai/resources/models";
import type { ExtensionSettings, ProviderModel, TextSegment, TranslationResult } from "../../shared/types";
import {
  assertProviderResponse,
  buildTranslationPayload,
  getTranslationSchema,
  parseTranslations,
  TRANSLATION_SYSTEM_PROMPT
} from "./shared";
import type { TranslationProvider } from "./types";

const STRUCTURED_OUTPUT_NAME = "translations";

type OpenAIRequestBody = ChatCompletionCreateParamsNonStreaming;
type OpenAIResponse = ChatCompletion;
type OpenAIModelListResponse = { data?: Array<Partial<Model>> };

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
  const body = {
    model: settings.model,
    temperature: 0,
    ...buildResponseFormat(settings),
    messages: [
      { role: "system", content: TRANSLATION_SYSTEM_PROMPT },
      { role: "user", content: buildTranslationPayload(segments, settings) }
    ]
  } satisfies OpenAIRequestBody;

  const response = await fetch(settings.providerEndpoint, {
    method: "POST",
    headers: buildOpenAIHeaders(settings),
    body: JSON.stringify(body)
  });

  await assertProviderResponse(response);

  const payload = (await response.json()) as Partial<OpenAIResponse>;
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

function buildResponseFormat(
  settings: ExtensionSettings
): { response_format?: OpenAIRequestBody["response_format"] } {
  if (settings.provider === "openai") {
    return {
      response_format: {
        type: "json_schema",
        json_schema: {
          name: STRUCTURED_OUTPUT_NAME,
          strict: true,
          schema: getTranslationSchema() as Record<string, unknown>
        }
      }
    };
  }

  if (settings.openAICompatibleJsonMode) {
    return { response_format: { type: "json_object" } };
  }

  return {};
}

function buildModelsEndpoint(providerEndpoint: string): string {
  const url = new URL(providerEndpoint);
  url.pathname = "/v1/models";
  url.search = "";
  return url.toString();
}
