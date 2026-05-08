import { DEFAULT_SETTINGS, PROVIDER_DEFAULTS } from "../shared/defaults";
import { getSettings, saveSettings } from "../shared/storage";
import type { CacheMode, DisplayStyle, ExtensionSettings, ProviderModel, TranslationProviderId } from "../shared/types";

const form = document.querySelector<HTMLFormElement>("#settings-form");
const statusEl = document.querySelector<HTMLParagraphElement>("#status");
const clearCacheButton = document.querySelector<HTMLButtonElement>("#clear-cache");
const fetchModelsButton = document.querySelector<HTMLButtonElement>("#fetch-models");
const modelOptions = document.querySelector<HTMLDataListElement>("#model-options");

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

  fetchModelsButton?.addEventListener("click", async () => {
    await fetchModels();
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
    modelOptions?.replaceChildren();
  });
}

async function fetchModels(): Promise<void> {
  setStatus("Fetching models...");
  const response = (await chrome.runtime.sendMessage({
    type: "LIST_MODELS",
    settings: readForm()
  })) as { ok: boolean; models?: ProviderModel[]; error?: string };

  if (!response.ok || !response.models) {
    setStatus(response.error ?? "Could not fetch models.");
    return;
  }

  renderModelOptions(response.models);
  setStatus(`Loaded ${response.models.length} models.`);
}

function renderModelOptions(models: ProviderModel[]): void {
  modelOptions?.replaceChildren(
    ...models.map((model) => {
      const option = document.createElement("option");
      option.value = model.id;
      option.label = model.displayName ? `${model.displayName} (${model.id})` : model.id;
      return option;
    })
  );
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
