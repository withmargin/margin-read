import { DEFAULT_SETTINGS } from "../shared/defaults";
import { getSettings, getStoredSettings, saveSettings } from "../shared/storage";
import { applyOptionsI18n, detectOptionsLocale, t } from "./i18n";
import { initializeLanguageSelect } from "./languageSelect";
import { getPreferredLanguageOption } from "./languages";
import { initializeProviderSettings } from "./providerSettings";
import { fillForm, readForm } from "./settingsForm";

const form = document.querySelector<HTMLFormElement>("#settings-form");
const statusEl = document.querySelector<HTMLParagraphElement>("#status");
const clearCacheButton = document.querySelector<HTMLButtonElement>("#clear-cache");

void initialize();

async function initialize(): Promise<void> {
  const locale = detectOptionsLocale(navigator.languages);
  applyOptionsI18n(locale);

  const [settings, storedSettings] = await Promise.all([getSettings(), getStoredSettings()]);
  const browserTargetLanguage = getPreferredLanguageOption(navigator.languages).promptName;
  const initialSettings = {
    ...settings,
    targetLanguage:
      storedSettings?.targetLanguage || settings.targetLanguage !== DEFAULT_SETTINGS.targetLanguage
        ? settings.targetLanguage
        : browserTargetLanguage
  };

  fillForm(initialSettings);
  initializeTargetLanguage(initialSettings.targetLanguage);
  initializeProviderSettings({ locale, readForm, setStatus });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    void saveSettings(readForm()).then(() => {
      setStatus(t(locale, "statusSettingsSaved"));
    });
  });

  clearCacheButton?.addEventListener("click", () => {
    void chrome.runtime.sendMessage({ type: "CLEAR_CACHE" }).then(() => {
      setStatus(t(locale, "statusCacheCleared"));
    });
  });
}

function initializeTargetLanguage(initialValue: string): void {
  const input = document.querySelector<HTMLInputElement>("#target-language-combobox");
  const hiddenInput = document.querySelector<HTMLInputElement>('[name="targetLanguage"]');
  const listbox = document.querySelector<HTMLElement>("#target-language-listbox");
  if (!input || !hiddenInput || !listbox) {
    return;
  }

  initializeLanguageSelect({ input, hiddenInput, listbox }, initialValue);
}

function setStatus(message: string): void {
  if (statusEl) {
    statusEl.textContent = message;
  }
}
