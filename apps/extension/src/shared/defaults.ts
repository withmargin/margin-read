import { SETTINGS_VERSION, type ExtensionSettings, type TranslationProviderId } from "./types";

export const PROVIDER_DEFAULTS: Record<
  TranslationProviderId,
  Pick<ExtensionSettings, "providerEndpoint" | "model">
> = {
  openai: {
    providerEndpoint: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4.1-mini"
  },
  anthropic: {
    providerEndpoint: "https://api.anthropic.com/v1/messages",
    model: "claude-3-5-haiku-latest"
  },
  google: {
    providerEndpoint: "https://generativelanguage.googleapis.com/v1beta/models",
    model: "gemini-1.5-flash"
  },
  "openai-compatible": {
    providerEndpoint: "http://localhost:1234/v1/chat/completions",
    model: "local-model"
  }
};

export const DEFAULT_SETTINGS: ExtensionSettings = {
  version: SETTINGS_VERSION,
  provider: "openai",
  providerEndpoint: PROVIDER_DEFAULTS.openai.providerEndpoint,
  apiKey: "",
  model: PROVIDER_DEFAULTS.openai.model,
  sourceLanguage: "auto",
  targetLanguage: "English",
  displayStyle: "integrated",
  cacheMode: "persistent",
  debugMode: false,
  siteAdapters: {
    x: {
      enabled: true,
      translateArticles: true,
      quotedPosts: false,
      skipNativeTranslated: true
    }
  },
  openAICompatibleJsonMode: true,
  showFloatingButton: false
};

export const SETTINGS_KEY = "margin.settings";
export const CACHE_KEY_PREFIX = "margin.cache.";
