import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../defaults";
import { SETTINGS_VERSION } from "../types";
import { migrateSettings } from "./index";
import v0Flat from "./__fixtures__/v0.flat-with-x.json";
import v0FlatExpected from "./__fixtures__/v0.flat-with-x.expected.json";
import v0Minimal from "./__fixtures__/v0.minimal.json";
import v0MinimalExpected from "./__fixtures__/v0.minimal.expected.json";
import v0Junk from "./__fixtures__/v0.with-junk-fields.json";
import v0JunkExpected from "./__fixtures__/v0.with-junk-fields.expected.json";
import v1Passthrough from "./__fixtures__/v1.passthrough.json";

describe("migrateSettings — guard: every historical fixture migrates to current shape", () => {
  const HISTORICAL_FIXTURES = {
    "v0.flat-with-x": v0Flat,
    "v0.minimal": v0Minimal,
    "v0.with-junk-fields": v0Junk,
    "v1.passthrough": v1Passthrough
  };

  for (const [name, fixture] of Object.entries(HISTORICAL_FIXTURES)) {
    it(`${name} migrates to version ${SETTINGS_VERSION} with valid shape`, () => {
      const result = migrateSettings(fixture);

      expect(result.version).toBe(SETTINGS_VERSION);
      expect(result.siteAdapters).toBeDefined();
      expect(result.siteAdapters.x).toBeDefined();
      expect(typeof result.siteAdapters.x.enabled).toBe("boolean");
      expect(typeof result.siteAdapters.x.translateArticles).toBe("boolean");
      expect(typeof result.siteAdapters.x.quotedPosts).toBe("boolean");
      expect(typeof result.siteAdapters.x.skipNativeTranslated).toBe("boolean");
      expect(typeof result.showTranslationLabel).toBe("boolean");
    });
  }
});

describe("migrateSettings — fixture-pinned end-to-end", () => {
  it("v0.flat-with-x → expected", () => {
    expect(migrateSettings(v0Flat)).toEqual(v0FlatExpected);
  });

  it("v0.minimal → expected", () => {
    expect(migrateSettings(v0Minimal)).toEqual(v0MinimalExpected);
  });

  it("v0.with-junk-fields → expected", () => {
    expect(migrateSettings(v0Junk)).toEqual(v0JunkExpected);
  });

  it("v1.passthrough returns the same shape it came in with", () => {
    expect(migrateSettings(v1Passthrough)).toEqual(v1Passthrough);
  });
});

describe("migrateSettings — fallbacks and forward compatibility", () => {
  it("returns defaults when stored is undefined / null / not an object", () => {
    expect(migrateSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(migrateSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(migrateSettings("garbage")).toEqual(DEFAULT_SETTINGS);
    expect(migrateSettings(42)).toEqual(DEFAULT_SETTINGS);
  });

  it("accepts future-version data, dropping fields it does not recognise", () => {
    const future = {
      ...v1Passthrough,
      version: 99,
      experimentalCapability: "unknown to us",
      anotherFutureField: { nested: true }
    };

    const migrated = migrateSettings(future) as unknown as Record<string, unknown>;

    expect(migrated.version).toBe(SETTINGS_VERSION);
    expect(migrated.experimentalCapability).toBeUndefined();
    expect(migrated.anotherFutureField).toBeUndefined();
    // Known fields preserved:
    expect(migrated.apiKey).toBe("g-test");
  });
});

describe("migrateSettings — idempotency and isolation", () => {
  it("v0 input fully migrated, re-running migrate yields the same value", () => {
    const once = migrateSettings(v0Flat);
    const twice = migrateSettings(once);
    expect(twice).toEqual(once);
  });

  it("defaults are deep-cloned per call (no shared nested references)", () => {
    const first = migrateSettings(undefined);
    const second = migrateSettings(undefined);
    expect(first.siteAdapters).not.toBe(second.siteAdapters);
    expect(first.siteAdapters.x).not.toBe(second.siteAdapters.x);
  });

  it("does not mutate the input object", () => {
    const original = JSON.stringify(v0Flat);
    migrateSettings(v0Flat);
    expect(JSON.stringify(v0Flat)).toBe(original);
  });
});
