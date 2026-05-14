import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../shared/defaults";
import { saveSettingsWithCachePrivacy, shouldClearPersistentCache } from "./cachePrivacy";

describe("cache privacy settings", () => {
  it("clears persistent cache when switching away from persistent mode", () => {
    expect(shouldClearPersistentCache("persistent", "session")).toBe(true);
    expect(shouldClearPersistentCache("persistent", "disabled")).toBe(true);
  });

  it("does not clear persistent cache for non-persistent transitions", () => {
    expect(shouldClearPersistentCache("session", "disabled")).toBe(false);
    expect(shouldClearPersistentCache("session", "persistent")).toBe(false);
    expect(shouldClearPersistentCache("disabled", "session")).toBe(false);
    expect(shouldClearPersistentCache("persistent", "persistent")).toBe(false);
  });

  it("saves settings before clearing persistent cache", async () => {
    const calls: string[] = [];
    const settings = { ...DEFAULT_SETTINGS, cacheMode: "session" as const };

    const nextMode = await saveSettingsWithCachePrivacy("persistent", settings, {
      saveSettings: vi.fn(() => {
        calls.push("save");
        return Promise.resolve();
      }),
      clearPersistentCache: vi.fn(() => {
        calls.push("clear");
        return Promise.resolve();
      })
    });

    expect(nextMode).toBe("session");
    expect(calls).toEqual(["save", "clear"]);
  });

  it("keeps cache entries when persistent mode stays enabled", async () => {
    const settings = { ...DEFAULT_SETTINGS, cacheMode: "persistent" as const };
    const clearPersistentCache = vi.fn(() => Promise.resolve());

    await saveSettingsWithCachePrivacy("persistent", settings, {
      saveSettings: vi.fn(() => Promise.resolve()),
      clearPersistentCache
    });

    expect(clearPersistentCache).not.toHaveBeenCalled();
  });
});
