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

  it("uses labels from target language names", () => {
    expect(getTranslationLabel("Traditional Chinese")).toBe("譯");
    expect(getTranslationLabel("繁體中文")).toBe("譯");
    expect(getTranslationLabel("Simplified Chinese")).toBe("译");
    expect(getTranslationLabel("简体中文")).toBe("译");
    expect(getTranslationLabel("Japanese")).toBe("翻訳");
    expect(getTranslationLabel("日本語")).toBe("翻訳");
    expect(getTranslationLabel("Korean")).toBe("번역");
    expect(getTranslationLabel("한국어")).toBe("번역");
  });

  it("uses localized labels for supported western locales", () => {
    expect(getTranslationLabel("en-US")).toBe("Translation");
    expect(getTranslationLabel("de-DE")).toBe("Uebers.");
    expect(getTranslationLabel("es-MX")).toBe("Trad.");
    expect(getTranslationLabel("fr-CA")).toBe("Trad.");
    expect(getTranslationLabel("Italian")).toBe("Trad.");
    expect(getTranslationLabel("Brazilian Portuguese")).toBe("Trad.");
  });

  it("falls back to English", () => {
    expect(getTranslationLabel("unknown-language")).toBe("Translation");
    expect(getTranslationLabel(undefined)).toBe("Translation");
  });
});
