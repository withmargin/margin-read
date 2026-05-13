import { createBlockCandidate, type BlockCandidate, type BlockCandidateSource } from "../blockCandidates";
import { isNonReadingElement, isVisibleForReading } from "../readingVisibility";
import type { TextBlockOptions } from "./types";

export const MAX_TEXT_LENGTH = 4000;
export const BR_SEPARATED_SELECTOR = "p, td, font";

type SplitDatasetKey = "marginLegacyBlock" | "marginBrSeparatedBlock";

export function isTranslatableElement(element: HTMLElement, options: TextBlockOptions): boolean {
  if (element.hasAttribute(options.translatedAttr)) {
    return false;
  }

  if (isXKeyboardShortcutsPrompt(element)) {
    return false;
  }

  if (element.closest(`.${options.translationClass}`)) {
    return false;
  }

  if (element.querySelector(`.${options.translationClass}`)) {
    return false;
  }

  if (shouldSkipElement(element, options)) {
    return false;
  }

  if (!isVisibleElement(element)) {
    return false;
  }

  const text = getNormalizedText(element);
  if (text.length < getMinimumTextLength(element, text, options)) {
    return false;
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return false;
  }

  if (element.querySelector("input, textarea, select, button")) {
    return false;
  }

  return true;
}

export function splitTextByParagraphBreaks(
  text: string,
  document: Document,
  createNode: (part: string) => ChildNode = (part) => document.createTextNode(part)
): Array<ChildNode | "paragraph-break"> {
  return text
    .split(/(\n{2,})/)
    .map((part) => (/\n{2,}/.test(part) ? "paragraph-break" : trimParagraphBoundaryBreaks(part)))
    .filter((part) => part === "paragraph-break" || part.length > 0)
    .map((part) => (part === "paragraph-break" ? part : createNode(part)));
}

export function splitTextByBrGroups(
  container: HTMLElement,
  document: Document,
  options: TextBlockOptions,
  datasetKey: SplitDatasetKey
): HTMLElement[] {
  const existingBlocks = getExistingSplitBlocks(container, datasetKey);
  if (existingBlocks.length > 0) {
    return existingBlocks.filter((element) => isTranslatableElement(element, options));
  }

  const blocks: HTMLElement[] = [];
  let currentNodes: ChildNode[] = [];
  let pendingBreaks: ChildNode[] = [];

  const flush = (): void => {
    const nodes = currentNodes;
    currentNodes = [];
    if (nodes.length === 0) {
      return;
    }

    const text = normalizeText(nodes.map((node) => getSplitNodeText(node, options)).join(" "));
    if (text.length < options.minTextLength || text.length > MAX_TEXT_LENGTH) {
      return;
    }

    const firstNode = nodes.find((node) => node.parentNode === container);
    /* v8 ignore next -- Defensive guard for DOM mutations during block splitting. */
    if (!firstNode) {
      return;
    }

    const block = document.createElement("span");
    block.dataset[datasetKey] = "true";
    container.insertBefore(block, firstNode);
    for (const node of nodes) {
      if (node.parentNode === container) {
        block.append(node);
      }
    }
    blocks.push(block);
  };

  for (const node of Array.from(container.childNodes)) {
    if (isBreakElement(node)) {
      pendingBreaks.push(node);
      if (pendingBreaks.length >= 2) {
        flush();
        pendingBreaks = [];
      }
      continue;
    }

    if (pendingBreaks.length === 1) {
      currentNodes.push(pendingBreaks[0]);
    }
    pendingBreaks = [];

    if (getSplitNodeText(node, options).trim().length > 0) {
      currentNodes.push(node);
    }
  }

  flush();
  return blocks;
}

