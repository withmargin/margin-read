import type { TextBlockOptions } from "../types";
import { isTranslatableElement, shouldIncludeCandidate } from "../shared";

const ARTICLE_CONTAINER_SELECTORS = [
  "[itemprop='articleBody']",
  ".article-content",
  ".entry-content",
  ".post-body",
  ".post-content",
  ".story-content"
];
const ARTICLE_BLOCK_SELECTORS = ["p", "li", "dt", "dd", "figcaption", "blockquote", "h1", "h2", "h3", "td", "th"];
const ARTICLE_ARCHETYPE_SELECTOR = ARTICLE_CONTAINER_SELECTORS.flatMap((containerSelector) =>
  ARTICLE_BLOCK_SELECTORS.map((blockSelector) => `${containerSelector} ${blockSelector}`)
).join(", ");
const ARTICLE_CONTAINER_LIST_SELECTOR = ARTICLE_CONTAINER_SELECTORS.join(", ");
const ARTICLE_CONTAINER_HEADING_SELECTOR = `${ARTICLE_CONTAINER_SELECTORS.join(" h1, ")} h1`;
const ARTICLE_CONTAINER_PARAGRAPH_SELECTOR = `${ARTICLE_CONTAINER_SELECTORS.join(" p, ")} p`;
export const ARTICLE_ARCHETYPE_CONFIDENCE_THRESHOLD = 0.65;

export function collectArticleBlocks(document: Document, options: TextBlockOptions): HTMLElement[] {
  const candidates = document.querySelectorAll<HTMLElement>(ARTICLE_ARCHETYPE_SELECTOR);
  if (computeArticleArchetypeConfidence(document, candidates.length) < ARTICLE_ARCHETYPE_CONFIDENCE_THRESHOLD) {
    return [];
  }

  return Array.from(candidates).filter(
    (element) => isTranslatableElement(element, options) && shouldIncludeCandidate(element, "archetype")
  );
}

export function detectArticleArchetypeConfidence(document: Document): number {
  return computeArticleArchetypeConfidence(
    document,
    document.querySelectorAll(ARTICLE_ARCHETYPE_SELECTOR).length
  );
}

function computeArticleArchetypeConfidence(document: Document, archetypeBlockCount: number): number {
  if (archetypeBlockCount === 0) {
    return 0;
  }

  let confidence = 0.3;
  confidence += Math.min(archetypeBlockCount, 4) * 0.1;

  if (document.querySelector(ARTICLE_CONTAINER_LIST_SELECTOR)) {
    confidence += 0.2;
  }

  if (document.querySelector("main, article, [role='main']")) {
    confidence += 0.15;
  }

  if (document.querySelector(ARTICLE_CONTAINER_HEADING_SELECTOR)) {
    confidence += 0.1;
  }

  if (document.querySelectorAll(ARTICLE_CONTAINER_PARAGRAPH_SELECTOR).length >= 2) {
    confidence += 0.1;
  }

  return Math.min(confidence, 1);
}
