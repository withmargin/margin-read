import { describe, expect, it } from "vitest";
import { migrateV0ToV1 } from "./v0-to-v1";
import { parseV0 } from "./versions/v0";
import v0Flat from "./__fixtures__/v0.flat-with-x.json";
import v0FlatExpected from "./__fixtures__/v0.flat-with-x.expected.json";
import v0Minimal from "./__fixtures__/v0.minimal.json";
import v0MinimalExpected from "./__fixtures__/v0.minimal.expected.json";
import v0Junk from "./__fixtures__/v0.with-junk-fields.json";
import v0JunkExpected from "./__fixtures__/v0.with-junk-fields.expected.json";

describe("migrateV0ToV1 (fixture-driven)", () => {
  it("upgrades a realistic flat sample with custom X flags", () => {
    expect(migrateV0ToV1(parseV0(v0Flat))).toEqual(v0FlatExpected);
  });

  it("upgrades minimal storage (only apiKey set) using defaults", () => {
    expect(migrateV0ToV1(parseV0(v0Minimal))).toEqual(v0MinimalExpected);
  });

  it("drops junk fields and rejects invalid enum values", () => {
    // junk fixture has provider: "not-a-real-provider" → parseV0 drops it
    // and migration falls back to the default provider.
    expect(migrateV0ToV1(parseV0(v0Junk))).toEqual(v0JunkExpected);
  });
});

describe("migrateV0ToV1 (boundary)", () => {
  it("folds the four X flags into siteAdapters.x with renamed keys", () => {
    const result = migrateV0ToV1({
      xOptimizedTranslation: false,
      xTranslateArticles: false,
      xTranslateQuotedPosts: true,
      xSkipNativeTranslatedPosts: false
    });

    expect(result.siteAdapters).toEqual({
      x: {
        enabled: false,
        translateArticles: false,
        quotedPosts: true,
        skipNativeTranslated: false
      }
    });
  });

  it("sets version to 1", () => {
    expect(migrateV0ToV1({}).version).toBe(1);
  });

  it("fills missing X flags from defaults", () => {
    const result = migrateV0ToV1({ xOptimizedTranslation: true });

    expect(result.siteAdapters.x.enabled).toBe(true);
    // others come from defaults:
    expect(result.siteAdapters.x.translateArticles).toBe(true);
    expect(result.siteAdapters.x.quotedPosts).toBe(false);
    expect(result.siteAdapters.x.skipNativeTranslated).toBe(true);
  });
});
