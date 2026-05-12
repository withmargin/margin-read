import { describe, expect, it, vi } from "vitest";
import { applyTranslationLayout, classifyTranslationLayout, shouldMirrorBlockLayout } from "./layoutStrategy";

describe("shouldMirrorBlockLayout", () => {
  it("mirrors centered article blocks inside wider parents", () => {
    expect(
      shouldMirrorBlockLayout({
        sourceRect: rect({ width: 640 }),
        parentRect: rect({ width: 1168 }),
        sourceStyle: style({
          display: "block",
          marginLeft: "263px",
          marginRight: "263px",
          width: "640px",
          maxWidth: "640px"
        })
      })
    ).toBe(true);
  });

  it("does not mirror full-width blocks", () => {
    expect(
      shouldMirrorBlockLayout({
        sourceRect: rect({ width: 980 }),
        parentRect: rect({ width: 1000 }),
        sourceStyle: style({
          display: "block",
          marginLeft: "0px",
          marginRight: "0px",
          width: "980px",
          maxWidth: "none"
        })
      })
    ).toBe(false);
  });

  it("does not mirror inline content", () => {
    expect(
      shouldMirrorBlockLayout({
        sourceRect: rect({ width: 320 }),
        parentRect: rect({ width: 900 }),
        sourceStyle: style({
          display: "inline",
          marginLeft: "100px",
          marginRight: "100px",
          width: "auto",
          maxWidth: "none"
        })
      })
    ).toBe(false);
  });
});

describe("classifyTranslationLayout", () => {
  it("keeps legacy split blocks in the legacy inline strategy", () => {
    const source = createElement({
      dataset: { marginLegacyBlock: "true" },
      sourceRect: rect({ width: 320 }),
      parentRect: rect({ width: 900 }),
      sourceStyle: style({ display: "inline", marginLeft: "0px", marginRight: "0px" })
    });

    expect(classifyTranslationLayout(source)).toBe("legacy-inline");
  });
});

describe("applyTranslationLayout", () => {
  it("keeps Quartr-style centered article translations aligned with the source column", () => {
    const source = createElement({
      className: "quik_text_quik_text__w6RJ0 quik-size-bodyLarge mx-auto w-full max-w-160 text-quik_textReading",
      sourceRect: rect({ width: 640 }),
      parentRect: rect({ width: 1168 }),
      sourceStyle: style({
        alignSelf: "auto",
        boxSizing: "border-box",
        display: "block",
        marginLeft: "263px",
        marginRight: "263px",
        maxWidth: "640px",
        width: "640px"
      })
    });
    const translation = document.createElement("div");

    applyTranslationLayout(source, translation);

    expect(translation.dataset.marginLayout).toBe("mirror-block");
    expect(translation.style.width).toBe("640px");
    expect(translation.style.marginLeft).toBe("263px");
    expect(translation.style.marginRight).toBe("263px");
  });

  it("copies width and horizontal margins for centered blocks", () => {
    const source = createElement({
      sourceRect: rect({ width: 640 }),
      parentRect: rect({ width: 1168 }),
      sourceStyle: style({
        alignSelf: "auto",
        boxSizing: "border-box",
        display: "block",
        marginLeft: "263px",
        marginRight: "263px",
        maxWidth: "640px",
        width: "640px"
      })
    });
    const translation = document.createElement("div");

    applyTranslationLayout(source, translation);

    expect(translation.dataset.marginLayout).toBe("mirror-block");
    expect(translation.style.width).toBe("640px");
    expect(translation.style.maxWidth).toBe("640px");
    expect(translation.style.marginLeft).toBe("263px");
    expect(translation.style.marginRight).toBe("263px");
  });

  it("leaves normal full-width blocks untouched", () => {
    const source = createElement({
      sourceRect: rect({ width: 900 }),
      parentRect: rect({ width: 900 }),
      sourceStyle: style({ display: "block", marginLeft: "0px", marginRight: "0px" })
    });
    const translation = document.createElement("div");

    applyTranslationLayout(source, translation);

    expect(translation.dataset.marginLayout).toBe("inherit-text");
    expect(translation.style.width).toBe("");
    expect(translation.style.marginLeft).toBe("");
  });
});

function createElement({
  className,
  dataset,
  sourceRect,
  parentRect,
  sourceStyle
}: {
  className?: string;
  dataset?: Record<string, string>;
  sourceRect: DOMRectReadOnly;
  parentRect: DOMRectReadOnly;
  sourceStyle: Partial<CSSStyleDeclaration>;
}): HTMLElement {
  const parent = document.createElement("div");
  const source = document.createElement("p");
  source.className = className ?? "";
  Object.assign(source.dataset, dataset);
  parent.append(source);
  vi.spyOn(source, "getBoundingClientRect").mockReturnValue(sourceRect as DOMRect);
  vi.spyOn(parent, "getBoundingClientRect").mockReturnValue(parentRect as DOMRect);
  vi.spyOn(window, "getComputedStyle").mockImplementation((element) =>
    element === source ? (sourceStyle as CSSStyleDeclaration) : style({ display: "block" })
  );
  return source;
}

function rect({ width }: { width: number }): DOMRectReadOnly {
  return { bottom: 0, height: 0, left: 0, right: width, top: 0, width, x: 0, y: 0, toJSON: () => ({}) };
}

function style(overrides: Partial<CSSStyleDeclaration>): CSSStyleDeclaration {
  return {
    alignSelf: "auto",
    boxSizing: "border-box",
    display: "block",
    flexDirection: "column",
    marginLeft: "0px",
    marginRight: "0px",
    maxWidth: "none",
    width: "auto",
    ...overrides
  } as CSSStyleDeclaration;
}
