export type TranslationDisplayStyle = "integrated" | "highlighted";

export interface IntegratedStyleTokens {
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
  textAlign: string;
  color: string;
  maxWidth: string;
  marginTop: string;
  marginBottom: string;
}

export function getTranslationClassName(style: TranslationDisplayStyle): string {
  return `margin-translation margin-translation--${style}`;
}

export function applyIntegratedStyle(source: HTMLElement, translation: HTMLElement): void {
  const tokens = deriveIntegratedStyleTokens(source, window.getComputedStyle(source));
  translation.style.fontFamily = tokens.fontFamily;
  translation.style.fontSize = tokens.fontSize;
  translation.style.fontWeight = tokens.fontWeight;
  translation.style.lineHeight = tokens.lineHeight;
  translation.style.letterSpacing = tokens.letterSpacing;
  translation.style.textAlign = tokens.textAlign;
  translation.style.color = tokens.color;
  translation.style.maxWidth = tokens.maxWidth;
  translation.style.marginTop = tokens.marginTop;
  translation.style.marginBottom = tokens.marginBottom;
}

export function deriveIntegratedStyleTokens(
  source: Pick<HTMLElement, "tagName">,
  style: Pick<
    CSSStyleDeclaration,
    | "fontFamily"
    | "fontSize"
    | "fontWeight"
    | "lineHeight"
    | "letterSpacing"
    | "textAlign"
    | "color"
    | "maxWidth"
    | "marginBottom"
  >
): IntegratedStyleTokens {
  const sourceFontSize = parseCssPixels(style.fontSize) ?? 16;
  const heading = isHeading(source.tagName);
  const sourceLineHeight = getSourceLineHeightPixels(style.lineHeight, sourceFontSize, heading);

  return {
    fontFamily: style.fontFamily,
    fontSize: `${getIntegratedFontSize(sourceFontSize, source.tagName)}px`,
    fontWeight: getIntegratedFontWeight(style.fontWeight),
    lineHeight: getIntegratedLineHeight(style.lineHeight, sourceFontSize, heading),
    letterSpacing: style.letterSpacing,
    textAlign: style.textAlign,
    color: style.color,
    maxWidth: style.maxWidth === "none" ? "" : style.maxWidth,
    marginTop: getIntegratedMarginTop(style.marginBottom, sourceLineHeight, sourceFontSize, heading),
    marginBottom: getIntegratedMarginBottom(style.marginBottom, sourceLineHeight, sourceFontSize, heading)
  };
}

export function scaleFontSize(fontSize: string, tagName: string): string {
  const value = parseCssPixels(fontSize);
  if (value === undefined) {
    return fontSize;
  }

  return `${getIntegratedFontSize(value, tagName)}px`;
}

export function getIntegratedFontWeight(fontWeight: string): string {
  const numeric = Number.parseInt(fontWeight, 10);
  if (!Number.isFinite(numeric)) {
    return fontWeight;
  }

  return String(Math.min(numeric, 500));
}

export function getIntegratedFontSize(sourceFontSize: number, tagName: string): number {
  const heading = isHeading(tagName);
  const preferred = sourceFontSize * (heading ? 0.5 : 0.82);
  return roundCssNumber(clamp(preferred, heading ? 16 : 14, heading ? 32 : 20));
}

export function getIntegratedLineHeight(lineHeight: string, sourceFontSize: number, heading: boolean): string {
  if (heading) {
    return "1.25";
  }

  const lineHeightPixels = parseCssPixels(lineHeight);
  if (lineHeightPixels === undefined || sourceFontSize <= 0) {
    return "1.5";
  }

  return String(roundCssNumber(clamp(lineHeightPixels / sourceFontSize, 1.42, 1.58)));
}

export function getIntegratedMarginTop(
  sourceMarginBottom: string,
  sourceLineHeight: number,
  sourceFontSize: number,
  heading: boolean
): string {
  const marginPixels = parseCssPixels(sourceMarginBottom) ?? 0;
  const desiredGapPixels = sourceLineHeight * (heading ? 0.14 : 0.22);
  const marginTopPixels = Math.max(desiredGapPixels - marginPixels, marginPixels > 0 ? -marginPixels + 4 : 0);
  return `${roundCssNumber(marginTopPixels / sourceFontSize)}em`;
}

export function getIntegratedMarginBottom(
  marginBottom: string,
  sourceLineHeight: number,
  sourceFontSize: number,
  heading = false
): string {
  const marginPixels = parseCssPixels(marginBottom);
  if (marginPixels === undefined || sourceFontSize <= 0 || sourceLineHeight <= 0) {
    return heading ? "0.45em" : "0.8em";
  }

  const fallbackRhythm = (sourceLineHeight * (heading ? 0.45 : 0.8)) / sourceFontSize;
  const sourceRhythm = marginPixels / sourceFontSize;
  const maxRhythm = heading ? 0.9 : 1.8;
  return `${roundCssNumber(clamp(Math.max(sourceRhythm, fallbackRhythm), heading ? 0.35 : 0.75, maxRhythm))}em`;
}

function isHeading(tagName: string): boolean {
  return /^H[1-3]$/.test(tagName);
}

function parseCssPixels(value: string): number | undefined {
  if (!value.endsWith("px")) {
    return undefined;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getSourceLineHeightPixels(lineHeight: string, sourceFontSize: number, heading: boolean): number {
  const lineHeightPixels = parseCssPixels(lineHeight);
  if (lineHeightPixels !== undefined) {
    return lineHeightPixels;
  }

  return sourceFontSize * (heading ? 1.25 : 1.5);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function roundCssNumber(value: number): number {
  return Math.round(value * 100) / 100;
}
