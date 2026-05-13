export type ModernDisplayStyle = "balanced" | "quiet" | "focus" | "card";
export type LegacyDisplayStyle = "integrated" | "highlighted";
export type DisplayStyle = ModernDisplayStyle | LegacyDisplayStyle;

export type CacheMode = "session" | "persistent" | "disabled";

export type TranslationProviderId = "openai" | "anthropic" | "google" | "openai-compatible";

export const SETTINGS_VERSION = 1;

export interface XSiteAdapterSettings {
  enabled: boolean;
  translateArticles: boolean;
  quotedPosts: boolean;
  skipNativeTranslated: boolean;
}

export interface SiteAdapterSettings {
  x: XSiteAdapterSettings;
}

export interface ExtensionSettings {
  version: typeof SETTINGS_VERSION;
  provider: TranslationProviderId;
  providerEndpoint: string;
  apiKey: string;
  model: string;
  sourceLanguage: string;
  targetLanguage: string;
  displayStyle: DisplayStyle;
  cacheMode: CacheMode;
  debugMode: boolean;
  siteAdapters: SiteAdapterSettings;
  openAICompatibleJsonMode: boolean;
  showFloatingButton: boolean;
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
