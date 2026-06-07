import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyIntegratedStyle,
  applyLanguageTypography,
  applyTranslationDisplayStyle,
  deriveIntegratedStyleTokens,
  getFocusFontSize,
  getFocusFontWeight,
  getIntegratedFontSize,
  getIntegratedFontWeight,
  getIntegratedLineHeight,
  getIntegratedMarginBottom,
  getIntegratedMarginTop,
  getTranslationClassName,
  scaleFontSize
} from "./displayStyle";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getTranslationClassName", () => {
  it("adds the base class and style modifier", () => {
    expect(getTranslationClassName("balanced")).toBe("margin-translation margin-translation--balanced");
  });

  it("maps legacy display styles to their modern equivalents", () => {
    expect(getTranslationClassName("integrated")).toBe("margin-translation margin-translation--quiet");
    expect(getTranslationClassName("highlighted")).toBe("margin-translation margin-translation--card");
  });
});

describe("applyLanguageTypography", () => {
  it("adds CJK inter-script spacing for Chinese translations", () => {
    const translation = document.createElement("div");
    translation.style.letterSpacing = "0.08em";

    applyLanguageTypography(translation, "Traditional Chinese");

    expect(translation.lang).toBe("zh-TW");
    expect(translation.dir).toBe("auto");
    expect(translation.classList.contains("margin-translation--cjk")).toBe(true);
    expect(translation.style.fontFamily).toContain("PingFang TC");
    expect(translation.style.fontWeight).toBe("450");
    expect(translation.style.lineHeight).toBe("1.58");
    expect(translation.style.getPropertyValue("text-autospace")).toBe("normal");
    expect(translation.style.getPropertyValue("line-break")).toBe("auto");
    expect(translation.style.getPropertyValue("word-break")).toBe("normal");
    expect(translation.style.getPropertyValue("overflow-wrap")).toBe("anywhere");
    expect(translation.style.getPropertyValue("font-kerning")).toBe("normal");
    expect(translation.style.letterSpacing).toBe("0px");
  });

  it("keeps Korean words together", () => {
    const translation = document.createElement("div");

    applyLanguageTypography(translation, "Korean");

    expect(translation.lang).toBe("ko");
    expect(translation.style.fontFamily).toContain("Apple SD Gothic Neo");
    expect(translation.style.getPropertyValue("word-break")).toBe("keep-all");
  });

  it("uses Japanese phrase breaking when supported", () => {
    const translation = document.createElement("div");
    vi.stubGlobal("CSS", {
      supports: (declaration: string) => declaration === "word-break: auto-phrase"
    });

    applyLanguageTypography(translation, "Japanese");

    expect(translation.lang).toBe("ja");
    expect(translation.style.fontFamily).toContain("Hiragino Sans");
    expect(translation.style.getPropertyValue("word-break")).toBe("auto-phrase");
  });

  it("uses normal Japanese line breaking when phrase breaking is unavailable", () => {
    const translation = document.createElement("div");
    vi.stubGlobal("CSS", {
      supports: () => false
    });

    applyLanguageTypography(translation, "Japanese translation");

    expect(translation.lang).toBe("ja");
    expect(translation.style.getPropertyValue("word-break")).toBe("normal");
  });

  it("enables CJK punctuation trimming when supported", () => {
    const translation = document.createElement("div");
    vi.stubGlobal("CSS", {
      supports: (declaration: string) => declaration === "text-spacing-trim: normal"
    });

    applyLanguageTypography(translation, "zh-hant");

    expect(translation.lang).toBe("zh-HANT");
    expect(translation.style.getPropertyValue("text-spacing-trim")).toBe("normal");
  });

  it("detects native CJK language labels", () => {
    const chinese = document.createElement("div");
    const japanese = document.createElement("div");
    const korean = document.createElement("div");

    applyLanguageTypography(chinese, "简体中文");
    applyLanguageTypography(japanese, "日本語");
    applyLanguageTypography(korean, "한국어");

    expect(chinese.lang).toBe("zh-CN");
    expect(japanese.lang).toBe("ja");
    expect(korean.lang).toBe("ko");
  });

  it("falls back to broad CJK language names", () => {
    const chinese = document.createElement("div");
    const korean = document.createElement("div");

    applyLanguageTypography(chinese, "Chinese translation");
    applyLanguageTypography(korean, "Korean translation");

    expect(chinese.lang).toBe("zh");
    expect(korean.lang).toBe("ko");
  });

  it("marks unknown empty target languages as undetermined", () => {
    const translation = document.createElement("div");

    applyLanguageTypography(translation, "");

    expect(translation.lang).toBe("und");
    expect(translation.style.getPropertyValue("text-autospace")).toBe("");
  });

  it("does not apply CJK spacing to non-CJK translations", () => {
    const translation = document.createElement("div");

    applyLanguageTypography(translation, "French");

    expect(translation.lang).toBe("fr");
    expect(translation.dir).toBe("auto");
    expect(translation.classList.contains("margin-translation--cjk")).toBe(false);
    expect(translation.style.getPropertyValue("text-autospace")).toBe("");
    expect(translation.style.letterSpacing).toBe("");
  });

  it("keeps CJK text readable when the source style is very light or tight", () => {
    const translation = document.createElement("div");
    translation.style.fontWeight = "100";
    translation.style.lineHeight = "1.2";

    applyLanguageTypography(translation, "Traditional Chinese");

    expect(translation.style.fontWeight).toBe("430");
    expect(translation.style.lineHeight).toBe("1.34");
  });

  it("does not allow CJK paragraph line height to become too loose", () => {
    const translation = document.createElement("div");
    translation.style.fontWeight = "800";
    translation.style.lineHeight = "2.4";

    applyLanguageTypography(translation, "Korean");

    expect(translation.style.fontWeight).toBe("580");
    expect(translation.style.lineHeight).toBe("1.82");
  });
});

