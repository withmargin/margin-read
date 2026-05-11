import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { collectTextBlocks } from "./textBlocks";

const options = {
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

describe("collectTextBlocks", () => {
  it("uses semantic blocks when available", () => {
    const document = createDocument("<main><p>This is a normal semantic paragraph with enough text.</p></main>");

    const blocks = collectTextBlocks(document, options);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.tagName).toBe("P");
  });

  it("uses X tweet text blocks when X optimization is enabled", () => {
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

    const blocks = collectTextBlocks(document, { ...options, xOptimizedTranslation: true });

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.getAttribute("data-testid")).toBe("tweetText");
    expect(blocks[0]?.dataset.marginXBlock).toBe("tweet-text");
    expect(normalize(blocks[0]?.textContent ?? "")).toBe("Anthropic just leaked their agent roadmap in 22 minutes.");
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

    const blocks = collectTextBlocks(document, { ...options, xOptimizedTranslation: true });

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

    const blocks = collectTextBlocks(document, {
      ...options,
      xOptimizedTranslation: true,
      xTranslateQuotedPosts: true
    });

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

    const blocks = collectTextBlocks(document, {
      ...options,
      xOptimizedTranslation: true,
      xSkipNativeTranslatedPosts: true
    });

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

    const blocks = collectTextBlocks(document, {
      ...options,
      xOptimizedTranslation: true,
      xSkipNativeTranslatedPosts: true
    });

    expect(blocks).toHaveLength(1);
    expect(normalize(blocks[0]?.textContent ?? "")).toBe("The main post has enough text to translate.");
  });

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

    const blocks = collectTextBlocks(document, {
      ...options,
      xOptimizedTranslation: true,
      xTranslateArticles: true
    });

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

    const blocks = collectTextBlocks(document, {
      ...options,
      xOptimizedTranslation: true,
      xTranslateArticles: true
    });

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

    const blocks = collectTextBlocks(document, {
      ...options,
      xOptimizedTranslation: true,
      xTranslateArticles: true
    });

    expect(blocks).toHaveLength(1);
    expect(normalize(blocks[0]?.textContent ?? "")).toBe(
      "A fresh readable article paragraph should still be translated."
    );
  });

  it("falls back to legacy table text split by line breaks", () => {
    const document = createDocument(`
      <table>
        <tr>
          <td>
            <font>
              There are great startup ideas lying around unexploited right under our noses.
              <br><br>
              No one likes schleps, but hackers especially dislike them and often avoid them.
              <br><br>
              Short.
            </font>
          </td>
        </tr>
      </table>
    `);

    const blocks = collectTextBlocks(document, options);

    expect(blocks.map((block) => normalize(block.textContent ?? ""))).toEqual([
      "There are great startup ideas lying around unexploited right under our noses.",
      "No one likes schleps, but hackers especially dislike them and often avoid them."
    ]);
    expect(blocks.every((block) => block.dataset.marginLegacyBlock === "true")).toBe(true);
    expect(blocks[0]?.parentElement?.tagName).toBe("FONT");
  });

  it("skips legacy fallback when semantic blocks exist", () => {
    const document = createDocument(`
      <main>
        <p>This semantic paragraph is enough to help avoid legacy fallback.</p>
        <p>This second semantic paragraph is enough to help avoid legacy fallback.</p>
        <p>This third semantic paragraph is enough to help avoid legacy fallback.</p>
      </main>
      <table><tr><td>Legacy text should not be split when semantic text exists.</td></tr></table>
    `);

    const blocks = collectTextBlocks(document, options);

    expect(blocks).toHaveLength(3);
    expect(blocks.every((block) => block.tagName === "P")).toBe(true);
  });

  it("uses legacy fallback when semantic content is too sparse", () => {
    const document = createDocument(`
      <main><p>January 2012</p></main>
      <table>
        <tr>
          <td>
            <font>
              There are great startup ideas lying around unexploited right under our noses.
              <br><br>
              No one likes schleps, but hackers especially dislike them and often avoid them.
            </font>
          </td>
        </tr>
      </table>
    `);

    const blocks = collectTextBlocks(document, options);

    expect(blocks).toHaveLength(2);
    expect(blocks.every((block) => block.dataset.marginLegacyBlock === "true")).toBe(true);
  });

  it("splits a br-separated article paragraph into translation blocks", () => {
    const document = createDocument(`
      <font size="2" face="verdana">
        <p>
          January 2012<br><br>
          There are great startup ideas lying around unexploited right under our noses.
          <br><br>
          No one likes schleps, but hackers especially dislike them and often avoid them.
          <br><br>
          One of the many things we do at Y Combinator is teach hackers about the inevitability of schleps.
        </p>
      </font>
    `);

    const blocks = collectTextBlocks(document, options);

    expect(blocks.map((block) => normalize(block.textContent ?? ""))).toEqual([
      "There are great startup ideas lying around unexploited right under our noses.",
      "No one likes schleps, but hackers especially dislike them and often avoid them.",
      "One of the many things we do at Y Combinator is teach hackers about the inevitability of schleps."
    ]);
    expect(blocks.every((block) => block.dataset.marginBrSeparatedBlock === "true")).toBe(true);
    const paragraph = document.querySelector("p");
    expect(paragraph).not.toBeNull();
    const childNodes = Array.from(paragraph?.childNodes ?? []);
    expect(childNodes.indexOf(blocks[0])).toBeLessThan(childNodes.indexOf(blocks[1]));
    expect(childNodes.indexOf(blocks[1])).toBeLessThan(childNodes.indexOf(blocks[2]));
  });

  it("splits long br-separated semantic paragraphs that would otherwise be rejected", () => {
    const document = createDocument(`
      <main>
        <p>
          ${"First long paragraph sentence. ".repeat(80)}
          <br><br>
          ${"Second long paragraph sentence. ".repeat(80)}
          <br><br>
          ${"Third long paragraph sentence. ".repeat(80)}
        </p>
      </main>
    `);

    const blocks = collectTextBlocks(document, options);

    expect(blocks).toHaveLength(3);
    expect(blocks.every((block) => block.textContent && block.textContent.length < 4000)).toBe(true);
  });

  it("keeps single line breaks inside a br-separated translation block", () => {
    const document = createDocument(`
      <main>
        <p>
          First line has enough readable text for translation.
          <br>
          The continuation line should stay in the same source block.
          <br><br>
          Second paragraph has enough readable text for translation.
        </p>
      </main>
    `);

    const blocks = collectTextBlocks(document, options);

    expect(blocks).toHaveLength(2);
    expect(blocks[0]?.querySelector("br")).not.toBeNull();
    expect(normalize(blocks[0]?.textContent ?? "")).toContain("The continuation line should stay");
  });

  it("reuses existing br-separated source blocks on later scans", () => {
    const document = createDocument(`
      <main>
        <p>
          First paragraph has enough readable text for translation.
          <br><br>
          Second paragraph has enough readable text for translation.
          <br><br>
          Third paragraph has enough readable text for translation.
        </p>
      </main>
    `);

    const firstScanBlocks = collectTextBlocks(document, options);
    const secondScanBlocks = collectTextBlocks(document, options);

    expect(secondScanBlocks).toEqual(firstScanBlocks);
    expect(document.querySelectorAll("[data-margin-br-separated-block='true']")).toHaveLength(3);
  });

  it("does not split containers with only single line breaks", () => {
    const document = createDocument(`
      <main>
        <p>
          This paragraph has enough text to be translated as one semantic block.
          <br>
          This line should remain part of the same paragraph because there is no blank line.
        </p>
      </main>
    `);

    const blocks = collectTextBlocks(document, options);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.dataset.marginBrSeparatedBlock).toBeUndefined();
  });

  it("excludes translated and interactive content", () => {
    const document = createDocument(`
      <main>
        <p data-margin-translated="done">Already translated paragraph with enough text.</p>
        <p><button>Click</button> Interactive paragraph with enough text.</p>
      </main>
    `);

    expect(collectTextBlocks(document, options)).toHaveLength(0);
  });

  it("excludes content inside inserted translation nodes", () => {
    const document = createDocument(`
      <main>
        <div class="margin-translation">
          <p>This translated paragraph should never be translated again.</p>
        </div>
      </main>
    `);

    expect(collectTextBlocks(document, options)).toHaveLength(0);
  });

  it("excludes navigation-like semantic content", () => {
    const document = createDocument(`
      <nav>
        <p>This navigation paragraph has enough text but should be skipped.</p>
      </nav>
    `);

    expect(collectTextBlocks(document, options)).toHaveLength(0);
  });

  it("excludes short non-heading semantic content", () => {
    const document = createDocument("<main><p>Too short.</p></main>");

    expect(collectTextBlocks(document, options)).toHaveLength(0);
  });

  it("returns no blocks when a legacy page has no long readable container", () => {
    const document = createDocument("<table><tr><td>Short text only.</td></tr></table>");

    expect(collectTextBlocks(document, options)).toHaveLength(0);
  });

  it("keeps short semantic headings", () => {
    const document = createDocument("<main><h1>Schlep</h1></main>");

    const blocks = collectTextBlocks(document, options);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.tagName).toBe("H1");
  });

  it("excludes hidden semantic content", () => {
    computedStyle = {
      display: "none",
      visibility: "visible",
      opacity: "1"
    };
    const document = createDocument("<main><p>This paragraph has enough text but is hidden.</p></main>");

    expect(collectTextBlocks(document, options)).toHaveLength(0);
  });

  it("excludes very long semantic content", () => {
    const document = createDocument(`<main><p>${"Long text ".repeat(500)}</p></main>`);

    expect(collectTextBlocks(document, options)).toHaveLength(0);
  });

  it("ignores nested legacy containers when choosing the fallback container", () => {
    const document = createDocument(`
      <table>
        <tr>
          <td>
            <font>
              First legacy paragraph has enough text to become its own block.
              <br><br>
              Second legacy paragraph has enough text to become its own block.
            </font>
          </td>
        </tr>
      </table>
    `);

    const blocks = collectTextBlocks(document, options);

    expect(blocks).toHaveLength(2);
  });

  it("ignores skipped nested legacy candidates", () => {
    const document = createDocument(`
      <table>
        <tr>
          <td>
            Visible legacy paragraph has enough text to become its own block.
            <nav><font>Skipped nested navigation text should not become the chosen fallback.</font></nav>
          </td>
        </tr>
      </table>
    `);

    const blocks = collectTextBlocks(document, options);

    expect(blocks).toHaveLength(1);
    expect(normalize(blocks[0]?.textContent ?? "")).toBe("Visible legacy paragraph has enough text to become its own block.");
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
