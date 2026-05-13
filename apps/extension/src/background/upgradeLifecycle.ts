import { SETTINGS_KEY } from "../shared/defaults";
import { currentStoredVersion, migrateSettings } from "../shared/migrations";
import { SETTINGS_VERSION } from "../shared/types";

/**
 * Result of a single migrate-and-persist pass. `from` is the version
 * detected in storage before migration, `to` is SETTINGS_VERSION (the
 * version we just wrote). When `from === to`, the call was a no-op
 * persistence — storage was already at the current shape.
 */
export interface UpgradeResult {
  from: number;
  to: number;
}

/**
 * Read the current settings from storage, run the migration chain to
 * the latest schema, and write the result back. Idempotent — calling
 * it on already-current storage simply re-writes the same shape.
 *
 * Designed to be invoked from the service worker's
 * chrome.runtime.onInstalled handler so storage state converges to the
 * current schema immediately after install or update, instead of
 * lazily on the first `getSettings()` read.
 */
export async function migrateAndPersistSettings(): Promise<UpgradeResult> {
  const raw = (await chrome.storage.local.get(SETTINGS_KEY)) as Record<string, unknown>;
  const stored = raw[SETTINGS_KEY];
  const from = currentStoredVersion(stored);
  const migrated = migrateSettings(stored);
  await chrome.storage.local.set({ [SETTINGS_KEY]: migrated });
  return { from, to: SETTINGS_VERSION };
}

/**
 * Register the chrome.runtime.onInstalled handler that runs settings
 * migration on first install and on every extension update.
 *
 * Only "install" and "update" reasons trigger persistence. Chrome
 * self-updates ("chrome_update") and shared-module updates do not
 * change Margin's storage shape, so they are ignored.
 *
 * Must be called once at service-worker module load — the listener
 * itself does not survive across SW restarts, but Chrome re-invokes
 * the SW script on next event, which re-registers it.
 */
export function installUpgradeLifecycle(): void {
  chrome.runtime.onInstalled.addListener((details) => {
    if (
      details.reason !== chrome.runtime.OnInstalledReason.INSTALL &&
      details.reason !== chrome.runtime.OnInstalledReason.UPDATE
    ) {
      return;
    }
    void migrateAndPersistSettings();
  });
}
