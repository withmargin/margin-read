import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyIntegratedStyle,
  deriveIntegratedStyleTokens,
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
    expect(getTranslationClassName("integrated")).toBe("toast-translation toast-translation--integrated");
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
    expect(getIntegratedLineHeight("80px", 20, false)).toBe("1.58");
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

  it("keeps lighter font weights unchanged", () => {
    expect(getIntegratedFontWeight("400")).toBe("400");
  });

  it("returns non-numeric font weights unchanged", () => {
    expect(getIntegratedFontWeight("bold")).toBe("bold");
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