describe("scaleFontSize", () => {
  it("scales headings down more aggressively", () => {
    expect(scaleFontSize("80px", "H1")).toBe("32px");
  });

  it("keeps paragraph text close to the source size", () => {
    expect(scaleFontSize("20px", "P")).toBe("16.4px");
  });

  it("enforces a readable minimum", () => {
    expect(scaleFontSize("10px", "P")).toBe("14px");
  });

  it("returns non-pixel values unchanged when they cannot be parsed", () => {
    expect(scaleFontSize("inherit", "P")).toBe("inherit");
  });
});

describe("getIntegratedFontSize", () => {
  it("caps large article paragraph text", () => {
    expect(getIntegratedFontSize(42, "P")).toBe(20);
  });

  it("keeps normal paragraph text secondary but readable", () => {
    expect(getIntegratedFontSize(18, "P")).toBe(14.76);
  });

  it("caps large headings", () => {
    expect(getIntegratedFontSize(80, "H1")).toBe(32);
  });
});

describe("getIntegratedLineHeight", () => {
  it("uses a tighter heading line height", () => {
    expect(getIntegratedLineHeight("96px", 80, true)).toBe("1.25");
  });

  it("clamps paragraph line height ratios", () => {
    expect(getIntegratedLineHeight("80px", 20, false)).toBe("1.78");
    expect(getIntegratedLineHeight("20px", 20, false)).toBe("1.42");
  });

  it("falls back when line height is not pixel-based", () => {
    expect(getIntegratedLineHeight("normal", 20, false)).toBe("1.5");
  });
});

describe("getIntegratedMarginBottom", () => {
  it("preserves paragraph rhythm after the translation", () => {
    expect(getIntegratedMarginBottom("24px", 30, 20)).toBe("1.2em");
  });

  it("falls back when margin bottom is not pixel-based", () => {
    expect(getIntegratedMarginBottom("auto", 30, 20)).toBe("0.8em");
  });

  it("uses a tighter heading rhythm", () => {
    expect(getIntegratedMarginBottom("40px", 80, 60, true)).toBe("0.67em");
  });
});

describe("getIntegratedMarginTop", () => {
  it("uses a small positive gap when the source has no bottom margin", () => {
    expect(getIntegratedMarginTop("0px", 30, 20, false)).toBe("0.33em");
  });

  it("counteracts source bottom margin to keep translation attached to the source", () => {
    expect(getIntegratedMarginTop("24px", 30, 20, false)).toBe("-0.87em");
  });

  it("uses a smaller heading gap", () => {
    expect(getIntegratedMarginTop("0px", 80, 60, true)).toBe("0.19em");
  });
});

