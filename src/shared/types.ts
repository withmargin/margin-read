export type DisplayStyle = "integrated" | "highlighted";

export type CacheMode = "session" | "persistent" | "disabled";

export type TranslationProviderId = "openai" | "anthropic" | "google";

export interface ExtensionSettings {
  provider: TranslationProviderId;
  providerEndpoint: string;
  apiKey: string;
  model: string;
  sourceLanguage: string;
  targetLanguage: string;
  displayStyle: DisplayStyle;
  cacheMode: CacheMode;
}

export interface TextSegment {
  id: string;
  text: string;
  contextBefore?: string;
  contextAfter?: string;
}

export interface TranslationResult {
  id: string;
  text: string;
}

export interface ProviderModel {
  id: string;
  displayName?: string;
}

export interface TranslateBatchRequest {
  type: "TRANSLATE_BATCH";
  segments: TextSegment[];
}

export interface TranslateBatchResponse {
  ok: boolean;
  results?: TranslationResult[];
  error?: string;
}

export type RuntimeMessage =
  | TranslateBatchRequest
  | { type: "GET_SETTINGS" }
  | { type: "LIST_MODELS"; settings: ExtensionSettings }
  | { type: "TOGGLE_TRANSLATION"; enabled?: boolean }
  | { type: "GET_PAGE_STATE" }
  | { type: "CLEAR_CACHE" };
