import { DEFAULT_SETTINGS } from "../shared/defaults";
import type { CacheMode, DisplayStyle, ExtensionSettings, TranslationProviderId } from "../shared/types";

export function fillForm(settings: ExtensionSettings): void {
  setInputValue("provider", settings.provider);
  setInputValue("providerEndpoint", settings.providerEndpoint);
  setInputValue("apiKey", settings.apiKey);
  setInputValue("model", settings.model);
  setInputValue("sourceLanguage", settings.sourceLanguage);
  setInputValue("targetLanguage", settings.targetLanguage);
  setInputValue("displayStyle", settings.displayStyle);
  setInputValue("cacheMode", settings.cacheMode);
  setCheckboxValue("debugMode", settings.debugMode);
  setCheckboxValue("xOptimizedTranslation", settings.xOptimizedTranslation);
  setCheckboxValue("xTranslateArticles", settings.xTranslateArticles);
  setCheckboxValue("xTranslateQuotedPosts", settings.xTranslateQuotedPosts);
  setCheckboxValue("xSkipNativeTranslatedPosts", settings.xSkipNativeTranslatedPosts);
  setCheckboxValue("openAICompatibleJsonMode", settings.openAICompatibleJsonMode);
}

export function readForm(): ExtensionSettings {
  return {
    ...DEFAULT_SETTINGS,
    provider: getInputValue("provider") as TranslationProviderId,
    providerEndpoint: getInputValue("providerEndpoint"),
    apiKey: getInputValue("apiKey"),
    model: getInputValue("model"),
    sourceLanguage: getInputValue("sourceLanguage"),
    targetLanguage: getInputValue("targetLanguage"),
    displayStyle: getInputValue("displayStyle") as DisplayStyle,
    cacheMode: getInputValue("cacheMode") as CacheMode,
    debugMode: getCheckboxValue("debugMode"),
    xOptimizedTranslation: getCheckboxValue("xOptimizedTranslation"),
    xTranslateArticles: getCheckboxValue("xTranslateArticles"),
    xTranslateQuotedPosts: getCheckboxValue("xTranslateQuotedPosts"),
    xSkipNativeTranslatedPosts: getCheckboxValue("xSkipNativeTranslatedPosts"),
    openAICompatibleJsonMode: getCheckboxValue("openAICompatibleJsonMode")
  };
}

export function setInputValue(name: string, value: string): void {
  const input = document.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`);
  if (input) {
    input.value = value;
  }
}

export function getInputValue(name: string): string {
  return document.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)?.value.trim() ?? "";
}

function setCheckboxValue(name: string, checked: boolean): void {
  const input = document.querySelector<HTMLInputElement>(`[name="${name}"]`);
  if (input) {
    input.checked = checked;
  }
}

function getCheckboxValue(name: string): boolean {
  return document.querySelector<HTMLInputElement>(`[name="${name}"]`)?.checked ?? false;
}
