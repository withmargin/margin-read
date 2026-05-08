import { DEFAULT_SETTINGS, PROVIDER_DEFAULTS } from "../shared/defaults";
import { getSettings, saveSettings } from "../shared/storage";
import type { CacheMode, DisplayStyle, ExtensionSettings, TranslationProviderId } from "../shared/types";

const form = document.querySelector<HTMLFormElement>("#settings-form");
const statusEl = document.querySelector<HTMLParagraphElement>("#status");
const clearCacheButton = document.querySelector<HTMLButtonElement>("#clear-cache");

void initialize();

async function initialize(): Promise<void> {
  const settings = await getSettings();
  fillForm(settings);
  bindProviderDefaults();

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveSettings(readForm());
    setStatus("Settings saved.");
  });

  clearCacheButton?.addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ type: "CLEAR_CACHE" });
    setStatus("Translation cache cleared.");
  });
}

function fillForm(settings: ExtensionSettings): void {
  setInputValue("provider", settings.provider);
  setInputValue("providerEndpoint", settings.providerEndpoint);
  setInputValue("apiKey", settings.apiKey);
  setInputValue("model", settings.model);
  setInputValue("sourceLanguage", settings.sourceLanguage);
  setInputValue("targetLanguage", settings.targetLanguage);
  setInputValue("displayStyle", settings.displayStyle);
  setInputValue("cacheMode", settings.cacheMode);
}

function readForm(): ExtensionSettings {
  return {
    ...DEFAULT_SETTINGS,
    provider: getInputValue("provider") as TranslationProviderId,
    providerEndpoint: getInputValue("providerEndpoint"),
    apiKey: getInputValue("apiKey"),
    model: getInputValue("model"),
    sourceLanguage: getInputValue("sourceLanguage"),
    targetLanguage: getInputValue("targetLanguage"),
    displayStyle: getInputValue("displayStyle") as DisplayStyle,
    cacheMode: getInputValue("cacheMode") as CacheMode
  };
}

function bindProviderDefaults(): void {
  const providerInput = document.querySelector<HTMLSelectElement>('[name="provider"]');
  providerInput?.addEventListener("change", () => {
    const provider = providerInput.value as TranslationProviderId;
    const defaults = PROVIDER_DEFAULTS[provider];
    setInputValue("providerEndpoint", defaults.providerEndpoint);
    setInputValue("model", defaults.model);
  });
}

function setInputValue(name: string, value: string): void {
  const input = document.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`);
  if (input) {
    input.value = value;
  }
}

function getInputValue(name: string): string {
  return document.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)?.value.trim() ?? "";
}

function setStatus(message: string): void {
  if (statusEl) {
    statusEl.textContent = message;
  }
}
