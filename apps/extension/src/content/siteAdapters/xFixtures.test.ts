import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import xArticleExpected from "../../../test/fixtures/extraction/site/x/article.expected.json?raw";
import xArticleHtml from "../../../test/fixtures/extraction/site/x/article.html?raw";
import xLongPostExpected from "../../../test/fixtures/extraction/site/x/long-post.expected.json?raw";
import xLongPostHtml from "../../../test/fixtures/extraction/site/x/long-post.html?raw";
import type { BlockCandidateRole, BlockCandidateSource, BlockRenderStrategy } from "../blockCandidates";
import { createIncludedBlockCandidates } from "../extraction/shared";
import type { TextBlockOptions } from "../textBlocks";
import { xAdapter } from "./x";

interface AdapterFixture {
  name: string;
  html: string;
  expected: AdapterFixtureExpectations;
  options?: Partial<TextBlockOptions>;
}

interface AdapterFixtureExpectations {
  expectedTexts: string[];
  excludedTexts: string[];
  blockShape?: ExpectedBlockShape[];
}

interface ExpectedBlockShape {
  textIncludes: string;
  role?: BlockCandidateRole;
  source?: BlockCandidateSource;
  renderStrategy?: BlockRenderStrategy;
}

const defaultOptions: TextBlockOptions = {
  minTextLength: 24,
  translatedAttr: "data-margin-translated",
  translationClass: "margin-translation",
  xOptimizedTranslation: true,
  xTranslateArticles: true,
  xTranslateQuotedPosts: false,
  xSkipNativeTranslatedPosts: true
};

const fixtures: AdapterFixture[] = [
  {
    name: "x/long-post",
    html: xLongPostHtml,
    expected: parseExpected(xLongPostExpected)
  },
  {
    name: "x/article",
    html: xArticleHtml,
    expected: parseExpected(xArticleExpected)
  }
];

beforeEach(() => {
  vi.stubGlobal("window", {
    getComputedStyle: () => ({
      display: "block",
      visibility: "visible",
      opacity: "1"
    })
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("X site adapter fixtures", () => {
  for (const fixture of fixtures) {
    it(`matches ${fixture.name}`, () => {
      const document = createFixtureDocument(fixture.html);
      const options = { ...defaultOptions, ...fixture.options };
      expect(xAdapter.matches(document, options)).toBe(true);

      const blocks = xAdapter.collectBlocks(document, options);
      const candidates = createIncludedBlockCandidates(blocks, "adapter", options);
      const actualBlocks = candidates.map((candidate) => ({
        text: candidate.text,
        role: candidate.role,
        source: candidate.source,
        renderStrategy: candidate.renderStrategy
      }));
      const extractedText = normalize(actualBlocks.map((block) => block.text).join(" "));

      for (const expectedText of fixture.expected.expectedTexts) {
        expect(extractedText).toContain(expectedText);
      }

      for (const excludedText of fixture.expected.excludedTexts) {
        expect(extractedText).not.toContain(excludedText);
      }

      for (const shape of fixture.expected.blockShape ?? []) {
        const matchingBlock = actualBlocks.find((block) => block.text.includes(shape.textIncludes));
        expect(
          matchingBlock,
          `blockShape selector "${shape.textIncludes}" matched no extracted block in ${fixture.name}`
        ).toBeDefined();
        expect(matchingBlock).toMatchObject(omitUndefinedProperties(shape));
      }
    });
  }
});

function parseExpected(value: string): AdapterFixtureExpectations {
  return JSON.parse(value) as AdapterFixtureExpectations;
}

function createFixtureDocument(html: string): Document {
  const document = globalThis.document.implementation.createHTMLDocument("fixture");
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

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function omitUndefinedProperties(shape: ExpectedBlockShape): Partial<Omit<ExpectedBlockShape, "textIncludes">> {
  return Object.fromEntries(
    Object.entries(shape).filter(([key, value]) => key !== "textIncludes" && value !== undefined)
  );
}
