import type { TextBlockOptions } from "./types";
import {
  filterCandidateElements,
  normalizeText,
  shouldSkipElement,
  splitContainerInlineRuns
} from "./shared";

// Inline (phrasing) elements never delimit a paragraph, so a text node sitting inside one
// belongs to a run owned by the nearest block-level ancestor. We climb past these to find
// the real container.
const INLINE_ELEMENT_TAGS = new Set([
  "A",
  "ABBR",
  "B",
  "BDI",
  "BDO",
  "BIG",
  "CITE",
  "CODE",
  "DATA",
  "DEL",
  "DFN",
  "EM",
  "FONT",
  "I",
  "INS",
  "KBD",
  "LABEL",
  "MARK",
  "NOBR",
  "Q",
  "RP",
  "RT",
  "RUBY",
  "S",
  "SAMP",
  "SMALL",
  "SPAN",
  "STRONG",
  "SUB",
  "SUP",
  "TIME",
  "TT",
  "U",
  "VAR",
  "WBR"
]);

// Blocks already produced by the semantic collectors — never re-wrap their own text.
const ALREADY_HANDLED_BLOCK_SELECTOR = "p, li, dt, dd, figcaption, blockquote, h1, h2, h3, h4, h5, h6";

const MAX_LINK_TEXT_RATIO = 0.5;

// Recovers translatable prose that is not wrapped in its own semantic block element by
// finding containers that directly own loose inline text and splitting that text into
// run-based synthetic blocks.
export function collectInlineRunBlocks(document: Document, options: TextBlockOptions): HTMLElement[] {
  const blocks: HTMLElement[] = [];
  for (const container of findInlineTextContainers(document, options)) {
    blocks.push(...splitContainerInlineRuns(container, document, options));
  }

  return filterCandidateElements(
    blocks.filter((block) => !isLinkHeavy(block)),
    "semantic"
  );
}

function findInlineTextContainers(document: Document, options: TextBlockOptions): HTMLElement[] {
  const root = document.body ?? document.documentElement;
  /* v8 ignore next 3 -- A document without a root element has nothing to translate. */
  if (!root) {
    return [];
  }

  const seen = new Set<HTMLElement>();
  const containers: HTMLElement[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent || node.textContent.trim().length === 0) {
      continue;
    }

    const container = nearestBlockContainer(node.parentElement, options);
    if (container && !seen.has(container)) {
      seen.add(container);
      containers.push(container);
    }
  }

  return containers;
}

function nearestBlockContainer(element: HTMLElement | null, options: TextBlockOptions): HTMLElement | undefined {
  let current: HTMLElement | null = element;
  while (current && INLINE_ELEMENT_TAGS.has(current.tagName)) {
    current = current.parentElement;
  }

  if (!current) {
    return undefined;
  }

  // Semantic leaves are already extracted whole; table cells are structural and their real
  // content lives in inner blocks (so loose cell text is metadata/UI we should leave alone).
  if (current.matches(ALREADY_HANDLED_BLOCK_SELECTOR) || current.tagName === "TD" || current.tagName === "TH") {
    return undefined;
  }

  if (shouldSkipElement(current, options)) {
    return undefined;
  }

  return current;
}

// A run that is mostly link text is navigation/metadata (e.g. a comment byline), not prose.
function isLinkHeavy(element: HTMLElement): boolean {
  const text = normalizeText(element.innerText ?? element.textContent ?? "");
  if (text.length === 0) {
    return true;
  }

  const linkTextLength = Array.from(element.querySelectorAll("a")).reduce(
    (length, link) => length + normalizeText(link.textContent ?? "").length,
    0
  );
  return linkTextLength / text.length > MAX_LINK_TEXT_RATIO;
}
