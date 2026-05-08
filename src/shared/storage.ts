import { CACHE_KEY_PREFIX, DEFAULT_SETTINGS, SETTINGS_KEY } from "./defaults";
import type { ExtensionSettings } from "./types";

export async function getSettings(): Promise<ExtensionSettings> {
  const data = await chrome.storage.local.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(data[SETTINGS_KEY] ?? {}) };
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

export async function getCachedTranslation(key: string): Promise<string | undefined> {
  const data = await chrome.storage.local.get(CACHE_KEY_PREFIX + key);
  return data[CACHE_KEY_PREFIX + key];
}

export async function setCachedTranslation(key: string, value: string): Promise<void> {
  await chrome.storage.local.set({ [CACHE_KEY_PREFIX + key]: value });
}

export async function clearPersistentCache(): Promise<void> {
  const data = await chrome.storage.local.get(null);
  const keys = Object.keys(data).filter((key) => key.startsWith(CACHE_KEY_PREFIX));
  if (keys.length > 0) {
    await chrome.storage.local.remove(keys);
  }
}
