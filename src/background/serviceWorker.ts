import { clearPersistentCache, getCachedTranslation, getSettings, setCachedTranslation } from "../shared/storage";
import type {
  ExtensionSettings,
  RuntimeMessage,
  TextSegment,
  TranslateBatchResponse,
  TranslationResult
} from "../shared/types";
import { hashText } from "../shared/hash";

const sessionCache = new Map<string, string>();

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

async function handleMessage(message: RuntimeMessage): Promise<unknown> {
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

  return { ok: false, error: "Unsupported runtime message." };
}

async function translateBatch(segments: TextSegment[]): Promise<TranslateBatchResponse> {
  const settings = await getSettings();

  if (!settings.apiKey.trim()) {
    return { ok: false, error: "Configure an API key in Rosetta options before translating." };
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
    const translated = await requestProviderTranslation(misses, settings);
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

async function requestProviderTranslation(segments: TextSegment[], settings: ExtensionSettings): Promise<TranslationResult[]> {
  if (settings.provider === "openai") {
    return requestOpenAITranslation(segments, settings);
  }

  if (settings.provider === "anthropic") {
    return requestAnthropicTranslation(segments, settings);
  }

  if (settings.provider === "google") {
    return requestGoogleTranslation(segments, settings);
  }

  throw new Error("Unsupported translation provider.");
}

function buildTranslationPayload(segments: TextSegment[], settings: ExtensionSettings): string {
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

async function requestOpenAITranslation(
  segments: TextSegment[],
  settings: ExtensionSettings
): Promise<TranslationResult[]> {
  const response = await fetch(settings.providerEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: settings.model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a translation engine for a browser extension. Return only valid JSON. Preserve meaning, names, URLs, code-like tokens, and formatting where practical."
        },
        {
          role: "user",
          content: buildTranslationPayload(segments, settings)
        }
      ]
    })
  });

  await assertProviderResponse(response);

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Provider response did not include translated content.");
  }

  return parseTranslations(content, segments);
}

async function requestAnthropicTranslation(
  segments: TextSegment[],
  settings: ExtensionSettings
): Promise<TranslationResult[]> {
  const response = await fetch(settings.providerEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": settings.apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: settings.model,
      max_tokens: 4096,
      temperature: 0,
      system:
        "You are a translation engine for a browser extension. Return only valid JSON. Preserve meaning, names, URLs, code-like tokens, and formatting where practical.",
      messages: [
        {
          role: "user",
          content: buildTranslationPayload(segments, settings)
        }
      ]
    })
  });

  await assertProviderResponse(response);

  const payload = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const content = payload.content?.find((item) => item.type === "text" && item.text)?.text;

  if (!content) {
    throw new Error("Provider response did not include translated content.");
  }

  return parseTranslations(content, segments);
}

async function requestGoogleTranslation(
  segments: TextSegment[],
  settings: ExtensionSettings
): Promise<TranslationResult[]> {
  const endpoint = `${settings.providerEndpoint.replace(/\/$/, "")}/${encodeURIComponent(
    settings.model
  )}:generateContent?key=${encodeURIComponent(settings.apiKey)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json"
      },
      systemInstruction: {
        parts: [
          {
            text: "You are a translation engine for a browser extension. Return only valid JSON. Preserve meaning, names, URLs, code-like tokens, and formatting where practical."
          }
        ]
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

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const content = payload.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;

  if (!content) {
    throw new Error("Provider response did not include translated content.");
  }

  return parseTranslations(content, segments);
}

async function assertProviderResponse(response: Response): Promise<void> {
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Provider request failed with ${response.status}: ${detail.slice(0, 240)}`);
  }
}

function parseTranslations(content: string, segments: TextSegment[]): TranslationResult[] {
  const parsed = JSON.parse(content) as { translations?: TranslationResult[] };
  const translations = parsed.translations ?? [];
  const validIds = new Set(segments.map((segment) => segment.id));

  return translations.filter(
    (translation) =>
      validIds.has(translation.id) &&
      typeof translation.text === "string" &&
      translation.text.trim().length > 0
  );
}
