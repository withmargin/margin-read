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
export const ARTICLE_ARCHETYPE_CONFIDENCE_THRESHOLD = 0.65;

export function collectArticleBlocks(document: Document, options: TextBlockOptions): HTMLElement[] {
  if (detectArticleArchetypeConfidence(document) < ARTICLE_ARCHETYPE_CONFIDENCE_THRESHOLD) {
    return [];
  }

  return Array.from(document.querySelectorAll<HTMLElement>(ARTICLE_ARCHETYPE_SELECTOR)).filter(
    (element) => isTranslatableElement(element, options) && shouldIncludeCandidate(element, "archetype")
  );
}

export function detectArticleArchetypeConfidence(document: Document): number {
  const articleBlocks = document.querySelectorAll(ARTICLE_ARCHETYPE_SELECTOR);
  if (articleBlocks.length === 0) {
    return 0;
  }

  let confidence = 0.3;
  confidence += Math.min(articleBlocks.length, 4) * 0.1;

  if (document.querySelector(ARTICLE_CONTAINER_SELECTORS.join(", "))) {
    confidence += 0.2;
  }

  if (document.querySelector("main, article, [role='main']")) {
    confidence += 0.15;
  }

  if (document.querySelector(`${ARTICLE_CONTAINER_SELECTORS.join(" h1, ")} h1`)) {
    confidence += 0.1;
  }

  if (document.querySelectorAll(`${ARTICLE_CONTAINER_SELECTORS.join(" p, ")} p`).length >= 2) {
    confidence += 0.1;
  }

  return Math.min(confidence, 1);
}
