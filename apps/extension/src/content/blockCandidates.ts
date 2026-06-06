import { normalizeText } from "../shared/text";
import { isAccessibilityOnlyElement, isPageChromeElement } from "./readingVisibility";

export type BlockCandidateSource = "semantic" | "archetype" | "adapter" | "legacy";
export type BlockCandidateRole =
  | "heading"
  | "paragraph"
  | "list"
  | "definition"
  | "caption"
  | "quote"
  | "table"
  | "navigation"
  | "ui";
export type BlockRenderStrategy = "integrated" | "inline" | "table-cell";
export type BlockCandidateSkipReason =
  | "empty-text"
  | "page-chrome"
  | "hidden-content"
  | "decorative-caption"
  | "interactive-content"
  | "low-content-score";

export const BLOCK_CANDIDATE_SCORES = {
  base: {
    adapter: 45,
    archetype: 45,
    legacy: 35,
    semantic: 45
  },
  context: {
    highLinkDensity: -24,
    inMainContent: 25,
    readableLength: 14
  },
  role: {
    heading: 18,
    caption: 6,
    definition: 8,
    list: 8,
    navigation: -55,
    paragraph: 16,
    quote: 16,
    table: 8,
    ui: -45
  }
} as const;

export const BLOCK_CANDIDATE_THRESHOLDS = {
  highPriorityScore: 80,
  mediumPriorityScore: 55,
  skipBelowScore: 40
} as const;

export interface BlockCandidate {
  element: HTMLElement;
  text: string;
  source: BlockCandidateSource;
  role: BlockCandidateRole;
  score: number;
  priority: number;
  renderStrategy: BlockRenderStrategy;
  skipReason?: BlockCandidateSkipReason;
}

export function createBlockCandidate(element: HTMLElement, source: BlockCandidateSource): BlockCandidate {
  const text = normalizeText(element.innerText ?? element.textContent ?? "");
  const role = inferBlockRole(element);
  const score = scoreBlockCandidate(element, text, role, source);

  return {
    element,
    text,
    source,
    role,
    score,
    priority: getCandidatePriority(score, role),
    renderStrategy: getRenderStrategy(element, role, source),
    skipReason: getCandidateSkipReason(element, text, score, role)
  };
}

export function inferBlockRole(element: HTMLElement): BlockCandidateRole {
  if (isPageChromeElement(element)) {
    return "navigation";
  }

  if (element.matches("h1, h2, h3, [data-as='h1'], [data-as='h2'], [data-as='h3']")) {
    return "heading";
  }

  if (element.matches("li")) {
    return "list";
  }

  if (element.matches("dt, dd")) {
    return "definition";
  }

  if (element.matches("figcaption")) {
    return "caption";
  }

  if (element.matches("blockquote")) {
    return "quote";
  }

  if (element.matches("td, th") || element.closest("table")) {
    return "table";
  }

  if (hasBlockingInteractiveContent(element)) {
    return "ui";
  }

  return "paragraph";
}

export function scoreBlockCandidate(
  element: HTMLElement,
  text: string,
  role: BlockCandidateRole,
  source: BlockCandidateSource
): number {
  let score = BLOCK_CANDIDATE_SCORES.base[source];

  score += BLOCK_CANDIDATE_SCORES.role[role];
  if (element.closest("main, article, [role='main']")) {
    score += BLOCK_CANDIDATE_SCORES.context.inMainContent;
  }
  if (hasReadableLength(text)) {
    score += BLOCK_CANDIDATE_SCORES.context.readableLength;
  }
  if (hasHighLinkDensity(element, text)) {
    score += BLOCK_CANDIDATE_SCORES.context.highLinkDensity;
  }

  return score;
}

export function getCandidateSkipReason(
  element: HTMLElement,
  text: string,
  score: number,
  role: BlockCandidateRole
): BlockCandidateSkipReason | undefined {
  if (text.length === 0) {
    return "empty-text";
  }

  if (isPageChromeElement(element)) {
    return "page-chrome";
  }

  if (isAccessibilityOnlyElement(element)) {
    return "hidden-content";
  }

  if (role === "caption") {
    return "decorative-caption";
  }

  if (hasBlockingInteractiveContent(element)) {
    return "interactive-content";
  }

  if (score < BLOCK_CANDIDATE_THRESHOLDS.skipBelowScore) {
    return "low-content-score";
  }

  return undefined;
}

function getCandidatePriority(score: number, role: BlockCandidateRole): number {
  if (role === "heading") {
    return 0;
  }
  if (score >= BLOCK_CANDIDATE_THRESHOLDS.highPriorityScore) {
    return 1;
  }
  if (score >= BLOCK_CANDIDATE_THRESHOLDS.mediumPriorityScore) {
    return 2;
  }
  return 3;
}

function getRenderStrategy(
  element: HTMLElement,
  role: BlockCandidateRole,
  source: BlockCandidateSource
): BlockRenderStrategy {
  // Synthetic inline-run blocks are loose prose wrapped in a span; render them as a block
  // below the run (like legacy/<br>-split blocks), never as a table cell even when nested
  // inside a table-based layout.
  if (element.dataset.marginInlineRunBlock === "true") {
    return "inline";
  }
  if (role === "table") {
    return "table-cell";
  }
  if (role === "definition" && element.matches("dt")) {
    return "inline";
  }
  if (source === "legacy") {
    return "inline";
  }
  return "integrated";
}

function hasReadableLength(text: string): boolean {
  return text.length >= 48 && text.length <= 1200;
}

// Whether an element holds interactive controls that should keep it from being treated as
// translatable prose. Form fields always count. Buttons only count when they carry their own
// text (a real control/label) — icon-only affordances such as a heading's permalink button
// carry no text and must not disqualify the surrounding prose from translation.
export function hasBlockingInteractiveContent(element: HTMLElement): boolean {
  if (element.querySelector("input, textarea, select")) {
    return true;
  }
  return Array.from(element.querySelectorAll("button")).some(
    (button) => normalizeText(button.textContent ?? "").length > 0
  );
}

function hasHighLinkDensity(element: HTMLElement, text: string): boolean {
  if (text.length === 0) {
    return false;
  }

  const linkTextLength = Array.from(element.querySelectorAll("a")).reduce(
    (length, link) => length + normalizeText(link.textContent ?? "").length,
    0
  );
  return linkTextLength / text.length > 0.55;
}

