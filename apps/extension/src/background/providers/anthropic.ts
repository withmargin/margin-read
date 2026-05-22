import type { Message, MessageCreateParamsNonStreaming, Tool } from "@anthropic-ai/sdk/resources/messages/messages";
import type { ModelInfo } from "@anthropic-ai/sdk/resources/models";
import type { ExtensionSettings, ProviderModel, TextSegment, TranslationResult } from "../../shared/types";
import {
  assertProviderResponse,
  buildTranslationPayload,
  buildV1ModelsEndpoint,
  getTranslationSchema,
  parseTranslations,
  TRANSLATION_SYSTEM_PROMPT,
  validateTranslations
} from "./shared";
import type { TranslationProvider } from "./types";

const ANTHROPIC_VERSION = "2023-06-01";
const TRANSLATION_TOOL_NAME = "return_translations";

type AnthropicRequestBody = MessageCreateParamsNonStreaming;
type AnthropicResponse = Message;
type AnthropicModelListResponse = { data?: Array<Partial<ModelInfo>> };

export const anthropicProvider: TranslationProvider = {
  id: "anthropic",
  translate: translateWithAnthropic,
  listModels: listAnthropicModels
};

export const anthropicCompatibleProvider: TranslationProvider = {
  id: "anthropic-compatible",
  translate: translateWithAnthropic,
  listModels: listAnthropicModels
};

async function translateWithAnthropic(
  segments: TextSegment[],
  settings: ExtensionSettings
): Promise<TranslationResult[]> {
  const body = {
    model: settings.model,
    max_tokens: 4096,
    temperature: 0,
    system: TRANSLATION_SYSTEM_PROMPT,
    tools: [
      {
        name: TRANSLATION_TOOL_NAME,
        description: "Return translated text segments for bilingual webpage reading.",
        input_schema: getTranslationSchema() as Tool.InputSchema
      }
    ],
    tool_choice: { type: "tool" as const, name: TRANSLATION_TOOL_NAME },
    messages: [{ role: "user" as const, content: buildTranslationPayload(segments, settings) }]
  } satisfies AnthropicRequestBody;

  const response = await fetch(settings.providerEndpoint, {
    method: "POST",
    headers: buildAnthropicHeaders(settings),
    body: JSON.stringify(body)
  });

  await assertProviderResponse(response);

  const payload = (await response.json()) as Partial<AnthropicResponse>;
  const toolUse = payload.content?.find(
    (item): item is Extract<AnthropicResponse["content"][number], { type: "tool_use" }> =>
      item.type === "tool_use" && item.name === TRANSLATION_TOOL_NAME && Boolean(item.input)
  );

  if (toolUse) {
    return validateTranslations(toolUse.input, segments);
  }

  const textBlock = payload.content?.find(
    (item): item is Extract<AnthropicResponse["content"][number], { type: "text" }> =>
      item.type === "text" && Boolean(item.text)
  );
  if (!textBlock) {
    throw new Error("Provider response did not include translated content.");
  }

  return parseTranslations(textBlock.text, segments);
}

async function listAnthropicModels(settings: ExtensionSettings): Promise<ProviderModel[]> {
  const response = await fetch(buildV1ModelsEndpoint(settings.providerEndpoint), {
    headers: buildAnthropicHeaders(settings)
  });
  await assertProviderResponse(response);

  const payload = (await response.json()) as AnthropicModelListResponse;
  return (payload.data ?? [])
    .filter(
      (model): model is { id: string; display_name?: string } =>
        typeof model.id === "string" && model.id.length > 0
    )
    .map((model) => ({ id: model.id, ...(model.display_name ? { displayName: model.display_name } : {}) }));
}

function buildAnthropicHeaders(settings: ExtensionSettings): Record<string, string> {
  if (settings.provider === "anthropic") {
    return {
      "Content-Type": "application/json",
      "anthropic-version": ANTHROPIC_VERSION,
      "x-api-key": settings.apiKey,
      "anthropic-dangerous-direct-browser-access": "true"
    };
  }

  return {
    "Content-Type": "application/json",
    "anthropic-version": ANTHROPIC_VERSION,
    ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {})
  };
}
