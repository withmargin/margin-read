import type { TextBlockOptions } from "./types";
import {
  filterCandidateElements,
  isBrSeparatedContainer,
  isTranslatableElement,
  shouldIncludeCandidate,
  splitTextByBrGroups
} from "./shared";

const UNIVERSAL_SEMANTIC_SELECTOR =
  "article p, article li, article dt, article dd, article figcaption, article blockquote, article h1, article h2, article h3, article td, article th, main p, main li, main dt, main dd, main figcaption, main blockquote, main h1, main h2, main h3, main td, main th, p, li, dt, dd, figcaption, blockquote, h1, h2, h3";

export function collectUniversalBlocks(document: Document, options: TextBlockOptions): HTMLElement[] {
  const blocks: HTMLElement[] = [];

  for (const element of Array.from(document.querySelectorAll<HTMLElement>(UNIVERSAL_SEMANTIC_SELECTOR))) {
    if (isBrSeparatedContainer(element, options)) {
      blocks.push(...filterCandidateElements(splitBrSeparatedContainer(element, document, options), "semantic"));
      continue;
    }

    if (isTranslatableElement(element, options) && shouldIncludeCandidate(element, "semantic")) {
      blocks.push(element);
    }
  }

  return blocks;
}

function splitBrSeparatedContainer(container: HTMLElement, document: Document, options: TextBlockOptions): HTMLElement[] {
  return splitTextByBrGroups(container, document, options, "marginBrSeparatedBlock");
}
