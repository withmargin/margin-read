import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "./defaults";
import { migrateSettings } from "./migrations";
import { SETTINGS_VERSION } from "./types";

describe("migrateSettings", () => {
  it("returns default settings when nothing is stored", () => {
    expect(migrateSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  it("returns default settings when stored value is not an object", () => {
    expect(migrateSettings("garbage")).toEqual(DEFAULT_SETTINGS);
    expect(migrateSettings(42)).toEqual(DEFAULT_SETTINGS);
    expect(migrateSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it("upgrades a pre-v1 flat shape into the nested v1 shape", () => {
    const old = {
      apiKey: "sk-test",
      provider: "anthropic",
      targetLanguage: "繁體中文",
      xOptimizedTranslation: false,
      xTranslateArticles: false,
      xTranslateQuotedPosts: true,
      xSkipNativeTranslatedPosts: false
    };

    const migrated = migrateSettings(old);

    expect(migrated.version).toBe(SETTINGS_VERSION);
    expect(migrated.apiKey).toBe("sk-test");
    expect(migrated.provider).toBe("anthropic");
    expect(migrated.targetLanguage).toBe("繁體中文");
    expect(migrated.siteAdapters).toEqual({
      x: {
        enabled: false,
        translateArticles: false,
        quotedPosts: true,
        skipNativeTranslated: false
      }
    });
  });

  it("fills missing pre-v1 X flags from defaults", () => {
    const old = {
      apiKey: "sk-test"
      // no x* fields at all
    };

    const migrated = migrateSettings(old);

    expect(migrated.siteAdapters.x).toEqual(DEFAULT_SETTINGS.siteAdapters.x);
  });

  it("drops unknown / stale top-level keys from pre-v1 data", () => {
    const old = {
      apiKey: "sk-test",
      xOptimizedTranslation: true,
      // legacy fields no longer recognized:
      legacyExperimentalFlag: "yes",
      anotherDeadKey: 42
    };

    const migrated = migrateSettings(old) as unknown as Record<string, unknown>;

    expect(migrated.legacyExperimentalFlag).toBeUndefined();
    expect(migrated.anotherDeadKey).toBeUndefined();
    expect(migrated.xOptimizedTranslation).toBeUndefined();
  });

  it("passes v1 settings through with defaults filled in for any missing fields", () => {
    const stored = {
      version: 1,
      apiKey: "sk-test",
      provider: "google",
      siteAdapters: {
        x: {
          enabled: true,
          translateArticles: false,
          quotedPosts: true,
          skipNativeTranslated: true
        }
      }
    };

    const migrated = migrateSettings(stored);

    expect(migrated.version).toBe(1);
    expect(migrated.apiKey).toBe("sk-test");
    expect(migrated.provider).toBe("google");
    expect(migrated.siteAdapters.x.translateArticles).toBe(false);
    // defaults for non-stored keys:
    expect(migrated.displayStyle).toBe(DEFAULT_SETTINGS.displayStyle);
    expect(migrated.targetLanguage).toBe(DEFAULT_SETTINGS.targetLanguage);
  });

  it("is idempotent — re-migrating a v1 result yields the same value", () => {
    const old = {
      apiKey: "sk-test",
      xOptimizedTranslation: false,
      xTranslateArticles: true,
      xTranslateQuotedPosts: false,
      xSkipNativeTranslatedPosts: true
    };

    const once = migrateSettings(old);
    const twice = migrateSettings(once);

    expect(twice).toEqual(once);
  });

  it("does not share nested references between calls (deep clone of defaults)", () => {
    const first = migrateSettings(undefined);
    const second = migrateSettings(undefined);

    expect(first.siteAdapters).not.toBe(second.siteAdapters);
    expect(first.siteAdapters.x).not.toBe(second.siteAdapters.x);
  });

  it("does not mutate the input object", () => {
    const old = {
      apiKey: "sk-test",
      xOptimizedTranslation: true
    };
    const snapshot = JSON.stringify(old);

    migrateSettings(old);

    expect(JSON.stringify(old)).toBe(snapshot);
  });
});
