import { DEFAULT_SETTINGS } from "../shared/defaults";
import { normalizeDisplayStyle } from "../shared/displayStyle";
import type { CacheMode, ExtensionSettings, TranslationProviderId } from "../shared/types";

export function fillForm(settings: ExtensionSettings): void {
  setInputValue("provider", settings.provider);
  setInputValue("providerEndpoint", settings.providerEndpoint);
  setInputValue("apiKey", settings.apiKey);
  setInputValue("model", settings.model);
  setInputValue("sourceLanguage", settings.sourceLanguage);
  setInputValue("targetLanguage", settings.targetLanguage);
  setInputValue("displayStyle", normalizeDisplayStyle(settings.displayStyle));
  setInputValue("cacheMode", settings.cacheMode);
  setCheckboxValue("debugMode", settings.debugMode);
  setCheckboxValue("xOptimizedTranslation", settings.siteAdapters.x.enabled);
  setCheckboxValue("xTranslateArticles", settings.siteAdapters.x.translateArticles);
  setCheckboxValue("xTranslateQuotedPosts", settings.siteAdapters.x.quotedPosts);
  setCheckboxValue("xSkipNativeTranslatedPosts", settings.siteAdapters.x.skipNativeTranslated);
  setCheckboxValue("openAICompatibleJsonMode", settings.openAICompatibleJsonMode);
  setCheckboxValue("showFloatingButton", settings.showFloatingButton);
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
    displayStyle: normalizeDisplayStyle(getInputValue("displayStyle")),
    cacheMode: getInputValue("cacheMode") as CacheMode,
    debugMode: getCheckboxValue("debugMode"),
    siteAdapters: {
      x: {
        enabled: getCheckboxValue("xOptimizedTranslation"),
        translateArticles: getCheckboxValue("xTranslateArticles"),
        quotedPosts: getCheckboxValue("xTranslateQuotedPosts"),
        skipNativeTranslated: getCheckboxValue("xSkipNativeTranslatedPosts")
      }
    },
    openAICompatibleJsonMode: getCheckboxValue("openAICompatibleJsonMode"),
    showFloatingButton: getCheckboxValue("showFloatingButton")
  };
}

export function setInputValue(name: string, value: string): void {
  const input = document.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`);
  if (input) {
    if (input instanceof HTMLSelectElement && value && !findSelectOption(input, value)) {
      input.append(createSelectOption(value));
    }
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

function findSelectOption(select: HTMLSelectElement, value: string): HTMLOptionElement | undefined {
  return Array.from(select.options).find((option) => option.value === value);
}

function createSelectOption(value: string): HTMLOptionElement {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = value;
  return option;
}
