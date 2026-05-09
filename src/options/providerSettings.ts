import { PROVIDER_DEFAULTS } from "../shared/defaults";
import type { ExtensionSettings, ProviderModel, TranslationProviderId } from "../shared/types";
import { t, type OptionsLocale } from "./i18n";
import { getInputValue, setInputValue } from "./settingsForm";

interface ProviderSettingsOptions {
  locale: OptionsLocale;
  readForm: () => ExtensionSettings;
  setStatus: (message: string) => void;
}

export function initializeProviderSettings({ locale, readForm, setStatus }: ProviderSettingsOptions): void {
  const providerInput = document.querySelector<HTMLSelectElement>('[name="provider"]');
  const localEndpointPreset = document.querySelector<HTMLSelectElement>("#local-endpoint-preset");
  const fetchModelsButton = document.querySelector<HTMLButtonElement>("#fetch-models");
  const modelSelect = document.querySelector<HTMLSelectElement>("#model-select");

  providerInput?.addEventListener("change", () => {
    const provider = providerInput.value as TranslationProviderId;
    const defaults = PROVIDER_DEFAULTS[provider];
    setInputValue("providerEndpoint", defaults.providerEndpoint);
    setInputValue("model", defaults.model);
    resetModelSelect(locale);
    updateProviderSections(provider);
  });

  localEndpointPreset?.addEventListener("change", () => {
    if (!localEndpointPreset.value) {
      return;
    }
    setInputValue("provider", "openai-compatible");
    setInputValue("providerEndpoint", localEndpointPreset.value);
    if (getInputValue("model") === PROVIDER_DEFAULTS.openai.model) {
      setInputValue("model", PROVIDER_DEFAULTS["openai-compatible"].model);
    }
    resetModelSelect(locale);
    updateProviderSections("openai-compatible");
  });

  fetchModelsButton?.addEventListener("click", () => {
    void fetchModels(locale, readForm, setStatus);
  });

  modelSelect?.addEventListener("change", () => {
    if (modelSelect.value) {
      setInputValue("model", modelSelect.value);
    }
  });

  updateProviderSections((providerInput?.value as TranslationProviderId | undefined) ?? "openai");
}

function updateProviderSections(provider: TranslationProviderId): void {
  document.querySelectorAll<HTMLElement>("[data-provider-section]").forEach((section) => {
    section.hidden = section.dataset.providerSection !== provider;
  });
}

async function fetchModels(
  locale: OptionsLocale,
  readForm: () => ExtensionSettings,
  setStatus: (message: string) => void
): Promise<void> {
  setStatus(t(locale, "statusFetchingModels"));
  const response: ListModelsResponse = await chrome.runtime.sendMessage({
    type: "LIST_MODELS",
    settings: readForm()
  });

  if (!response.ok || !response.models) {
    setStatus(response.error ?? t(locale, "statusModelsFailed"));
    return;
  }

  renderModelOptions(locale, response.models);
  setStatus(t(locale, "statusLoadedModels", { count: response.models.length }));
}

interface ListModelsResponse {
  ok: boolean;
  models?: ProviderModel[];
  error?: string;
}

function renderModelOptions(locale: OptionsLocale, models: ProviderModel[]): void {
  const modelSelect = document.querySelector<HTMLSelectElement>("#model-select");
  modelSelect?.replaceChildren(
    createModelOption("", t(locale, "modelDefault")),
    ...models.map((model) => {
      return createModelOption(model.id, model.displayName ? `${model.displayName} (${model.id})` : model.id);
    })
  );
}

function resetModelSelect(locale: OptionsLocale): void {
  document
    .querySelector<HTMLSelectElement>("#model-select")
    ?.replaceChildren(createModelOption("", t(locale, "modelDefault")));
}

function createModelOption(value: string, label: string): HTMLOptionElement {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}
