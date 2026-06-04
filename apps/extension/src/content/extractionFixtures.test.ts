import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import docsExpected from "../../test/fixtures/extraction/archetypes/docs/docs-mintlify.expected.json?raw";
import docsHtml from "../../test/fixtures/extraction/archetypes/docs/docs-mintlify.html?raw";
import docsDocusaurusExpected from "../../test/fixtures/extraction/archetypes/docs/docs-docusaurus.expected.json?raw";
import docsDocusaurusHtml from "../../test/fixtures/extraction/archetypes/docs/docs-docusaurus.html?raw";
import articleBlogExpected from "../../test/fixtures/extraction/archetypes/article/article-blog.expected.json?raw";
import articleBlogHtml from "../../test/fixtures/extraction/archetypes/article/article-blog.html?raw";
import articleExpected from "../../test/fixtures/extraction/universal/article.expected.json?raw";
import articleHtml from "../../test/fixtures/extraction/universal/article.html?raw";
import forumExpected from "../../test/fixtures/extraction/universal/forum-thread.expected.json?raw";
import forumHtml from "../../test/fixtures/extraction/universal/forum-thread.html?raw";
import substackExpected from "../../test/fixtures/extraction/universal/substack-article.expected.json?raw";
import substackHtml from "../../test/fixtures/extraction/universal/substack-article.html?raw";
import cjkLeadInsExpected from "../../test/fixtures/extraction/universal/cjk-lead-ins.expected.json?raw";
import cjkLeadInsHtml from "../../test/fixtures/extraction/universal/cjk-lead-ins.html?raw";
import cjkNovelDialogueExpected from "../../test/fixtures/extraction/universal/cjk-novel-dialogue.expected.json?raw";
import cjkNovelDialogueHtml from "../../test/fixtures/extraction/universal/cjk-novel-dialogue.html?raw";
import blockquoteShortFragmentExpected from "../../test/fixtures/extraction/universal/blockquote-short-fragment.expected.json?raw";
import blockquoteShortFragmentHtml from "../../test/fixtures/extraction/universal/blockquote-short-fragment.html?raw";
import hiddenAccessibilityExpected from "../../test/fixtures/extraction/universal/hidden-accessibility.expected.json?raw";
import hiddenAccessibilityHtml from "../../test/fixtures/extraction/universal/hidden-accessibility.html?raw";
import nestedQuoteExpected from "../../test/fixtures/extraction/universal/nested-quote.expected.json?raw";
import nestedQuoteHtml from "../../test/fixtures/extraction/universal/nested-quote.html?raw";
import tableDefinitionExpected from "../../test/fixtures/extraction/universal/table-definition.expected.json?raw";
import tableDefinitionHtml from "../../test/fixtures/extraction/universal/table-definition.html?raw";
import hnLooseParagraphsExpected from "../../test/fixtures/extraction/universal/hn-loose-paragraphs.expected.json?raw";
import hnLooseParagraphsHtml from "../../test/fixtures/extraction/universal/hn-loose-paragraphs.html?raw";
import { collectBlockCandidates } from "./textBlocks";
import type { TextBlockOptions } from "./textBlocks";
import type { BlockCandidateRole, BlockCandidateSource, BlockRenderStrategy } from "./blockCandidates";

interface ExtractionFixture {
  name: string;
  html: string;
  expected: ExtractionFixtureExpectations;
  options?: Partial<TextBlockOptions>;
}

interface ExtractionFixtureExpectations {
  expectedTexts: string[];
  excludedTexts: string[];
  blockShape?: ExpectedBlockShape[];
  expectedOccurrences?: ExpectedOccurrence[];
}

interface ExpectedBlockShape {
  textIncludes: string;
  role?: BlockCandidateRole;
  source?: BlockCandidateSource;
  renderStrategy?: BlockRenderStrategy;
}

interface ExpectedOccurrence {
  textIncludes: string;
  count: number;
}

const defaultOptions: TextBlockOptions = {
  minTextLength: 24,
  translatedAttr: "data-margin-translated",
  translationClass: "margin-translation"
};

const fixtures: ExtractionFixture[] = [
  {
    name: "universal/article",
    html: articleHtml,
    expected: parseExpected(articleExpected)
  },
  {
    name: "archetypes/docs/docs-mintlify",
    html: docsHtml,
    expected: parseExpected(docsExpected)
  },
  {
    name: "archetypes/docs/docs-docusaurus",
    html: docsDocusaurusHtml,
    expected: parseExpected(docsDocusaurusExpected)
  },
  {
    name: "archetypes/article/article-blog",
    html: articleBlogHtml,
    expected: parseExpected(articleBlogExpected)
  },
  {
    name: "universal/forum-thread",
    html: forumHtml,
    expected: parseExpected(forumExpected)
  },
  {
    name: "universal/substack-article",
    html: substackHtml,
    expected: parseExpected(substackExpected)
  },
  {
    name: "universal/cjk-lead-ins",
    html: cjkLeadInsHtml,
    expected: parseExpected(cjkLeadInsExpected)
  },
  {
    name: "universal/cjk-novel-dialogue",
    html: cjkNovelDialogueHtml,
    expected: parseExpected(cjkNovelDialogueExpected)
  },
  {
    name: "universal/blockquote-short-fragment",
    html: blockquoteShortFragmentHtml,
    expected: parseExpected(blockquoteShortFragmentExpected)
  },
  {
    name: "universal/hidden-accessibility",
    html: hiddenAccessibilityHtml,
    expected: parseExpected(hiddenAccessibilityExpected)
  },
  {
    name: "universal/nested-quote",
    html: nestedQuoteHtml,
    expected: parseExpected(nestedQuoteExpected)
  },
  {
    name: "universal/table-definition",
    html: tableDefinitionHtml,
    expected: parseExpected(tableDefinitionExpected)
  },
  {
    name: "universal/hn-loose-paragraphs",
    html: hnLooseParagraphsHtml,
    expected: parseExpected(hnLooseParagraphsExpected)
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

describe("extraction fixtures", () => {
  for (const fixture of fixtures) {
    it(`matches ${fixture.name}`, () => {
      const document = createFixtureDocument(fixture.html);
      const candidates = collectBlockCandidates(document, { ...defaultOptions, ...fixture.options });
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

      for (const occurrence of fixture.expected.expectedOccurrences ?? []) {
        const count = actualBlocks.filter((block) => normalize(block.text).includes(occurrence.textIncludes)).length;
        expect(
          count,
          `expected "${occurrence.textIncludes}" to appear ${occurrence.count} time(s) in ${fixture.name}, got ${count}`
        ).toBe(occurrence.count);
      }
    });
  }
});

function parseExpected(value: string): ExtractionFixtureExpectations {
  return JSON.parse(value) as ExtractionFixtureExpectations;
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