describe("deriveIntegratedStyleTokens", () => {
  it("derives compact paragraph companion typography", () => {
    expect(
      deriveIntegratedStyleTokens(
        { tagName: "P" },
        {
          fontFamily: "Georgia",
          fontSize: "42px",
          fontWeight: "400",
          lineHeight: "60px",
          letterSpacing: "0px",
          textAlign: "start",
          color: "rgb(20, 20, 20)",
          maxWidth: "680px",
          marginBottom: "32px"
        }
      )
    ).toMatchObject({
      fontSize: "20px",
      lineHeight: "1.43",
      marginTop: "-0.45em",
      marginBottom: "1.14em"
    });
  });
});

describe("getIntegratedFontWeight", () => {
  it("caps heavy font weights", () => {
    expect(getIntegratedFontWeight("800")).toBe("500");
  });

  it("keeps normal font weights unchanged", () => {
    expect(getIntegratedFontWeight("400")).toBe("400");
  });

  it("raises ultra-light source weights to a readable translation weight", () => {
    expect(getIntegratedFontWeight("100")).toBe("400");
  });

  it("returns non-numeric font weights unchanged", () => {
    expect(getIntegratedFontWeight("bold")).toBe("bold");
  });
});

describe("focus display typography", () => {
  it("keeps focus paragraph translations closer to the source size", () => {
    expect(getFocusFontSize(20, "P")).toBe(18);
  });

  it("keeps focus heading translations larger than integrated headings", () => {
    expect(getFocusFontSize(60, "H2")).toBe(34);
  });

  it("raises very light source weights for focused translations", () => {
    expect(getFocusFontWeight("100")).toBe("450");
  });
});

describe("applyIntegratedStyle", () => {
  it("copies source typography and scales the translation text", () => {
    const source = { tagName: "P" } as HTMLElement;
    const translation = { style: {} } as HTMLElement;

    vi.stubGlobal("window", {
      getComputedStyle: () => ({
        fontFamily: "Inter",
        fontSize: "20px",
        fontWeight: "700",
        lineHeight: "30px",
        letterSpacing: "0px",
        textAlign: "start",
        color: "rgb(20, 20, 20)",
        maxWidth: "640px",
        marginBottom: "24px"
      })
    });

    applyIntegratedStyle(source, translation);

    expect(translation.style.fontFamily).toBe("Inter");
    expect(translation.style.fontSize).toBe("16.4px");
    expect(translation.style.fontWeight).toBe("500");
    expect(translation.style.lineHeight).toBe("1.5");
    expect(translation.style.maxWidth).toBe("640px");
    expect(translation.style.marginTop).toBe("-0.87em");
    expect(translation.style.marginBottom).toBe("1.2em");
  });

  it("does not force a max width when the source has none", () => {
    const source = { tagName: "H1" } as HTMLElement;
    const translation = { style: {} } as HTMLElement;

    vi.stubGlobal("window", {
      getComputedStyle: () => ({
        fontFamily: "Georgia",
        fontSize: "60px",
        fontWeight: "400",
        lineHeight: "1.1",
        letterSpacing: "0px",
        textAlign: "center",
        color: "black",
        maxWidth: "none",
        marginBottom: "24px"
      })
    });

    applyIntegratedStyle(source, translation);

    expect(translation.style.fontSize).toBe("30px");
    expect(translation.style.maxWidth).toBe("");
  });
});

