import type { TextBlockOptions } from "../types";
import { isTranslatableElement, shouldIncludeCandidate } from "../shared";

const DATA_AS_DOCS_BLOCK_SELECTORS = ["[data-as='p']", "[data-as='h1']", "[data-as='h2']", "[data-as='h3']"];
const MARKDOWN_DOCS_CONTAINER_SELECTORS = ["main .prose", "main .markdown-body", "main .theme-doc-markdown"];
const MARKDOWN_DOCS_BLOCK_SELECTORS = ["p", "li", "dt", "dd", "figcaption", "blockquote", "h1", "h2", "h3", "td", "th"];
const DOCS_ARCHETYPE_SELECTOR = [
  ...DATA_AS_DOCS_BLOCK_SELECTORS.flatMap((selector) => [`article ${selector}`, `main ${selector}`, selector]),
  ...MARKDOWN_DOCS_CONTAINER_SELECTORS.flatMap((containerSelector) =>
    MARKDOWN_DOCS_BLOCK_SELECTORS.map((blockSelector) => `${containerSelector} ${blockSelector}`)
  )
].join(", ");
export const DOCS_ARCHETYPE_CONFIDENCE_THRESHOLD = 0.7;

export function collectDocsBlocks(document: Document, options: TextBlockOptions): HTMLElement[] {
  if (detectDocsArchetypeConfidence(document) < DOCS_ARCHETYPE_CONFIDENCE_THRESHOLD) {
    return [];
  }

  return Array.from(document.querySelectorAll<HTMLElement>(DOCS_ARCHETYPE_SELECTOR)).filter(
    (element) => isTranslatableElement(element, options) && shouldIncludeCandidate(element, "archetype")
  );
}

export function detectDocsArchetypeConfidence(document: Document): number {
  const docsBlocks = document.querySelectorAll(DOCS_ARCHETYPE_SELECTOR).length;
  if (docsBlocks === 0) {
    return 0;
  }

  let confidence = 0.35;
  confidence += Math.min(docsBlocks, 3) * 0.1;

  if (document.querySelector(".prose, .markdown-body, .theme-doc-markdown")) {
    confidence += 0.15;
  }

  if (document.querySelector("main, article, [role='main']")) {
    confidence += 0.2;
  }

  if (document.querySelector("aside, nav")) {
    confidence += 0.1;
  }

  if (document.querySelector("pre, code, table")) {
    confidence += 0.05;
  }

  return Math.min(confidence, 1);
}
