import {
  countCodePoints,
  hasCjkSentenceTerminator,
  isCjkDominantText,
  isCjkQuotedText,
  normalizeText
} from "../../shared/text";
import { createBlockCandidate, type BlockCandidate, type BlockCandidateSource } from "../blockCandidates";
import { isNonReadingElement, isVisibleForReading } from "../readingVisibility";
import type { TextBlockOptions } from "./types";

export const MAX_TEXT_LENGTH = 4000;
export const BR_SEPARATED_SELECTOR = "p, td, font";

// A CJK character is roughly a whole morpheme, so the Latin-tuned minimum (typically 24)
// is ~3x too high for CJK and drops legitimate short lines (e.g. novel dialogue).
// These are the CJK-content equivalents.
export const CJK_MIN_TEXT_LENGTH = 6;
// With a sentence terminator the line is provably a complete utterance, so allow it even
// shorter (e.g. "やめて。"). Short UI labels almost never carry terminal punctuation.
export const CJK_MIN_TEXT_LENGTH_WITH_TERMINATOR = 2;

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
  const lengthText = getLengthMeasuringText(element, text);
  if (countCodePoints(lengthText) < getMinimumTextLength(element, lengthText, options)) {
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
    if (countCodePoints(text) < getMinimumTextLengthForText(text, options) || text.length > MAX_TEXT_LENGTH) {
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
  const text = getNormalizedText(element);
  return breakCount >= 3 && countCodePoints(text) > getBaseMinimumTextLength(text, options) * 3;
}

export function filterCandidateElements(elements: HTMLElement[], source: BlockCandidateSource): HTMLElement[] {
  return elements.filter((element) => shouldIncludeCandidate(element, source));
}

export function createBlockCandidates(elements: HTMLElement[], source: BlockCandidateSource): BlockCandidate[] {
  return elements.map((element) => createBlockCandidate(element, source));
}

export function createIncludedBlockCandidates(
  elements: HTMLElement[],
  source: BlockCandidateSource,
  options: TextBlockOptions
): BlockCandidate[] {
  const includedCandidates = createBlockCandidates(elements, source).filter((candidate) => !candidate.skipReason);
  return removeCoveredAncestorCandidates(includedCandidates, options);
}

export function removeCoveredAncestorCandidates(
  candidates: BlockCandidate[],
  options: TextBlockOptions
): BlockCandidate[] {
  return candidates.filter((candidate) => !isTextFullyCoveredByDescendantCandidates(candidate, candidates, options));
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

export { normalizeText };

export function toKebabCase(value: string): string {
  return value.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);
}

function isXKeyboardShortcutsPrompt(element: HTMLElement): boolean {
  return Boolean(element.querySelector('a[href="/i/keyboard_shortcuts"]'));
}

function isTextFullyCoveredByDescendantCandidates(
  candidate: BlockCandidate,
  candidates: BlockCandidate[],
  options: TextBlockOptions
): boolean {
  const descendantCandidates = candidates.filter(
    (otherCandidate) => otherCandidate !== candidate && candidate.element.contains(otherCandidate.element)
  );
  if (descendantCandidates.length === 0) {
    return false;
  }

  // Fast path: the descendants reproduce the parent's text exactly — it owns nothing extra.
  const descendantText = normalizeText(descendantCandidates.map((descendant) => descendant.text).join(" "));
  if (descendantText === candidate.text) {
    return true;
  }

  // Otherwise the parent is a pure wrapper only when the text it owns beyond its descendant
  // candidates is itself too short to be worth translating (e.g. a "Brian," salutation that
  // is below the minimum, so it never became its own candidate). A parent carrying real prose
  // of its own keeps a residual at or above the minimum and is preserved.
  const residual = getOwnResidualText(candidate.text, descendantCandidates);
  return countCodePoints(residual) < getMinimumTextLengthForText(residual, options);
}

// Parent text with each descendant candidate's text removed, longest first so nested
// (overlapping) descendants subtract cleanly. A descendant whose text cannot be located
// (whitespace/normalization drift) is skipped, biasing toward keeping the parent.
function getOwnResidualText(parentText: string, descendants: BlockCandidate[]): string {
  const ordered = [...descendants].sort((left, right) => right.text.length - left.text.length);
  let residual = parentText;
  for (const descendant of ordered) {
    const index = residual.indexOf(descendant.text);
    if (index === -1) {
      continue;
    }
    residual = `${residual.slice(0, index)} ${residual.slice(index + descendant.text.length)}`;
  }
  return normalizeText(residual);
}

function getMinimumTextLength(element: HTMLElement, text: string, options: TextBlockOptions): number {
  return applyCjkMinimum(text, getStructuralMinimumTextLength(element, text, options));
}

function getStructuralMinimumTextLength(element: HTMLElement, text: string, options: TextBlockOptions): number {
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

// CJK content never raises a minimum, only lowers it, so existing low per-tag thresholds win.
function applyCjkMinimum(text: string, base: number): number {
  if (!isCjkDominantText(text)) {
    return base;
  }
  // A sentence terminator or full quotation enclosure both mark a complete utterance,
  // so even very short lines (e.g. 「ちぇー」) are allowed.
  const isCompleteUtterance = hasCjkSentenceTerminator(text) || isCjkQuotedText(text);
  const cjkMinimum = isCompleteUtterance ? CJK_MIN_TEXT_LENGTH_WITH_TERMINATOR : CJK_MIN_TEXT_LENGTH;
  return Math.min(base, cjkMinimum);
}

// Length minimum for a bare text run (no owning element), used by the <br>-split path.
export function getMinimumTextLengthForText(text: string, options: TextBlockOptions): number {
  return applyCjkMinimum(text, options.minTextLength);
}

// CJK-adjusted base minimum without the sentence-terminator relaxation, for container-level
// heuristics that multiply the minimum (e.g. "container is large enough to split").
export function getBaseMinimumTextLength(text: string, options: TextBlockOptions): number {
  return isCjkDominantText(text) ? CJK_MIN_TEXT_LENGTH : options.minTextLength;
}

// Measures content length excluding furigana readings: getNormalizedText() uses innerText,
// which includes <rt>/<rp> reading text and inflates the count for ruby-annotated CJK.
function getLengthMeasuringText(element: HTMLElement, normalizedText: string): string {
  if (!element.querySelector("rt, rp")) {
    return normalizedText;
  }
  const clone = element.cloneNode(true) as HTMLElement;
  for (const reading of Array.from(clone.querySelectorAll("rt, rp"))) {
    reading.remove();
  }
  return normalizeText(clone.innerText ?? clone.textContent ?? "");
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
