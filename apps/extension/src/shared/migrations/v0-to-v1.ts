import { cloneDefaults, pickDefined } from "./helpers";
import type { ExtensionSettingsV0 } from "./versions/v0";
import type { ExtensionSettingsCurrent } from "./versions/current";

const CARRIED_V0_FIELDS = [
  "provider",
  "providerEndpoint",
  "apiKey",
  "model",
  "sourceLanguage",
  "targetLanguage",
  "displayStyle",
  "cacheMode",
  "debugMode",
  "openAICompatibleJsonMode",
  "showFloatingButton"
] as const satisfies readonly (keyof ExtensionSettingsV0)[];

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
    ...pickDefined(v0, CARRIED_V0_FIELDS),
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
