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

  it("keeps short CJK dialogue ending in a sentence terminator", () => {
    const document = createDocument("<main><p>「申し訳ないが――」</p></main>");

    const blocks = collectTextBlocks(document, options);

    expect(blocks).toHaveLength(1);
    expect(normalize(blocks[0]?.textContent ?? "")).toBe("「申し訳ないが――」");
  });

  it("keeps a short CJK reaction ending in a full stop", () => {
    const document = createDocument("<main><p>「うん。」</p></main>");

    expect(collectTextBlocks(document, options)).toHaveLength(1);
  });

  it("keeps CJK lines that reach the CJK minimum without punctuation", () => {
    const document = createDocument("<main><p>彼女は歩き出す</p></main>");

    expect(collectTextBlocks(document, options)).toHaveLength(1);
  });

  it("excludes very short CJK without terminal punctuation", () => {
    const document = createDocument("<main><p>次へ</p></main>");

    expect(collectTextBlocks(document, options)).toHaveLength(0);
  });

  it("does not count furigana readings toward CJK length", () => {
    // Base content "竜が来た" is 4 chars (below the CJK minimum and unterminated); the
    // <rt> reading must not inflate it past the threshold.
    const document = createDocument(
      "<main><p><ruby>竜<rt>りゅう</rt></ruby>が来た</p></main>"
    );

    expect(collectTextBlocks(document, options)).toHaveLength(0);
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
