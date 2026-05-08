import { afterEach, describe, expect, it, vi } from "vitest";
import { applyIntegratedStyle, getIntegratedFontWeight, getTranslationClassName, scaleFontSize } from "./displayStyle";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getTranslationClassName", () => {
  it("adds the base class and style modifier", () => {
    expect(getTranslationClassName("integrated")).toBe("rosetta-translation rosetta-translation--integrated");
  });
});

describe("scaleFontSize", () => {
  it("scales headings down more aggressively", () => {
    expect(scaleFontSize("80px", "H1")).toBe("41.6px");
  });

  it("keeps paragraph text close to the source size", () => {
    expect(scaleFontSize("20px", "P")).toBe("18.4px");
  });

  it("enforces a readable minimum", () => {
    expect(scaleFontSize("10px", "P")).toBe("13px");
  });

  it("returns non-pixel values unchanged when they cannot be parsed", () => {
    expect(scaleFontSize("inherit", "P")).toBe("inherit");
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
        maxWidth: "640px"
      })
    });

    applyIntegratedStyle(source, translation);

    expect(translation.style.fontFamily).toBe("Inter");
    expect(translation.style.fontSize).toBe("18.4px");
    expect(translation.style.fontWeight).toBe("500");
    expect(translation.style.lineHeight).toBe("30px");
    expect(translation.style.maxWidth).toBe("640px");
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
        maxWidth: "none"
      })
    });

    applyIntegratedStyle(source, translation);

    expect(translation.style.fontSize).toBe("31.2px");
    expect(translation.style.maxWidth).toBe("");
  });
});
