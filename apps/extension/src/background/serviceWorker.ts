import { clearPersistentCache, getCachedTranslation, getSettings, setCachedTranslation } from "../shared/storage";
import type {
  ExtensionSettings,
  RuntimeMessage,
  ProviderModel,
  TextSegment,
  TranslateBatchResponse,
  TranslationResult
} from "../shared/types";
import { hashText } from "../shared/hash";
import { getProvider } from "./providers";
import { installUpgradeLifecycle } from "./upgradeLifecycle";

const sessionCache = new Map<string, string>();

installUpgradeLifecycle();

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((error: unknown) => {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "Unexpected extension error."
      });
    });
  return true;
});

export async function handleMessage(message: RuntimeMessage): Promise<unknown> {
  if (message.type === "GET_SETTINGS") {
    return { ok: true, settings: await getSettings() };
  }

  if (message.type === "CLEAR_CACHE") {
    sessionCache.clear();
    await clearPersistentCache();
    return { ok: true };
  }

  if (message.type === "TRANSLATE_BATCH") {
    return translateBatch(message.segments);
  }

  if (message.type === "LIST_MODELS") {
    return listProviderModels({ ...message.settings, apiKey: normalizeApiKey(message.settings.apiKey) });
  }

  return { ok: false, error: `Unsupported runtime message: ${getRuntimeMessageType(message)}.` };
}

async function translateBatch(segments: TextSegment[]): Promise<TranslateBatchResponse> {
  const settings = await getSettings();
  const apiKey = normalizeApiKey(settings.apiKey);

  if (!apiKey && settings.provider !== "openai-compatible") {
    return { ok: false, error: "Configure an API key in Margin options before translating." };
  }

  const results: TranslationResult[] = [];
  const misses: TextSegment[] = [];
  const missKeys = new Map<string, string>();

  for (const segment of segments) {
    const cacheKey = await hashText(
      JSON.stringify({
        endpoint: settings.providerEndpoint,
        model: settings.model,
        provider: settings.provider,
        sourceLanguage: settings.sourceLanguage,
        targetLanguage: settings.targetLanguage,
        text: segment.text
      })
    );

    const cached =
      settings.cacheMode === "disabled"
        ? undefined
        : sessionCache.get(cacheKey) ??
          (settings.cacheMode === "persistent" ? await getCachedTranslation(cacheKey) : undefined);

    if (cached) {
      results.push({ id: segment.id, text: cached });
    } else {
      misses.push(segment);
      missKeys.set(segment.id, cacheKey);
    }
  }

  if (misses.length > 0) {
    const translated = await requestProviderTranslation(misses, { ...settings, apiKey });
    for (const result of translated) {
      results.push(result);
      const cacheKey = missKeys.get(result.id);
      if (cacheKey && settings.cacheMode !== "disabled") {
        sessionCache.set(cacheKey, result.text);
        if (settings.cacheMode === "persistent") {
          await setCachedTranslation(cacheKey, result.text);
        }
      }
    }
  }

  return { ok: true, results };
}

function normalizeApiKey(apiKey: string): string {
  return apiKey.trim().replace(/^Bearer\s+/i, "").trim();
}

function getRuntimeMessageType(message: unknown): string {
  if (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    typeof message.type === "string"
  ) {
    return message.type;
  }

  return "unknown";
}

async function listProviderModels(
  settings: ExtensionSettings
): Promise<{ ok: boolean; models?: ProviderModel[]; error?: string }> {
  if (!settings.apiKey && settings.provider !== "openai-compatible") {
    return { ok: false, error: "Configure an API key before fetching models." };
  }

  try {
    const provider = getProvider(settings.provider);
    return { ok: true, models: await provider.listModels(settings) };
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : "Unsupported translation provider." };
  }
}

async function requestProviderTranslation(
  segments: TextSegment[],
  settings: ExtensionSettings
): Promise<TranslationResult[]> {
  return getProvider(settings.provider).translate(segments, settings);
}
