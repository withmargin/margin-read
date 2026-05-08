import { DEFAULT_SETTINGS, PROVIDER_DEFAULTS } from "../shared/defaults";
import { getSettings, saveSettings } from "../shared/storage";
import type {
  CacheMode,
  DisplayStyle,
  ExtensionSettings,
  ProviderModel,
  TranslationProviderId
} from "../shared/types";

const form = document.querySelector<HTMLFormElement>("#settings-form");
const statusEl = document.querySelector<HTMLParagraphElement>("#status");
const clearCacheButton = document.querySelector<HTMLButtonElement>("#clear-cache");
const fetchModelsButton = document.querySelector<HTMLButtonElement>("#fetch-models");
const modelSelect = document.querySelector<HTMLSelectElement>("#model-select");

void initialize();

async function initialize(): Promise<void> {
  const settings = await getSettings();
  fillForm(settings);
  bindProviderDefaults();

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    void saveSettings(readForm()).then(() => {
      setStatus("Settings saved.");
    });
  });

  clearCacheButton?.addEventListener("click", () => {
    void chrome.runtime.sendMessage({ type: "CLEAR_CACHE" }).then(() => {
      setStatus("Translation cache cleared.");
    });
  });

  fetchModelsButton?.addEventListener("click", () => {
    void fetchModels();
  });

  modelSelect?.addEventListener("change", () => {
    if (modelSelect.value) {
      setInputValue("model", modelSelect.value);
    }
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
  setCheckboxValue("debugMode", settings.debugMode);
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
    cacheMode: getInputValue("cacheMode") as CacheMode,
    debugMode: getCheckboxValue("debugMode")
  };
}

function bindProviderDefaults(): void {
  const providerInput = document.querySelector<HTMLSelectElement>('[name="provider"]');
  providerInput?.addEventListener("change", () => {
    const provider = providerInput.value as TranslationProviderId;
    const defaults = PROVIDER_DEFAULTS[provider];
    setInputValue("providerEndpoint", defaults.providerEndpoint);
    setInputValue("model", defaults.model);
    resetModelSelect();
  });
}

async function fetchModels(): Promise<void> {
  setStatus("Fetching models...");
  const response: ListModelsResponse = await chrome.runtime.sendMessage({
    type: "LIST_MODELS",
    settings: readForm()
  });

  if (!response.ok || !response.models) {
    setStatus(response.error ?? "Could not fetch models.");
    return;
  }

  renderModelOptions(response.models);
  setStatus(`Loaded ${response.models.length} models.`);
}

interface ListModelsResponse {
  ok: boolean;
  models?: ProviderModel[];
  error?: string;
}

function renderModelOptions(models: ProviderModel[]): void {
  modelSelect?.replaceChildren(
    createModelOption("", "Select a model"),
    ...models.map((model) => {
      return createModelOption(model.id, model.displayName ? `${model.displayName} (${model.id})` : model.id);
    })
  );
}

function resetModelSelect(): void {
  modelSelect?.replaceChildren(createModelOption("", "Fetch models or use custom model below"));
}

function createModelOption(value: string, label: string): HTMLOptionElement {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
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

function setCheckboxValue(name: string, checked: boolean): void {
  const input = document.querySelector<HTMLInputElement>(`[name="${name}"]`);
  if (input) {
    input.checked = checked;
  }
}

function getCheckboxValue(name: string): boolean {
  return document.querySelector<HTMLInputElement>(`[name="${name}"]`)?.checked ?? false;
}

function setStatus(message: string): void {
  if (statusEl) {
    statusEl.textContent = message;
  }
}
