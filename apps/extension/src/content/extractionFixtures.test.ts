import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import docsExpected from "../../test/fixtures/extraction/archetypes/docs/docs-mintlify.expected.json?raw";
import docsHtml from "../../test/fixtures/extraction/archetypes/docs/docs-mintlify.html?raw";
import docsDocusaurusExpected from "../../test/fixtures/extraction/archetypes/docs/docs-docusaurus.expected.json?raw";
import docsDocusaurusHtml from "../../test/fixtures/extraction/archetypes/docs/docs-docusaurus.html?raw";
import articleBlogExpected from "../../test/fixtures/extraction/archetypes/article/article-blog.expected.json?raw";
import articleBlogHtml from "../../test/fixtures/extraction/archetypes/article/article-blog.html?raw";
import xLongPostExpected from "../../test/fixtures/extraction/site/x/long-post.expected.json?raw";
import xLongPostHtml from "../../test/fixtures/extraction/site/x/long-post.html?raw";
import xArticleExpected from "../../test/fixtures/extraction/site/x/article.expected.json?raw";
import xArticleHtml from "../../test/fixtures/extraction/site/x/article.html?raw";
import articleExpected from "../../test/fixtures/extraction/universal/article.expected.json?raw";
import articleHtml from "../../test/fixtures/extraction/universal/article.html?raw";
import forumExpected from "../../test/fixtures/extraction/universal/forum-thread.expected.json?raw";
import forumHtml from "../../test/fixtures/extraction/universal/forum-thread.html?raw";
import substackExpected from "../../test/fixtures/extraction/universal/substack-article.expected.json?raw";
import substackHtml from "../../test/fixtures/extraction/universal/substack-article.html?raw";
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
    name: "site/x/long-post",
    html: xLongPostHtml,
    expected: parseExpected(xLongPostExpected),
    options: {
      xOptimizedTranslation: true,
      xSkipNativeTranslatedPosts: true,
      xTranslateQuotedPosts: false
    }
  },
  {
    name: "site/x/article",
    html: xArticleHtml,
    expected: parseExpected(xArticleExpected),
    options: {
      xOptimizedTranslation: true,
      xTranslateArticles: true
    }
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
