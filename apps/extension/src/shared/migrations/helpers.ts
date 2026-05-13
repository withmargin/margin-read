import { DEFAULT_SETTINGS } from "../defaults";
import type { ExtensionSettingsCurrent } from "./versions/current";

/**
 * Migration helpers shared between the step migrator and the
 * current-version passthrough/forward-compat parser.
 *
 * These helpers must remain pure — migration behaviour is locked by
 * the frozen fixture suite under __fixtures__/, which verifies the
 * end-to-end output of each migration step.
 */

export function cloneDefaults(): ExtensionSettingsCurrent {
  return {
    ...DEFAULT_SETTINGS,
    siteAdapters: {
      x: { ...DEFAULT_SETTINGS.siteAdapters.x }
    }
  };
}

export function pickDefined<T extends object, K extends keyof T>(
  source: T,
  keys: readonly K[]
): Partial<Pick<T, K>> {
  const result: Partial<Pick<T, K>> = {};
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}
