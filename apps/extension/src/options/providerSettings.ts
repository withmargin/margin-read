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
    resetModelSelect(locale, defaults.model);
    updateProviderSections(provider);
  });

  localEndpointPreset?.addEventListener("change", () => {
    if (!localEndpointPreset.value) {
      return;
    }
    setInputValue("provider", "openai-compatible");
    setInputValue("providerEndpoint", localEndpointPreset.value);
    const nextModel =
      getInputValue("model") === PROVIDER_DEFAULTS.openai.model
        ? PROVIDER_DEFAULTS["openai-compatible"].model
        : getInputValue("model");
    resetModelSelect(locale, nextModel);
    updateProviderSections("openai-compatible");
  });

  fetchModelsButton?.addEventListener("click", () => {
    void fetchModels(locale, readForm, setStatus, fetchModelsButton);
  });

  modelSelect?.addEventListener("change", () => {
    if (modelSelect.value) {
      setInputValue("model", modelSelect.value);
    }
  });

  updateProviderSections((providerInput?.value as TranslationProviderId | undefined) ?? "openai");
  resetModelSelect(locale, getInputValue("model"));
}

function updateProviderSections(provider: TranslationProviderId): void {
  document.querySelectorAll<HTMLElement>("[data-provider-section]").forEach((section) => {
    section.hidden = section.dataset.providerSection !== provider;
  });
}

async function fetchModels(
  locale: OptionsLocale,
  readForm: () => ExtensionSettings,
  setStatus: (message: string) => void,
  fetchModelsButton: HTMLButtonElement
): Promise<void> {
  const buttonLabel = fetchModelsButton.textContent ?? t(locale, "fetchModels");
  fetchModelsButton.disabled = true;
  fetchModelsButton.setAttribute("aria-busy", "true");
  fetchModelsButton.textContent = t(locale, "fetchModelsBusy");
  setStatus(t(locale, "statusFetchingModels"));
  try {
    const response: ListModelsResponse = await chrome.runtime.sendMessage({
      type: "LIST_MODELS",
      settings: readForm()
    });

    if (!response.ok || !response.models) {
      setStatus(response.error ?? t(locale, "statusModelsFailed"));
      return;
    }

    renderModelOptions(locale, response.models, readForm().model);
    setStatus(t(locale, "statusLoadedModels", { count: response.models.length }));
  } finally {
    fetchModelsButton.disabled = false;
    fetchModelsButton.removeAttribute("aria-busy");
    fetchModelsButton.textContent = buttonLabel;
  }
}

interface ListModelsResponse {
  ok: boolean;
  models?: ProviderModel[];
  error?: string;
}

function renderModelOptions(locale: OptionsLocale, models: ProviderModel[], selectedModel: string): void {
  const modelSelect = document.querySelector<HTMLSelectElement>("#model-select");
  const modelOptions = models.map((model) => {
    return createModelOption(model.id, model.displayName ? `${model.displayName} (${model.id})` : model.id);
  });
  const hasSelectedModel = modelOptions.some((option) => option.value === selectedModel);
  modelSelect?.replaceChildren(
    createModelOption("", t(locale, "modelDefault")),
    ...(selectedModel && !hasSelectedModel ? [createModelOption(selectedModel, selectedModel)] : []),
    ...modelOptions
  );
  if (modelSelect && selectedModel) {
    modelSelect.value = selectedModel;
  }
}

function resetModelSelect(locale: OptionsLocale, selectedModel: string): void {
  const modelSelect = document.querySelector<HTMLSelectElement>("#model-select");
  modelSelect?.replaceChildren(
    createModelOption("", t(locale, "modelDefault")),
    ...(selectedModel ? [createModelOption(selectedModel, selectedModel)] : [])
  );
  if (modelSelect && selectedModel) {
    modelSelect.value = selectedModel;
  }
}

function createModelOption(value: string, label: string): HTMLOptionElement {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}
