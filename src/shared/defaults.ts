import type { ExtensionSettings } from "./types";

export const DEFAULT_SETTINGS: ExtensionSettings = {
  providerEndpoint: "https://api.openai.com/v1/chat/completions",
  apiKey: "",
  model: "gpt-4.1-mini",
  sourceLanguage: "auto",
  targetLanguage: "English",
  displayStyle: "below",
  cacheMode: "persistent"
};

export const SETTINGS_KEY = "rosetta.settings";
export const CACHE_KEY_PREFIX = "rosetta.cache.";
