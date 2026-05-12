import { describe, expect, it } from "vitest";
import { parseV0 } from "./v0";

describe("parseV0", () => {
  it("returns an empty object for non-object input", () => {
    expect(parseV0(undefined)).toEqual({});
    expect(parseV0(null)).toEqual({});
    expect(parseV0("nope")).toEqual({});
    expect(parseV0(42)).toEqual({});
  });

  it("keeps known string fields verbatim", () => {
    const result = parseV0({ apiKey: "sk-test", model: "gpt-4o-mini" });
    expect(result.apiKey).toBe("sk-test");
    expect(result.model).toBe("gpt-4o-mini");
  });

  it("rejects strings of the wrong shape for enum fields", () => {
    const result = parseV0({
      provider: "not-a-real-provider",
      displayStyle: "exotic",
      cacheMode: "forever"
    });
    expect(result.provider).toBeUndefined();
    expect(result.displayStyle).toBeUndefined();
    expect(result.cacheMode).toBeUndefined();
  });

  it("accepts valid enum values", () => {
    const result = parseV0({
      provider: "anthropic",
      displayStyle: "highlighted",
      cacheMode: "session"
    });
    expect(result.provider).toBe("anthropic");
    expect(result.displayStyle).toBe("highlighted");
    expect(result.cacheMode).toBe("session");
  });

  it("drops non-boolean values for boolean fields", () => {
    const result = parseV0({
      debugMode: "yes",
      xOptimizedTranslation: 1,
      xTranslateArticles: null
    });
    expect(result.debugMode).toBeUndefined();
    expect(result.xOptimizedTranslation).toBeUndefined();
    expect(result.xTranslateArticles).toBeUndefined();
  });

  it("ignores unknown top-level keys", () => {
    const result = parseV0({
      apiKey: "sk-test",
      somethingExperimental: "future",
      legacyHack: true
    }) as Record<string, unknown>;

    expect(result.somethingExperimental).toBeUndefined();
    expect(result.legacyHack).toBeUndefined();
  });
});
