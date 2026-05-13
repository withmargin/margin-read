import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TextBlockOptions } from "../textBlocks";
import { xAdapter } from "./x";

const baseOptions: TextBlockOptions = {
  minTextLength: 24,
  translatedAttr: "data-margin-translated",
  translationClass: "margin-translation"
};

let computedStyle = {
  display: "block",
  visibility: "visible",
  opacity: "1"
};

beforeEach(() => {
  computedStyle = {
    display: "block",
    visibility: "visible",
    opacity: "1"
  };
  vi.stubGlobal("window", {
    getComputedStyle: () => computedStyle
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function withX(overrides: Partial<TextBlockOptions> = {}): TextBlockOptions {
  return { ...baseOptions, xOptimizedTranslation: true, ...overrides };
}

function collect(document: Document, options: TextBlockOptions): HTMLElement[] {
  if (!xAdapter.matches(document, options)) {
    return [];
  }
  return xAdapter.collectBlocks(document, options);
}

describe("xAdapter.matches", () => {
  it("returns false when xOptimizedTranslation is off", () => {
    const document = createDocument(`<article data-testid="tweet"></article>`);

    expect(xAdapter.matches(document, baseOptions)).toBe(false);
  });

  it("returns false when no tweet article is present", () => {
    const document = createDocument(`<article><p>Regular article</p></article>`);

    expect(xAdapter.matches(document, withX())).toBe(false);
  });

  it("returns true when a tweet article exists and optimization is on", () => {
    const document = createDocument(`<article data-testid="tweet"></article>`);

    expect(xAdapter.matches(document, withX())).toBe(true);
  });
});

describe("xAdapter.collectBlocks (tweets)", () => {
  it("returns tweetText blocks tagged with the X data marker", () => {
    const document = createDocument(`
      <div aria-label="Timeline: Your Home Timeline">
        <article data-testid="tweet" role="article">
          <div data-testid="User-Name">Author Name @handle</div>
          <div data-testid="tweetText" lang="en">
            <span>Anthropic just leaked their agent roadmap in 22 minutes.</span>
          </div>
          <div role="group" aria-label="31 replies, 253 reposts, 2365 likes"></div>
        </article>
      </div>
    `);

    const blocks = collect(document, withX());

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.getAttribute("data-testid")).toBe("tweetText");
    expect(blocks[0]?.dataset.marginXBlock).toBe("tweet-text");
    expect(normalize(blocks[0]?.textContent ?? "")).toBe("Anthropic just leaked their agent roadmap in 22 minutes.");
  });

  it("splits long X posts on paragraph boundaries", () => {
    const document = createDocument(`
      <article data-testid="tweet" role="article">
        <div data-testid="tweetText" lang="en">First paragraph has enough text to translate.

Second paragraph also has enough text to translate.

Third paragraph keeps the translated structure readable.</div>
      </article>
    `);

    const blocks = collect(document, withX());

    expect(blocks).toHaveLength(3);
    expect(blocks.map((block) => normalize(block.textContent ?? ""))).toEqual([
      "First paragraph has enough text to translate.",
      "Second paragraph also has enough text to translate.",
      "Third paragraph keeps the translated structure readable."
    ]);
    expect(blocks.every((block) => block.dataset.marginXParagraphBlock === "true")).toBe(true);
  });

  it("does not include quoted X post text by default", () => {
    const document = createDocument(`
      <article data-testid="tweet" role="article">
        <div data-testid="tweetText">The main post has enough text to translate.</div>
        <div role="link">
          <div data-testid="tweetText">The quoted post has enough text to translate.</div>
        </div>
      </article>
    `);

    const blocks = collect(document, withX());

    expect(blocks).toHaveLength(1);
    expect(normalize(blocks[0]?.textContent ?? "")).toBe("The main post has enough text to translate.");
  });

  it("can include quoted X post text when enabled", () => {
    const document = createDocument(`
      <article data-testid="tweet" role="article">
        <div data-testid="tweetText">The main post has enough text to translate.</div>
        <div role="link">
          <div data-testid="tweetText">The quoted post has enough text to translate.</div>
        </div>
      </article>
    `);

    const blocks = collect(document, withX({ xTranslateQuotedPosts: true }));

    expect(blocks.map((block) => normalize(block.textContent ?? ""))).toEqual([
      "The main post has enough text to translate.",
      "The quoted post has enough text to translate."
    ]);
  });

  it("skips X posts that already have native translated text when enabled", () => {
    const document = createDocument(`
      <article data-testid="tweet" role="article">
        <div>Translated from Spanish <button>Show original</button></div>
        <div data-testid="tweetText">Haha, I do not know what his trick is.</div>
      </article>
    `);

    const blocks = collect(document, withX({ xSkipNativeTranslatedPosts: true }));

    expect(blocks).toHaveLength(0);
  });

  it("does not let quoted post native translation markers hide the main X post", () => {
    const document = createDocument(`
      <article data-testid="tweet" role="article">
        <div data-testid="tweetText">The main post has enough text to translate.</div>
        <div role="link">
          <div>Translated from Spanish <button>Show original</button></div>
          <div data-testid="tweetText">The quoted post has enough text to translate.</div>
        </div>
      </article>
    `);

    const blocks = collect(document, withX({ xSkipNativeTranslatedPosts: true }));

    expect(blocks).toHaveLength(1);
    expect(normalize(blocks[0]?.textContent ?? "")).toBe("The main post has enough text to translate.");
  });
});

describe("xAdapter.collectBlocks (articles)", () => {
  it("uses X article title and rich text blocks when article optimization is enabled", () => {
    const document = createDocument(`
      <article data-testid="tweet" role="article">
        <div data-testid="twitterArticleReadView">
          <div data-testid="twitter-article-title">
            How to build an AI team that does not quit on Friday
          </div>
          <div data-testid="twitterArticleRichTextView">
            <div data-testid="longformRichTextComponent">
              <div class="longform-unstyled" data-block="true">
                <div><span data-text="true">Your AI agent broke at 2am on Friday. You do not know yet.</span></div>
              </div>
              <h2 class="longform-header-two" data-block="true">
                <div><span data-text="true">The 3 rules of an AI team that survives Monday</span></div>
              </h2>
              <blockquote class="longform-blockquote" data-block="true">
                <div><span data-text="true">Each human role costs $2,000-$4,500/mo.</span></div>
              </blockquote>
            </div>
          </div>
        </div>
      </article>
    `);

    const blocks = collect(document, withX({ xTranslateArticles: true }));

    expect(blocks.map((block) => normalize(block.textContent ?? ""))).toEqual([
      "How to build an AI team that does not quit on Friday",
      "Your AI agent broke at 2am on Friday. You do not know yet.",
      "The 3 rules of an AI team that survives Monday",
      "Each human role costs $2,000-$4,500/mo."
    ]);
    expect(blocks.every((block) => block.dataset.marginXBlock === "article")).toBe(true);
  });

  it("skips X article media blocks and reply composers", () => {
    const document = createDocument(`
      <article data-testid="tweet" role="article">
        <div data-testid="twitterArticleReadView">
          <div data-testid="twitterArticleRichTextView">
            <div data-testid="longformRichTextComponent">
              <section data-block="true" contenteditable="false">
                <img alt="Image" src="image.jpg" />
              </section>
              <div class="longform-unstyled" data-block="true">
                <div><span data-text="true">A readable article paragraph should still be translated.</span></div>
              </div>
            </div>
          </div>
        </div>
        <div data-testid="tweetTextarea_0_label">
          <div role="textbox" contenteditable="true">Post your reply</div>
        </div>
      </article>
    `);

    const blocks = collect(document, withX({ xTranslateArticles: true }));

    expect(blocks).toHaveLength(1);
    expect(normalize(blocks[0]?.textContent ?? "")).toBe("A readable article paragraph should still be translated.");
  });

  it("skips X article blocks that already received integrated translations", () => {
    const document = createDocument(`
      <article data-testid="tweet" role="article">
        <div data-testid="twitterArticleReadView">
          <div data-testid="twitterArticleRichTextView">
            <div data-testid="longformRichTextComponent">
              <h2 class="longform-header-two" data-block="true" data-margin-translated="done">
                <div><span data-text="true">The already translated article heading</span></div>
              </h2>
              <div class="margin-translation margin-translation--integrated">已翻譯過的標題</div>
              <div class="longform-unstyled" data-block="true">
                <div><span data-text="true">A fresh readable article paragraph should still be translated.</span></div>
              </div>
            </div>
          </div>
        </div>
      </article>
    `);

    const blocks = collect(document, withX({ xTranslateArticles: true }));

    expect(blocks).toHaveLength(1);
    expect(normalize(blocks[0]?.textContent ?? "")).toBe(
      "A fresh readable article paragraph should still be translated."
    );
  });
});

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

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
