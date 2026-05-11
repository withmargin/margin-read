import { describe, expect, it } from "vitest";
import { dictionaries, detectOptionsLocale, MESSAGE_KEYS, t } from "./i18n";

describe("options i18n", () => {
  it("uses Traditional Chinese for Chinese browser preferences", () => {
    expect(detectOptionsLocale(["zh-TW", "en-US"])).toBe("zh-TW");
    expect(detectOptionsLocale(["zh-HK", "en-US"])).toBe("zh-TW");
  });

  it("uses Simplified Chinese for Simplified Chinese browser preferences", () => {
    expect(detectOptionsLocale(["zh-CN", "en-US"])).toBe("zh-CN");
    expect(detectOptionsLocale(["zh-Hans", "en-US"])).toBe("zh-CN");
  });

  it("uses supported non-English locales from browser preferences", () => {
    expect(detectOptionsLocale(["ja-JP", "en-US"])).toBe("ja");
    expect(detectOptionsLocale(["ko-KR", "en-US"])).toBe("ko");
    expect(detectOptionsLocale(["es-MX", "en-US"])).toBe("es");
    expect(detectOptionsLocale(["fr-CA", "en-US"])).toBe("fr");
    expect(detectOptionsLocale(["de-DE", "en-US"])).toBe("de");
  });

  it("falls back to English for unsupported locales", () => {
    expect(detectOptionsLocale(["it-IT", "en-US"])).toBe("en");
  });

  it("interpolates status messages", () => {
    expect(t("en", "statusLoadedModels", { count: 3 })).toBe("Loaded 3 models.");
    expect(t("zh-TW", "statusLoadedModels", { count: 3 })).toBe("已載入 3 個模型。");
    expect(t("zh-CN", "statusLoadedModels", { count: 3 })).toBe("已载入 3 个模型。");
    expect(t("ja", "statusLoadedModels", { count: 3 })).toBe("3 個のモデルを読み込みました。");
    expect(t("ko", "statusLoadedModels", { count: 3 })).toBe("3개 모델을 불러왔습니다.");
  });

  it("keeps every locale complete and non-empty", () => {
    for (const [locale, messages] of Object.entries(dictionaries)) {
      expect(Object.keys(messages).sort()).toEqual([...MESSAGE_KEYS].sort());

      for (const key of MESSAGE_KEYS) {
        expect(messages[key].trim(), `${locale}.${key}`).not.toBe("");
      }
    }
  });
});
