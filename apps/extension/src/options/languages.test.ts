import { describe, expect, it } from "vitest";
import { filterLanguageOptions, findLanguageOption, formatLanguageOption, getPreferredLanguageOption } from "./languages";

describe("language options", () => {
  it("filters by native name, english name, code, and alias", () => {
    expect(filterLanguageOptions("繁中").map((option) => option.code)).toContain("zh-TW");
    expect(filterLanguageOptions("japanese").map((option) => option.code)).toEqual(["ja"]);
    expect(filterLanguageOptions("pt-br").map((option) => option.code)).toEqual(["pt-BR"]);
    expect(filterLanguageOptions("bahasa").map((option) => option.code)).toEqual(["id", "ms"]);
  });

  it("finds options from stored prompt-friendly values", () => {
    expect(findLanguageOption("Traditional Chinese")?.code).toBe("zh-TW");
    expect(findLanguageOption("zh-CN")?.promptName).toBe("Simplified Chinese");
  });

  it("prefers the browser language when available", () => {
    expect(getPreferredLanguageOption(["zh-TW", "en-US"]).promptName).toBe("Traditional Chinese");
    expect(getPreferredLanguageOption(["ja-JP", "en-US"]).promptName).toBe("Japanese");
  });

  it("formats native and english names for display", () => {
    expect(formatLanguageOption(findLanguageOption("zh-TW")!)).toBe("繁體中文 / Traditional Chinese");
    expect(formatLanguageOption(findLanguageOption("English")!)).toBe("English");
  });
});
