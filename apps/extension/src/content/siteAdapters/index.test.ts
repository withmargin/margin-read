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
  it("reports matched: false when no adapter matches the document", () => {
    const document = createDocument(`<article><p>Plain article paragraph.</p></article>`);

    expect(collectSiteAdapterBlocks(document, baseOptions)).toEqual({ matched: false, blocks: [] });
  });

  it("returns the first matching adapter's blocks (X adapter when on X)", () => {
    const document = createDocument(`
      <article data-testid="tweet" role="article">
        <div data-testid="tweetText">Tweet body has enough text to be a real translation candidate.</div>
      </article>
    `);

    const result = collectSiteAdapterBlocks(document, {
      ...baseOptions,
      xOptimizedTranslation: true
    });

    expect(result.matched).toBe(true);
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0]?.dataset.marginXBlock).toBe("tweet-text");
  });

  it("reports matched: true with no blocks when an adapter claims the page but yields nothing", () => {
    // An X page where everything has already been translated must still be reported as
    // adapter-owned so the orchestrator does not fall back to the universal extractor and
    // double-translate the adapter's blocks.
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
    ).toEqual({ matched: true, blocks: [] });
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
