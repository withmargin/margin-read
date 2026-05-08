import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { collectTextBlocks } from "./textBlocks";

const options = {
  minTextLength: 24,
  translatedAttr: "data-toast-translated",
  translationClass: "toast-translation"
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

    expect(blocks.map((block) => block.textContent)).toEqual([
      "There are great startup ideas lying around unexploited right under our noses.",
      "No one likes schleps, but hackers especially dislike them and often avoid them."
    ]);
    expect(blocks.every((block) => block.dataset.toastLegacyBlock === "true")).toBe(true);
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
    expect(blocks.every((block) => block.dataset.toastLegacyBlock === "true")).toBe(true);
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

    expect(blocks.map((block) => block.textContent)).toEqual([
      "There are great startup ideas lying around unexploited right under our noses.",
      "No one likes schleps, but hackers especially dislike them and often avoid them.",
      "One of the many things we do at Y Combinator is teach hackers about the inevitability of schleps."
    ]);
    expect(blocks.every((block) => block.dataset.toastBrSeparatedBlock === "true")).toBe(true);
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
    expect(blocks[0]?.dataset.toastBrSeparatedBlock).toBeUndefined();
  });

  it("excludes translated and interactive content", () => {
    const document = createDocument(`
      <main>
        <p data-toast-translated="done">Already translated paragraph with enough text.</p>
        <p><button>Click</button> Interactive paragraph with enough text.</p>
      </main>
    `);

    expect(collectTextBlocks(document, options)).toHaveLength(0);
  });

  it("excludes content inside inserted translation nodes", () => {
    const document = createDocument(`
      <main>
        <div class="toast-translation">
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
    expect(blocks[0]?.textContent).toBe("Visible legacy paragraph has enough text to become its own block.");
  });
});

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
