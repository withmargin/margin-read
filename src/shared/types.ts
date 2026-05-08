export type DisplayStyle = "below";

export type CacheMode = "session" | "persistent" | "disabled";

export interface ExtensionSettings {
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
  | { type: "TOGGLE_TRANSLATION"; enabled?: boolean }
  | { type: "GET_PAGE_STATE" }
  | { type: "CLEAR_CACHE" };
