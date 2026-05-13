import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CACHE_KEY_PREFIX, DEFAULT_SETTINGS, SETTINGS_KEY } from "../shared/defaults";
import { SETTINGS_VERSION } from "../shared/types";
import { installUpgradeLifecycle, migrateAndPersistSettings } from "./upgradeLifecycle";

type InstalledReason = "install" | "update" | "chrome_update" | "shared_module_update";

interface InstalledDetails {
  reason: InstalledReason;
  previousVersion?: string;
}

type InstalledListener = (details: InstalledDetails) => void;

const storageStore = new Map<string, unknown>();
let installedListener: InstalledListener | undefined;
let installedAddListenerSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  storageStore.clear();
  installedListener = undefined;
  installedAddListenerSpy = vi.fn((listener: InstalledListener) => {
    installedListener = listener;
  });

  vi.stubGlobal("chrome", {
    runtime: {
      onInstalled: { addListener: installedAddListenerSpy },
      OnInstalledReason: {
        INSTALL: "install",
        UPDATE: "update",
        CHROME_UPDATE: "chrome_update",
        SHARED_MODULE_UPDATE: "shared_module_update"
      }
    },
    storage: {
      local: {
        get: vi.fn((key: string | null) => {
          if (key === null) {
            return Promise.resolve(Object.fromEntries(storageStore));
          }
          return Promise.resolve({ [key]: storageStore.get(key) });
        }),
        set: vi.fn((values: Record<string, unknown>) => {
          for (const [key, value] of Object.entries(values)) {
            storageStore.set(key, value);
          }
          return Promise.resolve();
        })
      }
    }
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function readSettings(): Record<string, unknown> | undefined {
  const value = storageStore.get(SETTINGS_KEY);
  return value as Record<string, unknown> | undefined;
}

describe("migrateAndPersistSettings — unit", () => {
  it("writes DEFAULT_SETTINGS when storage is empty (first install)", async () => {
    const result = await migrateAndPersistSettings();

    expect(result).toEqual({ from: 0, to: SETTINGS_VERSION });
    expect(readSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("upgrades pre-v1 flat storage to v1 nested storage", async () => {
    storageStore.set(SETTINGS_KEY, {
      apiKey: "placeholder-key",
      provider: "anthropic",
      xOptimizedTranslation: false,
      xTranslateArticles: false,
      xTranslateQuotedPosts: true,
      xSkipNativeTranslatedPosts: false
    });

    const result = await migrateAndPersistSettings();

    expect(result).toEqual({ from: 0, to: SETTINGS_VERSION });
    const persisted = readSettings();
    expect(persisted?.version).toBe(SETTINGS_VERSION);
    expect(persisted?.apiKey).toBe("placeholder-key");
    expect(persisted?.provider).toBe("anthropic");
    expect(persisted?.siteAdapters).toEqual({
      x: {
        enabled: false,
        translateArticles: false,
        quotedPosts: true,
        skipNativeTranslated: false
      }
    });
  });

  it("removes the pre-v1 flat X flags from storage after upgrade", async () => {
    storageStore.set(SETTINGS_KEY, {
      xOptimizedTranslation: true,
      xTranslateArticles: false,
      xTranslateQuotedPosts: true,
      xSkipNativeTranslatedPosts: false
    });

    await migrateAndPersistSettings();

    const persisted = readSettings();
    expect(persisted?.xOptimizedTranslation).toBeUndefined();
    expect(persisted?.xTranslateArticles).toBeUndefined();
    expect(persisted?.xTranslateQuotedPosts).toBeUndefined();
    expect(persisted?.xSkipNativeTranslatedPosts).toBeUndefined();
  });

  it("is idempotent — running on v1 storage yields v1 storage", async () => {
    storageStore.set(SETTINGS_KEY, { ...DEFAULT_SETTINGS });

    const result = await migrateAndPersistSettings();

    expect(result).toEqual({ from: SETTINGS_VERSION, to: SETTINGS_VERSION });
    expect(readSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("running twice in a row produces identical storage", async () => {
    storageStore.set(SETTINGS_KEY, {
      apiKey: "k",
      xOptimizedTranslation: false
    });

    await migrateAndPersistSettings();
    const snapshot = JSON.stringify(readSettings());
    await migrateAndPersistSettings();

    expect(JSON.stringify(readSettings())).toBe(snapshot);
  });

  it("recovers from garbage stored value by writing defaults", async () => {
    storageStore.set(SETTINGS_KEY, "not-an-object");

    const result = await migrateAndPersistSettings();

    expect(result.to).toBe(SETTINGS_VERSION);
    expect(readSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("does not disturb unrelated keys (e.g. translation cache entries)", async () => {
    storageStore.set(`${CACHE_KEY_PREFIX}abc`, "cached translation");
    storageStore.set(SETTINGS_KEY, { apiKey: "k", xOptimizedTranslation: true });

    await migrateAndPersistSettings();

    expect(storageStore.get(`${CACHE_KEY_PREFIX}abc`)).toBe("cached translation");
  });
});

describe("installUpgradeLifecycle — reason filtering", () => {
  it("registers an onInstalled listener", () => {
    installUpgradeLifecycle();

    expect(installedAddListenerSpy).toHaveBeenCalledTimes(1);
    expect(typeof installedListener).toBe("function");
  });

  it("triggers migration on reason='install'", async () => {
    storageStore.set(SETTINGS_KEY, { xOptimizedTranslation: false });
    installUpgradeLifecycle();

    installedListener?.({ reason: "install" });

    await vi.waitFor(() => {
      expect(readSettings()?.version).toBe(SETTINGS_VERSION);
    });
    expect(readSettings()?.siteAdapters).toBeDefined();
  });

  it("triggers migration on reason='update' and respects previousVersion", async () => {
    storageStore.set(SETTINGS_KEY, { xOptimizedTranslation: false });
    installUpgradeLifecycle();

    installedListener?.({ reason: "update", previousVersion: "0.2.0" });

    await vi.waitFor(() => {
      expect(readSettings()?.version).toBe(SETTINGS_VERSION);
    });
  });

  it("does NOT trigger migration on reason='chrome_update'", async () => {
    const preExisting = { xOptimizedTranslation: false };
    storageStore.set(SETTINGS_KEY, preExisting);
    installUpgradeLifecycle();

    installedListener?.({ reason: "chrome_update" });

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(readSettings()).toEqual(preExisting);
  });

  it("does NOT trigger migration on reason='shared_module_update'", async () => {
    const preExisting = { xOptimizedTranslation: false };
    storageStore.set(SETTINGS_KEY, preExisting);
    installUpgradeLifecycle();

    installedListener?.({ reason: "shared_module_update" });

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(readSettings()).toEqual(preExisting);
  });
});

describe("installUpgradeLifecycle — end-to-end upgrade scenario", () => {
  it("0.2.0 pre-v1 storage becomes v1 storage after install/update event", async () => {
    // Pretend the user is upgrading from 0.2.0 — their storage still
    // has the old flat shape with custom X flags.
    storageStore.set(SETTINGS_KEY, {
      apiKey: "placeholder-key",
      provider: "openai",
      targetLanguage: "繁體中文",
      xOptimizedTranslation: false,
      xTranslateArticles: true,
      xTranslateQuotedPosts: true,
      xSkipNativeTranslatedPosts: true,
      openAICompatibleJsonMode: true,
      showFloatingButton: true
    });

    installUpgradeLifecycle();
    installedListener?.({ reason: "update", previousVersion: "0.2.0" });

    await vi.waitFor(() => {
      expect(readSettings()?.version).toBe(SETTINGS_VERSION);
    });

    const persisted = readSettings();
    // User-visible preferences carried over:
    expect(persisted?.apiKey).toBe("placeholder-key");
    expect(persisted?.targetLanguage).toBe("繁體中文");
    expect(persisted?.showFloatingButton).toBe(true);
    // X flags moved to nested location with correct values:
    expect(persisted?.siteAdapters).toEqual({
      x: {
        enabled: false,
        translateArticles: true,
        quotedPosts: true,
        skipNativeTranslated: true
      }
    });
    // Old flat keys gone:
    expect(persisted?.xOptimizedTranslation).toBeUndefined();
    expect(persisted?.xTranslateQuotedPosts).toBeUndefined();
  });
});
