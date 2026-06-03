import { countCodePoints } from "../../shared/text";
import type { TextBlockOptions } from "./types";
import {
  filterCandidateElements,
  getBaseMinimumTextLength,
  getNormalizedText,
  isTranslatableElement,
  shouldSkipElement,
  splitTextByBrGroups
} from "./shared";

const LEGACY_SELECTOR = "td, font, body";

export function collectLegacyBlocks(document: Document, options: TextBlockOptions): HTMLElement[] {
  const containers = Array.from(document.querySelectorAll<HTMLElement>(LEGACY_SELECTOR))
    .filter((element) => isLegacyContainer(element, options))
    .sort((left, right) => getNormalizedText(right).length - getNormalizedText(left).length);

  const container = containers[0];
  if (!container) {
    return [];
  }

  const blocks = splitLegacyContainer(container, document, options);
  return filterCandidateElements(
    blocks.filter((element) => isTranslatableElement(element, options)),
    "legacy"
  );
}

function splitLegacyContainer(container: HTMLElement, document: Document, options: TextBlockOptions): HTMLElement[] {
  return splitTextByBrGroups(container, document, options, "marginLegacyBlock");
}

function isLegacyContainer(element: HTMLElement, options: TextBlockOptions): boolean {
  if (shouldSkipElement(element, options)) {
    return false;
  }

  const text = getNormalizedText(element);
  if (countCodePoints(text) < getBaseMinimumTextLength(text, options) * 3) {
    return false;
  }

  if (hasNestedLegacyCandidate(element, text.length, options)) {
    return false;
  }

  return element.querySelectorAll("p, li, blockquote, h1, h2, h3").length === 0;
}

function hasNestedLegacyCandidate(element: HTMLElement, textLength: number, options: TextBlockOptions): boolean {
  return Array.from(element.querySelectorAll<HTMLElement>("td, font")).some((child) => {
    if (child === element || shouldSkipElement(child, options)) {
      return false;
    }
    return getNormalizedText(child).length >= textLength * 0.8;
  });
}
