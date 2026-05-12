import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { collectSiteAdapterBlocks, siteAdapters } from "./index";

beforeEach(() => {
  vi.stubGlobal("window", {
    getComputedStyle: () => ({ display: "block", visibility: "visible", opacity: "1" })
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("siteAdapters registry", () => {
  it("exposes the X adapter", () => {
    expect(siteAdapters.map((adapter) => adapter.id)).toContain("x");
  });
});

describe("collectSiteAdapterBlocks", () => {
  it("returns [] when no adapter matches the document", () => {
    const document = createDocument(`<article><p>Plain article paragraph.</p></article>`);

    expect(collectSiteAdapterBlocks(document, baseOptions)).toEqual([]);
  });

  it("returns the first matching adapter's blocks (X adapter when on X)", () => {
    const document = createDocument(`
      <article data-testid="tweet" role="article">
        <div data-testid="tweetText">Tweet body has enough text to be a real translation candidate.</div>
      </article>
    `);

    const blocks = collectSiteAdapterBlocks(document, {
      ...baseOptions,
      xOptimizedTranslation: true
    });

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.dataset.marginXBlock).toBe("tweet-text");
  });

  it("falls through to [] when an adapter matches but yields no blocks", () => {
    const document = createDocument(`
      <article data-testid="tweet" role="article">
        <div data-testid="tweetText">a</div>
      </article>
    `);

    expect(
      collectSiteAdapterBlocks(document, {
        ...baseOptions,
        xOptimizedTranslation: true
      })
    ).toEqual([]);
  });
});

const baseOptions = {
  minTextLength: 24,
  translatedAttr: "data-margin-translated",
  translationClass: "margin-translation"
};

function createDocument(html: string): Document {
  const document = globalThis.document.implementation.createHTMLDocument("test");
  document.body.innerHTML = html;
  Object.defineProperty(document.body, "innerText", {
    configurable: true,
    get(this: HTMLElement) {
      return this.textContent ?? "";
    }
  });
  for (const element of Array.from(document.querySelectorAll<HTMLElement>("*"))) {
    Object.defineProperty(element, "innerText", {
      configurable: true,
      get(this: HTMLElement) {
        return this.textContent ?? "";
      }
    });
    Object.defineProperty(element, "offsetParent", {
      configurable: true,
      get() {
        return document.body;
      }
    });
  }
  return document;
}
