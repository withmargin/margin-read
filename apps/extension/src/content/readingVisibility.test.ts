import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isAccessibilityOnlyElement,
  isNonReadingElement,
  isPageChromeElement,
  isVisibleForReading
} from "./readingVisibility";

let styles = new Map<HTMLElement, Partial<CSSStyleDeclaration>>();

beforeEach(() => {
  styles = new Map();
  vi.stubGlobal("window", {
    getComputedStyle: (element: HTMLElement) => ({
      display: "block",
      visibility: "visible",
      opacity: "1",
      position: "static",
      overflow: "visible",
      clip: "auto",
      clipPath: "none",
      width: "auto",
      height: "auto",
      left: "auto",
      top: "auto",
      ...styles.get(element)
    })
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("reading visibility", () => {
  it("identifies page chrome", () => {
    const document = createDocument("<nav><p>Navigation item with enough text for testing.</p></nav>");
    const paragraph = getElement(document, "p");

    expect(isPageChromeElement(paragraph)).toBe(true);
  });

  it("identifies accessibility-only classes and tool indexes", () => {
    const document = createDocument(`
      <main>
        <blockquote class="sr-only" data-agent-docs-index="true">
          <p>Hidden documentation index text for language models.</p>
        </blockquote>
      </main>
    `);
    const paragraph = getElement(document, "p");

    expect(isAccessibilityOnlyElement(paragraph)).toBe(true);
    expect(isNonReadingElement(paragraph, "margin-translation")).toBe(true);
  });

  it("lets not-sr-only content remain readable", () => {
    const document = createDocument("<main><p class=\"not-sr-only\">Visible text that should remain readable.</p></main>");
    const paragraph = getElement(document, "p");

    expect(isAccessibilityOnlyElement(paragraph)).toBe(false);
    expect(isVisibleForReading(paragraph)).toBe(true);
  });

  it("excludes display-hidden elements", () => {
    const document = createDocument("<main><p>Hidden paragraph with enough text for testing.</p></main>");
    const paragraph = getElement(document, "p");
    styles.set(paragraph, { display: "none" });

    expect(isVisibleForReading(paragraph)).toBe(false);
  });

  it("excludes offscreen absolute elements", () => {
    const document = createDocument("<main><p>Offscreen paragraph with enough text for testing.</p></main>");
    const paragraph = getElement(document, "p");
    styles.set(paragraph, { position: "absolute", left: "-9999px" });

    expect(isVisibleForReading(paragraph)).toBe(false);
  });

  it("excludes clipped tiny elements", () => {
    const document = createDocument("<main><p>Clipped paragraph with enough text for testing.</p></main>");
    const paragraph = getElement(document, "p");
    styles.set(paragraph, {
      position: "absolute",
      width: "1px",
      height: "1px",
      clipPath: "inset(50%)"
    });

    expect(isVisibleForReading(paragraph)).toBe(false);
  });

  it("excludes tiny overflow-hidden elements", () => {
    const document = createDocument("<main><p>Tiny paragraph with enough text for testing.</p></main>");
    const paragraph = getElement(document, "p");
    styles.set(paragraph, {
      position: "absolute",
      width: "1px",
      height: "1px",
      overflow: "hidden"
    });

    expect(isVisibleForReading(paragraph)).toBe(false);
  });
});

function createDocument(html: string): Document {
  const document = globalThis.document.implementation.createHTMLDocument("test");
  document.body.innerHTML = html;
  for (const element of Array.from(document.querySelectorAll<HTMLElement>("*"))) {
    Object.defineProperty(element, "offsetParent", {
      configurable: true,
      get() {
        return document.body;
      }
    });
  }
  return document;
}

function getElement(document: Document, selector: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(selector);
  expect(element).not.toBeNull();
  return element as HTMLElement;
}
