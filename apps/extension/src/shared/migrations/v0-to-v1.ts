import { DEFAULT_SETTINGS } from "../defaults";
import type { ExtensionSettingsV0 } from "./versions/v0";
import type { ExtensionSettingsCurrent } from "./versions/current";

/**
 * Single-step migration: pre-v1 flat shape → v1 nested shape.
 *
 * - Carries over every recognised field that was present in v0.
 * - Folds the four flat X flags into siteAdapters.x.
 * - Fills any missing field from DEFAULT_SETTINGS.
 * - Sets version = 1.
 *
 * This function MUST NOT change once shipped. New migrations chain
 * after it (v1-to-v2, v2-to-v3, ...). Behaviour is locked by the
 * frozen JSON fixtures in __fixtures__/.
 */
export function migrateV0ToV1(v0: ExtensionSettingsV0): ExtensionSettingsCurrent {
  const defaults = cloneDefaults();

  return {
    ...defaults,
    ...(v0.provider !== undefined ? { provider: v0.provider } : {}),
    ...(v0.providerEndpoint !== undefined ? { providerEndpoint: v0.providerEndpoint } : {}),
    ...(v0.apiKey !== undefined ? { apiKey: v0.apiKey } : {}),
    ...(v0.model !== undefined ? { model: v0.model } : {}),
    ...(v0.sourceLanguage !== undefined ? { sourceLanguage: v0.sourceLanguage } : {}),
    ...(v0.targetLanguage !== undefined ? { targetLanguage: v0.targetLanguage } : {}),
    ...(v0.displayStyle !== undefined ? { displayStyle: v0.displayStyle } : {}),
    ...(v0.cacheMode !== undefined ? { cacheMode: v0.cacheMode } : {}),
    ...(v0.debugMode !== undefined ? { debugMode: v0.debugMode } : {}),
    ...(v0.openAICompatibleJsonMode !== undefined
      ? { openAICompatibleJsonMode: v0.openAICompatibleJsonMode }
      : {}),
    ...(v0.showFloatingButton !== undefined ? { showFloatingButton: v0.showFloatingButton } : {}),
    siteAdapters: {
      x: {
        enabled: v0.xOptimizedTranslation ?? defaults.siteAdapters.x.enabled,
        translateArticles: v0.xTranslateArticles ?? defaults.siteAdapters.x.translateArticles,
        quotedPosts: v0.xTranslateQuotedPosts ?? defaults.siteAdapters.x.quotedPosts,
        skipNativeTranslated:
          v0.xSkipNativeTranslatedPosts ?? defaults.siteAdapters.x.skipNativeTranslated
      }
    },
    version: 1
  };
}

function cloneDefaults(): ExtensionSettingsCurrent {
  return {
    ...DEFAULT_SETTINGS,
    siteAdapters: {
      x: { ...DEFAULT_SETTINGS.siteAdapters.x }
    }
  };
}