export function isBrSeparatedContainer(element: HTMLElement, options: TextBlockOptions): boolean {
  if (!element.matches(BR_SEPARATED_SELECTOR) || shouldSkipElement(element, options)) {
    return false;
  }

  /* v8 ignore next -- Semantic selectors should not normally return nested semantic containers. */
  if (element.querySelectorAll("p, li, blockquote, h1, h2, h3").length > 0) {
    return false;
  }

  const breakCount = element.querySelectorAll("br").length;
  return breakCount >= 3 && getNormalizedText(element).length > options.minTextLength * 3;
}

export function filterCandidateElements(elements: HTMLElement[], source: BlockCandidateSource): HTMLElement[] {
  return elements.filter((element) => shouldIncludeCandidate(element, source));
}

export function createBlockCandidates(elements: HTMLElement[], source: BlockCandidateSource): BlockCandidate[] {
  return elements.map((element) => createBlockCandidate(element, source));
}

export function createIncludedBlockCandidates(
  elements: HTMLElement[],
  source: BlockCandidateSource
): BlockCandidate[] {
  const includedCandidates = createBlockCandidates(elements, source).filter((candidate) => !candidate.skipReason);
  return removeCoveredAncestorCandidates(includedCandidates);
}

export function removeCoveredAncestorCandidates(candidates: BlockCandidate[]): BlockCandidate[] {
  return candidates.filter((candidate) => !isTextFullyCoveredByDescendantCandidates(candidate, candidates));
}

export function shouldIncludeCandidate(element: HTMLElement, source: BlockCandidateSource): boolean {
  const candidate = createBlockCandidate(element, source);
  return !candidate.skipReason;
}

export function shouldSkipElement(element: HTMLElement, options: TextBlockOptions): boolean {
  return isNonReadingElement(element, options.translationClass);
}

export function isVisibleElement(element: HTMLElement): boolean {
  return isVisibleForReading(element);
}

export function getNormalizedText(element: HTMLElement): string {
  return normalizeText(element.innerText ?? element.textContent ?? "");
}

export function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function toKebabCase(value: string): string {
  return value.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);
}

function isXKeyboardShortcutsPrompt(element: HTMLElement): boolean {
  return Boolean(element.querySelector('a[href="/i/keyboard_shortcuts"]'));
}

function isTextFullyCoveredByDescendantCandidates(candidate: BlockCandidate, candidates: BlockCandidate[]): boolean {
  const descendantCandidates = candidates.filter(
    (otherCandidate) => otherCandidate !== candidate && candidate.element.contains(otherCandidate.element)
  );
  if (descendantCandidates.length === 0) {
    return false;
  }

  const descendantText = normalizeText(descendantCandidates.map((descendant) => descendant.text).join(" "));
  return descendantText === candidate.text;
}

function getMinimumTextLength(element: HTMLElement, text: string, options: TextBlockOptions): number {
  if (isHeadingElement(element) || element.matches("th")) {
    return 2;
  }
  if (element.matches("td")) {
    return 4;
  }
  if (element.matches("dt")) {
    return 2;
  }
  if (element.matches("li, dd")) {
    return 12;
  }
  if (isShortLeadInParagraph(element, text)) {
    return 2;
  }
  return options.minTextLength;
}

function isHeadingElement(element: HTMLElement): boolean {
  return element.matches("h1, h2, h3, [data-as='h1'], [data-as='h2'], [data-as='h3']");
}

function isShortLeadInParagraph(element: HTMLElement, text: string): boolean {
  return element.matches("p") && text.length <= 80 && /[:：]$/.test(text) && !element.querySelector("a");
}

function trimParagraphBoundaryBreaks(text: string): string {
  return text.replace(/^\n+|\n+$/g, "");
}

function getSplitNodeText(node: ChildNode, options: TextBlockOptions): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }

  if (node instanceof HTMLElement && !shouldSkipElement(node, options) && !node.matches("script, style, noscript")) {
    return node.innerText;
  }

  return "";
}

function getExistingSplitBlocks(container: HTMLElement, datasetKey: SplitDatasetKey): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(`[data-${toKebabCase(datasetKey)}="true"]`));
}

function isBreakElement(node: ChildNode): boolean {
  return node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === "BR";
}
