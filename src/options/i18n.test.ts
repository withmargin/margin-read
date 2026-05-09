import { describe, expect, it } from "vitest";
import { dictionaries, detectOptionsLocale, MESSAGE_KEYS, t } from "./i18n";

describe("options i18n", () => {
  it("uses Traditional Chinese for Chinese browser preferences", () => {
    expect(detectOptionsLocale(["zh-TW", "en-US"])).toBe("zh-TW");
    expect(detectOptionsLocale(["zh-HK", "en-US"])).toBe("zh-TW");
  });

  it("falls back to English for unsupported locales", () => {
    expect(detectOptionsLocale(["ja-JP", "en-US"])).toBe("en");
  });

  it("interpolates status messages", () => {
    expect(t("en", "statusLoadedModels", { count: 3 })).toBe("Loaded 3 models.");
    expect(t("zh-TW", "statusLoadedModels", { count: 3 })).toBe("已載入 3 個模型。");
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
