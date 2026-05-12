import { CACHE_KEY_PREFIX, SETTINGS_KEY } from "./defaults";
import { migrateSettings } from "./migrations";
import type { ExtensionSettings } from "./types";

export async function getSettings(): Promise<ExtensionSettings> {
  const data = (await chrome.storage.local.get(SETTINGS_KEY)) as Record<string, unknown>;
  return migrateSettings(data[SETTINGS_KEY]);
}

export async function getStoredSettings(): Promise<Partial<ExtensionSettings> | undefined> {
  const data = (await chrome.storage.local.get(SETTINGS_KEY)) as Record<string, Partial<ExtensionSettings> | undefined>;
  return data[SETTINGS_KEY];
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

export async function getCachedTranslation(key: string): Promise<string | undefined> {
  const storageKey = CACHE_KEY_PREFIX + key;
  const data = (await chrome.storage.local.get(storageKey)) as Record<string, string | undefined>;
  return data[storageKey];
}

export async function setCachedTranslation(key: string, value: string): Promise<void> {
  await chrome.storage.local.set({ [CACHE_KEY_PREFIX + key]: value });
}

export async function clearPersistentCache(): Promise<void> {
  const data = (await chrome.storage.local.get(null)) as Record<string, unknown>;
  const keys = Object.keys(data).filter((key) => key.startsWith(CACHE_KEY_PREFIX));
  if (keys.length > 0) {
    await chrome.storage.local.remove(keys);
  }
}
