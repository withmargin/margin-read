import { beforeEach, describe, expect, it, vi } from "vitest";
import { CACHE_KEY_PREFIX, DEFAULT_SETTINGS, SETTINGS_KEY } from "./defaults";
import {
  clearPersistentCache,
  getCachedTranslation,
  getSettings,
  saveSettings,
  setCachedTranslation
} from "./storage";

const store = new Map<string, unknown>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: vi.fn(async (key: string | null) => {
          if (key === null) {
            return Object.fromEntries(store);
          }
          return { [key]: store.get(key) };
        }),
        set: vi.fn(async (values: Record<string, unknown>) => {
          for (const [key, value] of Object.entries(values)) {
            store.set(key, value);
          }
        }),
        remove: vi.fn(async (keys: string[]) => {
          for (const key of keys) {
            store.delete(key);
          }
        })
      }
    }
  });
});

describe("settings storage", () => {
  it("returns default settings when no settings are saved", async () => {
    await expect(getSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it("merges saved settings with defaults", async () => {
    store.set(SETTINGS_KEY, { targetLanguage: "Traditional Chinese" });

    await expect(getSettings()).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      targetLanguage: "Traditional Chinese"
    });
  });

  it("saves settings under the settings key", async () => {
    const settings = { ...DEFAULT_SETTINGS, model: "custom-model" };
    await saveSettings(settings);

    expect(store.get(SETTINGS_KEY)).toEqual(settings);
  });
});

describe("translation cache storage", () => {
  it("reads and writes cached translations", async () => {
    await setCachedTranslation("abc", "translated text");

    await expect(getCachedTranslation("abc")).resolves.toBe("translated text");
  });

  it("clears only persistent cache entries", async () => {
    store.set(`${CACHE_KEY_PREFIX}abc`, "cached");
    store.set(SETTINGS_KEY, DEFAULT_SETTINGS);

    await clearPersistentCache();

    expect(store.has(`${CACHE_KEY_PREFIX}abc`)).toBe(false);
    expect(store.get(SETTINGS_KEY)).toEqual(DEFAULT_SETTINGS);
  });

  it("does nothing when there are no cache entries", async () => {
    await clearPersistentCache();

    expect(store.size).toBe(0);
  });
});
