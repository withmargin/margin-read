import type { CacheMode, ExtensionSettings } from "../shared/types";

interface CachePrivacySaveDependencies {
  saveSettings(settings: ExtensionSettings): Promise<void>;
  clearPersistentCache(): Promise<unknown>;
}

export function shouldClearPersistentCache(previousCacheMode: CacheMode, nextCacheMode: CacheMode): boolean {
  return previousCacheMode === "persistent" && nextCacheMode !== "persistent";
}

export async function saveSettingsWithCachePrivacy(
  previousCacheMode: CacheMode,
  settings: ExtensionSettings,
  dependencies: CachePrivacySaveDependencies
): Promise<CacheMode> {
  await dependencies.saveSettings(settings);
  if (shouldClearPersistentCache(previousCacheMode, settings.cacheMode)) {
    await dependencies.clearPersistentCache();
  }
  return settings.cacheMode;
}
