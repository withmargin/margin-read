import { DEFAULT_SETTINGS } from "../defaults";
import { migrateV0ToV1 } from "./v0-to-v1";
import { parseV0 } from "./versions/v0";
import { SETTINGS_VERSION, type ExtensionSettingsCurrent } from "./versions/current";

/**
 * Public entry: walk the migration chain from whatever version the
 * stored data claims, up to the current version.
 *
 * - `version` field detection is lenient: anything < SETTINGS_VERSION
 *   that we don't recognise is treated as v0 (the original flat shape).
 * - Returns a fresh object every call. Persistence is the caller's
 *   responsibility — read paths return the migrated shape in memory
 *   and the next saveSettings() write cleans up storage.
 * - Tolerates garbage input (returns defaults).
 *
 * When adding a v2:
 *   1. Freeze the current shape as versions/v1.ts (move type +
 *      parseV1 there).
 *   2. Update versions/current.ts to re-export the new current type.
 *   3. Add v1-to-v2.ts implementing the step migrator.
 *   4. Extend the switch below to chain v1 → v2.
 *   5. Add fixtures under __fixtures__/.
 *
 * Each step migrator (v0-to-v1, v1-to-v2, ...) is frozen once shipped.
 */
export function migrateSettings(stored: unknown): ExtensionSettingsCurrent {
  if (stored === undefined || stored === null) {
    return cloneDefaults();
  }

  const sourceVersion = detectVersion(stored);

  let result: ExtensionSettingsCurrent;
  switch (sourceVersion) {
    case 0:
      result = migrateV0ToV1(parseV0(stored));
      break;
    case 1:
      result = parseV1(stored);
      break;
    default:
      // Forward-compat: storage from a newer client — accept its
      // current-shaped fields, drop unknowns, fill defaults.
      result = parseV1(stored);
      break;
  }

  return result;
}

/**
 * Returns the schema version recorded in stored settings, or 0 for
 * pre-v1 storage (which had no `version` field). Exposed so upgrade
 * orchestrators can decide whether they need to act and log the
 * source version for diagnostics.
 *
 * Tolerates arbitrary input — anything that is not an object with a
 * numeric `version` field is treated as version 0.
 */
export function currentStoredVersion(stored: unknown): number {
  return detectVersion(stored);
}

function detectVersion(stored: unknown): number {
  if (typeof stored !== "object" || stored === null) {
    return 0;
  }
  const value = (stored as { version?: unknown }).version;
  return typeof value === "number" ? value : 0;
}

/**
 * Validate + fill defaults for current-version data. This is the
 * passthrough leg for users already on the latest version, and the
 * forward-compat handler when storage claims a higher version than
 * we know about.
 */
function parseV1(stored: unknown): ExtensionSettingsCurrent {
  const defaults = cloneDefaults();
  if (typeof stored !== "object" || stored === null) {
    return defaults;
  }
  const source = stored as Partial<ExtensionSettingsCurrent>;

  return {
    ...defaults,
    ...(source.provider !== undefined ? { provider: source.provider } : {}),
    ...(source.providerEndpoint !== undefined ? { providerEndpoint: source.providerEndpoint } : {}),
    ...(source.apiKey !== undefined ? { apiKey: source.apiKey } : {}),
    ...(source.model !== undefined ? { model: source.model } : {}),
    ...(source.sourceLanguage !== undefined ? { sourceLanguage: source.sourceLanguage } : {}),
    ...(source.targetLanguage !== undefined ? { targetLanguage: source.targetLanguage } : {}),
    ...(source.displayStyle !== undefined ? { displayStyle: source.displayStyle } : {}),
    ...(source.cacheMode !== undefined ? { cacheMode: source.cacheMode } : {}),
    ...(source.debugMode !== undefined ? { debugMode: source.debugMode } : {}),
    ...(source.openAICompatibleJsonMode !== undefined
      ? { openAICompatibleJsonMode: source.openAICompatibleJsonMode }
      : {}),
    ...(source.showFloatingButton !== undefined ? { showFloatingButton: source.showFloatingButton } : {}),
    siteAdapters: {
      x: {
        ...defaults.siteAdapters.x,
        ...(source.siteAdapters?.x ?? {})
      }
    },
    version: SETTINGS_VERSION
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
