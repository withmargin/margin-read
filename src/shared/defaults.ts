import type { ExtensionSettings, TranslationProviderId } from "./types";

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
  }
};

export const DEFAULT_SETTINGS: ExtensionSettings = {
  provider: "openai",
  providerEndpoint: PROVIDER_DEFAULTS.openai.providerEndpoint,
  apiKey: "",
  model: PROVIDER_DEFAULTS.openai.model,
  sourceLanguage: "auto",
  targetLanguage: "English",
  displayStyle: "below",
  cacheMode: "persistent"
};

export const SETTINGS_KEY = "rosetta.settings";
export const CACHE_KEY_PREFIX = "rosetta.cache.";
