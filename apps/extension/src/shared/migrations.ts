import { DEFAULT_SETTINGS } from "./defaults";
import type { ExtensionSettings, SiteAdapterSettings } from "./types";
import { SETTINGS_VERSION } from "./types";

/**
 * Versioned settings migration.
 *
 * Storage layout history:
 *   - pre-v1 (Margin Read 0.1.x / 0.2.x):
 *       Flat shape with no `version` field.
 *       X adapter flags lived at the top level:
 *         xOptimizedTranslation, xTranslateArticles,
 *         xTranslateQuotedPosts, xSkipNativeTranslatedPosts
 *   - v1: `version: 1` + nested `siteAdapters.x.*`
 *
 * Migration is idempotent and pure — it returns a fresh object and
 * does not touch storage. Persistence happens the next time the user
 * saves settings (or a caller explicitly writes them back).
 */
export function migrateSettings(stored: unknown): ExtensionSettings {
  if (!isObjectRecord(stored)) {
    return cloneDefaults();
  }

  const version = typeof stored.version === "number" ? stored.version : 0;

  if (version >= SETTINGS_VERSION) {
    return { ...cloneDefaults(), ...(stored as Partial<ExtensionSettings>) };
  }

  // version === 0 → migrate pre-v1 flat layout.
  const siteAdapters: SiteAdapterSettings = {
    x: {
      enabled: typeof stored.xOptimizedTranslation === "boolean"
        ? stored.xOptimizedTranslation
        : DEFAULT_SETTINGS.siteAdapters.x.enabled,
      translateArticles: typeof stored.xTranslateArticles === "boolean"
        ? stored.xTranslateArticles
        : DEFAULT_SETTINGS.siteAdapters.x.translateArticles,
      quotedPosts: typeof stored.xTranslateQuotedPosts === "boolean"
        ? stored.xTranslateQuotedPosts
        : DEFAULT_SETTINGS.siteAdapters.x.quotedPosts,
      skipNativeTranslated: typeof stored.xSkipNativeTranslatedPosts === "boolean"
        ? stored.xSkipNativeTranslatedPosts
        : DEFAULT_SETTINGS.siteAdapters.x.skipNativeTranslated
    }
  };

  const defaults = cloneDefaults();
  return {
    ...defaults,
    ...carryOverStringField(stored, "provider", defaults.provider),
    ...carryOverStringField(stored, "providerEndpoint", defaults.providerEndpoint),
    ...carryOverStringField(stored, "apiKey", defaults.apiKey),
    ...carryOverStringField(stored, "model", defaults.model),
    ...carryOverStringField(stored, "sourceLanguage", defaults.sourceLanguage),
    ...carryOverStringField(stored, "targetLanguage", defaults.targetLanguage),
    ...carryOverStringField(stored, "displayStyle", defaults.displayStyle),
    ...carryOverStringField(stored, "cacheMode", defaults.cacheMode),
    ...carryOverBooleanField(stored, "debugMode", defaults.debugMode),
    ...carryOverBooleanField(stored, "openAICompatibleJsonMode", defaults.openAICompatibleJsonMode),
    ...carryOverBooleanField(stored, "showFloatingButton", defaults.showFloatingButton),
    version: SETTINGS_VERSION,
    siteAdapters
  };
}

function carryOverStringField<K extends keyof ExtensionSettings>(
  stored: Record<string, unknown>,
  key: K,
  fallback: ExtensionSettings[K]
): Partial<ExtensionSettings> {
  const value = stored[key];
  return { [key]: typeof value === "string" ? value : fallback };
}

function carryOverBooleanField<K extends keyof ExtensionSettings>(
  stored: Record<string, unknown>,
  key: K,
  fallback: ExtensionSettings[K]
): Partial<ExtensionSettings> {
  const value = stored[key];
  return { [key]: typeof value === "boolean" ? value : fallback };
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function cloneDefaults(): ExtensionSettings {
  return {
    ...DEFAULT_SETTINGS,
    siteAdapters: {
      x: { ...DEFAULT_SETTINGS.siteAdapters.x }
    }
  };
}
