import { describe, expect, it } from "vitest";
import { detectOptionsLocale, t } from "./i18n";

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
});
