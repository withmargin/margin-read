export type DisplayStyle = "integrated" | "highlighted";

export type CacheMode = "session" | "persistent" | "disabled";

export type TranslationProviderId = "openai" | "anthropic" | "google" | "openai-compatible";

export interface ExtensionSettings {
  provider: TranslationProviderId;
  providerEndpoint: string;
  apiKey: string;
  model: string;
  sourceLanguage: string;
  targetLanguage: string;
  displayStyle: DisplayStyle;
  cacheMode: CacheMode;
  debugMode: boolean;
  xOptimizedTranslation: boolean;
  xTranslateArticles: boolean;
  xTranslateQuotedPosts: boolean;
  xSkipNativeTranslatedPosts: boolean;
  openAICompatibleJsonMode: boolean;
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

export interface PageDebugState {
  debugMode: boolean;
  enabled: boolean;
  lastScanAt?: number;
  detectedBlocks: number;
  enqueuedBlocks: number;
  queueSize: number;
  runningRequests: number;
  pendingBlocks: number;
  translatedBlocks: number;
  errorBlocks: number;
  lastError?: string;
  sampleText?: string;
}

export type RuntimeMessage =
  | TranslateBatchRequest
  | { type: "GET_SETTINGS" }
  | { type: "LIST_MODELS"; settings: ExtensionSettings }
  | { type: "TOGGLE_TRANSLATION"; enabled?: boolean }
  | { type: "GET_PAGE_STATE" }
  | { type: "CLEAR_CACHE" };
