import { describe, expect, it } from "vitest";
import {
  countCodePoints,
  getCjkRatio,
  hasCjkSentenceTerminator,
  isCjkDominantText,
  normalizeText
} from "./text";

describe("normalizeText", () => {
  it("collapses whitespace and trims", () => {
    expect(normalizeText("  a\n\t b  ")).toBe("a b");
  });
});

describe("countCodePoints", () => {
  it("counts BMP characters one each", () => {
    expect(countCodePoints("申し訳ない")).toBe(5);
  });

  it("counts supplementary-plane characters as one", () => {
    // "𠀀" (U+20000) and "😀" are each a single code point but two UTF-16 units.
    expect("𠀀".length).toBe(2);
    expect(countCodePoints("𠀀")).toBe(1);
    expect(countCodePoints("😀")).toBe(1);
  });
});

describe("getCjkRatio", () => {
  it("ignores whitespace in the denominator", () => {
    expect(getCjkRatio("東京 行く")).toBe(1);
  });

  it("excludes full-width punctuation from the numerator", () => {
    // "――" is dashes only: no CJK letters.
    expect(getCjkRatio("――")).toBe(0);
  });

  it("treats Latin-with-CJK as a fraction", () => {
    // "AB東" -> 1 of 3 content chars is CJK.
    expect(getCjkRatio("AB東")).toBeCloseTo(1 / 3);
  });
});

describe("isCjkDominantText", () => {
  it("is true for CJK with embedded Latin terms", () => {
    expect(isCjkDominantText("Reactは便利な道具だ")).toBe(true);
  });

  it("is false for Latin-dominant text with stray CJK", () => {
    expect(isCjkDominantText("React の useEffect")).toBe(false);
    expect(isCjkDominantText("Sign in")).toBe(false);
  });

  it("is false for symbol-only strings", () => {
    expect(isCjkDominantText("――")).toBe(false);
    expect(isCjkDominantText("2024")).toBe(false);
  });
});

describe("hasCjkSentenceTerminator", () => {
  it.each(["やめて。", "本当に？", "だめだ！", "申し訳ないが――", "そう…"])(
    "detects a terminator in %s",
    (value) => {
      expect(hasCjkSentenceTerminator(value)).toBe(true);
    }
  );

  it.each(["ホーム", "次へ", "会員中心"])("returns false for UI labels like %s", (value) => {
    expect(hasCjkSentenceTerminator(value)).toBe(false);
  });
});