describe("applyTranslationDisplayStyle", () => {
  it("applies focus typography when requested", () => {
    const source = { tagName: "P" } as HTMLElement;
    const translation = { style: {} } as HTMLElement;

    vi.stubGlobal("window", {
      getComputedStyle: () => ({
        fontFamily: "Inter",
        fontSize: "20px",
        fontWeight: "100",
        lineHeight: "30px",
        letterSpacing: "0px",
        textAlign: "start",
        color: "rgb(20, 20, 20)",
        maxWidth: "640px",
        marginBottom: "24px"
      })
    });

    applyTranslationDisplayStyle(source, translation, "focus");

    expect(translation.style.fontFamily).toBe("Inter");
    expect(translation.style.fontSize).toBe("18px");
    expect(translation.style.fontWeight).toBe("450");
  });

  it("uses a positive top gap for table-cell translations so they never overlap the source", () => {
    const source = { tagName: "P" } as HTMLElement;
    const integrated = { style: {} } as HTMLElement;
    const tableCell = { style: {} } as HTMLElement;

    vi.stubGlobal("window", {
      getComputedStyle: () => ({
        fontFamily: "Inter",
        fontSize: "20px",
        fontWeight: "400",
        lineHeight: "30px",
        letterSpacing: "0px",
        textAlign: "start",
        color: "rgb(20, 20, 20)",
        maxWidth: "640px",
        marginBottom: "24px"
      })
    });

    applyTranslationDisplayStyle(source, integrated, "quiet", "integrated");
    applyTranslationDisplayStyle(source, tableCell, "quiet", "table-cell");

    // The integrated strategy collapses against the source margin-bottom and goes negative;
    // the table-cell strategy must stay positive because it is nested inside the source.
    expect(integrated.style.marginTop).toBe("-0.87em");
    expect(tableCell.style.marginTop).toBe("0.33em");
  });

  it("falls back to a 16px base when the source font size is not in pixels (focus)", () => {
    const source = { tagName: "P" } as HTMLElement;
    const translation = { style: {} } as HTMLElement;

    vi.stubGlobal("window", {
      getComputedStyle: () => ({
        fontFamily: "Inter",
        fontSize: "",
        fontWeight: "100",
        lineHeight: "30px",
        letterSpacing: "0px",
        textAlign: "start",
        color: "rgb(20, 20, 20)",
        maxWidth: "640px",
        marginBottom: "24px"
      })
    });

    applyTranslationDisplayStyle(source, translation, "focus");

    expect(translation.style.fontSize).toBe("15px");
  });

  it("gives a heading table-cell translation a small positive top gap", () => {
    const source = { tagName: "H2" } as HTMLElement;
    const translation = { style: {} } as HTMLElement;

    vi.stubGlobal("window", {
      getComputedStyle: () => ({
        fontFamily: "Inter",
        fontSize: "",
        fontWeight: "600",
        lineHeight: "30px",
        letterSpacing: "0px",
        textAlign: "start",
        color: "rgb(20, 20, 20)",
        maxWidth: "640px",
        marginBottom: "24px"
      })
    });

    applyTranslationDisplayStyle(source, translation, "quiet", "table-cell");

    expect(translation.style.marginTop).toBe("0.26em");
  });
});

describe("typography branch edge cases", () => {
  it("resolves Chinese names and native labels to the right zh code", () => {
    const traditionalLabel = document.createElement("div");
    applyLanguageTypography(traditionalLabel, "繁體中文");
    expect(traditionalLabel.lang).toBe("zh-TW");

    const genericLabel = document.createElement("div");
    applyLanguageTypography(genericLabel, "中文");
    expect(genericLabel.lang).toBe("zh");

    const traditionalName = document.createElement("div");
    applyLanguageTypography(traditionalName, "Traditional Chinese (Taiwan)");
    expect(traditionalName.lang).toBe("zh-TW");

    const simplifiedName = document.createElement("div");
    applyLanguageTypography(simplifiedName, "Simplified Chinese (China)");
    expect(simplifiedName.lang).toBe("zh-CN");
  });

  it("uses tighter heading rhythm when the source margin is not in pixels", () => {
    expect(getIntegratedMarginBottom("auto", 30, 20, true)).toBe("0.45em");
    expect(getIntegratedMarginBottom("auto", 30, 20, false)).toBe("0.8em");
  });

  it("returns non-numeric focus font weights unchanged", () => {
    expect(getFocusFontWeight("bold")).toBe("bold");
  });

  it("returns a px-suffixed but unparsable font size unchanged", () => {
    expect(scaleFontSize("abcpx", "P")).toBe("abcpx");
  });
});
