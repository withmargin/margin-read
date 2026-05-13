import { describe, expect, it } from "vitest";
import { getTranslationLabel } from "./translationLabel";

describe("getTranslationLabel", () => {
  it("uses compact CJK labels", () => {
    expect(getTranslationLabel("zh-TW")).toBe("譯");
    expect(getTranslationLabel("zh-HK")).toBe("譯");
    expect(getTranslationLabel("zh-CN")).toBe("译");
    expect(getTranslationLabel("zh-Hans")).toBe("译");
    expect(getTranslationLabel("ja-JP")).toBe("翻訳");
    expect(getTranslationLabel("ko-KR")).toBe("번역");
  });

  it("uses localized labels for supported western locales", () => {
    expect(getTranslationLabel("en-US")).toBe("Translation");
    expect(getTranslationLabel("de-DE")).toBe("Uebers.");
    expect(getTranslationLabel("es-MX")).toBe("Trad.");
    expect(getTranslationLabel("fr-CA")).toBe("Trad.");
  });

  it("falls back to English", () => {
    expect(getTranslationLabel("it-IT")).toBe("Translation");
    expect(getTranslationLabel(undefined)).toBe("Translation");
  });
});
