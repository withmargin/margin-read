import { isLegacySplitBlock } from "./translationRenderer";

export type TranslationLayoutStrategy = "inherit-text" | "mirror-block" | "legacy-inline";

export interface LayoutSnapshot {
  sourceRect: DOMRectReadOnly;
  parentRect?: DOMRectReadOnly;
  sourceStyle: Pick<
    CSSStyleDeclaration,
    | "alignSelf"
    | "boxSizing"
    | "display"
    | "marginLeft"
    | "marginRight"
    | "maxWidth"
    | "width"
  >;
  parentStyle?: Pick<CSSStyleDeclaration, "display" | "flexDirection">;
}

const BLOCK_DISPLAY_PATTERN = /^(block|flex|grid|list-item|flow-root)$/;
const MIN_CENTERING_MARGIN_PX = 24;
const NARROW_PARENT_RATIO = 0.9;

export function classifyTranslationLayout(source: HTMLElement): TranslationLayoutStrategy {
  if (isLegacySplitBlock(source)) {
    return "legacy-inline";
  }

  const snapshot = getLayoutSnapshot(source);
  if (shouldMirrorBlockLayout(snapshot)) {
    return "mirror-block";
  }

  return "inherit-text";
}

export function applyTranslationLayout(source: HTMLElement, translation: HTMLElement): void {
  const strategy = classifyTranslationLayout(source);
  translation.dataset.marginLayout = strategy;

  if (strategy === "mirror-block") {
    mirrorBlockLayout(source, translation);
  }
}

export function shouldMirrorBlockLayout(snapshot: LayoutSnapshot): boolean {
  if (!BLOCK_DISPLAY_PATTERN.test(snapshot.sourceStyle.display)) {
    return false;
  }

  if (!snapshot.parentRect || snapshot.parentRect.width <= 0 || snapshot.sourceRect.width <= 0) {
    return false;
  }

  if (snapshot.sourceRect.width >= snapshot.parentRect.width * NARROW_PARENT_RATIO) {
    return false;
  }

  return (
    parseCssPixels(snapshot.sourceStyle.marginLeft) >= MIN_CENTERING_MARGIN_PX ||
    parseCssPixels(snapshot.sourceStyle.marginRight) >= MIN_CENTERING_MARGIN_PX
  );
}

function mirrorBlockLayout(source: HTMLElement, translation: HTMLElement): void {
  const sourceStyle = window.getComputedStyle(source);
  translation.style.boxSizing = sourceStyle.boxSizing;
  translation.style.width = sourceStyle.width;
  translation.style.maxWidth = sourceStyle.maxWidth === "none" ? "" : sourceStyle.maxWidth;
  translation.style.marginLeft = sourceStyle.marginLeft;
  translation.style.marginRight = sourceStyle.marginRight;
  translation.style.alignSelf = sourceStyle.alignSelf;
}

function getLayoutSnapshot(source: HTMLElement): LayoutSnapshot {
  return {
    sourceRect: source.getBoundingClientRect(),
    parentRect: source.parentElement?.getBoundingClientRect(),
    sourceStyle: window.getComputedStyle(source),
    parentStyle: source.parentElement ? window.getComputedStyle(source.parentElement) : undefined
  };
}

function parseCssPixels(value: string): number {
  if (!value.endsWith("px")) {
    return 0;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
