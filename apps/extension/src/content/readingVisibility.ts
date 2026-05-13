const PAGE_CHROME_SELECTOR =
  "body > header, nav, footer, aside, [role='navigation'], [role='banner'], [role='contentinfo']";

const NON_READING_SELECTOR =
  "form, button, pre, code, script, style, noscript, svg, canvas, textarea, select, [aria-hidden='true'], [hidden]";

const ACCESSIBILITY_ONLY_SELECTOR = "[data-agent-docs-index='true']";

const ACCESSIBILITY_ONLY_CLASSES = [
  "sr-only",
  "visually-hidden",
  "visuallyhidden",
  "screen-reader-text",
  "screenreader",
  "a11y-only",
  "a11y-sr-only",
  "assistive-text",
  "u-sr-only"
];

export function isPageChromeElement(element: HTMLElement): boolean {
  return Boolean(element.closest(PAGE_CHROME_SELECTOR));
}

export function isNonReadingElement(element: HTMLElement, translationClass: string): boolean {
  return Boolean(
    element.closest(
      `${PAGE_CHROME_SELECTOR}, ${NON_READING_SELECTOR}, .${translationClass}, ${ACCESSIBILITY_ONLY_SELECTOR}`
    ) || hasAccessibilityOnlyAncestor(element)
  );
}

export function isVisibleForReading(element: HTMLElement): boolean {
  if (hasAccessibilityOnlyAncestor(element) || hasVisuallyHiddenStyleAncestor(element)) {
    return false;
  }

  const style = window.getComputedStyle(element);
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    Number(style.opacity) !== 0 &&
    element.offsetParent !== null
  );
}

export function isAccessibilityOnlyElement(element: HTMLElement): boolean {
  return Boolean(element.closest(ACCESSIBILITY_ONLY_SELECTOR) || hasAccessibilityOnlyAncestor(element));
}

function hasAccessibilityOnlyAncestor(element: HTMLElement): boolean {
  let current: HTMLElement | null = element;
  while (current) {
    if (hasAccessibilityOnlyClass(current)) {
      return true;
    }
    current = current.parentElement;
  }
  return false;
}

function hasAccessibilityOnlyClass(element: HTMLElement): boolean {
  if (element.classList.contains("not-sr-only")) {
    return false;
  }
  return ACCESSIBILITY_ONLY_CLASSES.some((className) => element.classList.contains(className));
}

function hasVisuallyHiddenStyleAncestor(element: HTMLElement): boolean {
  let current: HTMLElement | null = element;
  while (current) {
    if (hasVisuallyHiddenStyle(window.getComputedStyle(current))) {
      return true;
    }
    current = current.parentElement;
  }
  return false;
}

function hasVisuallyHiddenStyle(style: CSSStyleDeclaration): boolean {
  if (style.position !== "absolute" && style.position !== "fixed") {
    return false;
  }

  if (isFarOffscreen(style.left) || isFarOffscreen(style.top)) {
    return true;
  }

  if (isClipped(style.clip, style.clipPath) && isTinyBox(style.width, style.height)) {
    return true;
  }

  return style.overflow === "hidden" && isTinyBox(style.width, style.height);
}

function isFarOffscreen(value: string | undefined): boolean {
  const pixels = parseCssPixels(value);
  return pixels !== undefined && pixels <= -1000;
}

function isClipped(clip: string | undefined, clipPath: string | undefined): boolean {
  return (
    (clip !== undefined && clip.length > 0 && clip !== "auto") ||
    (clipPath !== undefined && clipPath.length > 0 && clipPath !== "none")
  );
}

function isTinyBox(width: string | undefined, height: string | undefined): boolean {
  const parsedWidth = parseCssPixels(width);
  const parsedHeight = parseCssPixels(height);
  return parsedWidth !== undefined && parsedHeight !== undefined && parsedWidth <= 2 && parsedHeight <= 2;
}

function parseCssPixels(value: string | undefined): number | undefined {
  if (value === undefined || !value.endsWith("px")) {
    return undefined;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
