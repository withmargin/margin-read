import { normalizeDisplayStyle } from "../shared/displayStyle";
import type { DisplayStyle, ModernDisplayStyle } from "../shared/types";

export type TranslationDisplayStyle = DisplayStyle;

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

const LANGUAGE_CODE_BY_TARGET = {
  arabic: "ar",
  "brazilian portuguese": "pt-BR",
  chinese: "zh",
  czech: "cs",
  danish: "da",
  dutch: "nl",
  english: "en",
  "european portuguese": "pt-PT",
  finnish: "fi",
  french: "fr",
  german: "de",
  hebrew: "he",
  hindi: "hi",
  indonesian: "id",
  italian: "it",
  japanese: "ja",
  korean: "ko",
  malay: "ms",
  norwegian: "no",
  polish: "pl",
  romanian: "ro",
  russian: "ru",
  "simplified chinese": "zh-CN",
  spanish: "es",
  swedish: "sv",
  thai: "th",
  "traditional chinese": "zh-TW",
  turkish: "tr",
  ukrainian: "uk",
  vietnamese: "vi"
} as const;

export function getTranslationClassName(style: TranslationDisplayStyle): string {
  return `margin-translation margin-translation--${normalizeDisplayStyle(style)}`;
}

export function applyTranslationDisplayStyle(
  source: HTMLElement,
  translation: HTMLElement,
  style: TranslationDisplayStyle
): void {
  const computedStyle = window.getComputedStyle(source);
  const tokens = deriveIntegratedStyleTokens(source, computedStyle);
  applyStyleTokens(translation, tokens);
  applyDisplayModeTypography(source, translation, computedStyle, normalizeDisplayStyle(style));
}

export function applyIntegratedStyle(source: HTMLElement, translation: HTMLElement): void {
  const tokens = deriveIntegratedStyleTokens(source, window.getComputedStyle(source));
  applyStyleTokens(translation, tokens);
}

function applyStyleTokens(translation: HTMLElement, tokens: IntegratedStyleTokens): void {
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

function applyDisplayModeTypography(
  source: HTMLElement,
  translation: HTMLElement,
  style: Pick<CSSStyleDeclaration, "fontSize" | "fontWeight">,
  displayStyle: ModernDisplayStyle
): void {
  if (displayStyle !== "focus") {
    return;
  }

  const sourceFontSize = parseCssPixels(style.fontSize) ?? 16;
  translation.style.fontSize = `${getFocusFontSize(sourceFontSize, source.tagName)}px`;
  translation.style.fontWeight = getFocusFontWeight(style.fontWeight);
}

export function applyLanguageTypography(translation: HTMLElement, targetLanguage: string): void {
  const languageCode = resolveTargetLanguageCode(targetLanguage);
  translation.lang = languageCode;
  translation.dir = "auto";

  if (!isCjkTargetLanguage(targetLanguage, languageCode)) {
    return;
  }

  translation.style.setProperty("text-autospace", "normal");
  translation.style.setProperty("line-break", "auto");
  translation.style.setProperty("word-break", getCjkWordBreak(languageCode));
  translation.style.setProperty("overflow-wrap", "anywhere");
  translation.style.setProperty("font-kerning", "normal");
  translation.style.setProperty("letter-spacing", "0px");

  if (supportsCss("text-spacing-trim: normal")) {
    translation.style.setProperty("text-spacing-trim", "normal");
  }
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

  return String(clamp(numeric, 400, 500));
}

export function getIntegratedFontSize(sourceFontSize: number, tagName: string): number {
  const heading = isHeading(tagName);
  const preferred = sourceFontSize * (heading ? 0.5 : 0.82);
  return roundCssNumber(clamp(preferred, heading ? 16 : 14, heading ? 32 : 20));
}

export function getFocusFontSize(sourceFontSize: number, tagName: string): number {
  const heading = isHeading(tagName);
  const preferred = sourceFontSize * (heading ? 0.58 : 0.9);
  return roundCssNumber(clamp(preferred, heading ? 17 : 15, heading ? 34 : 22));
}

export function getFocusFontWeight(fontWeight: string): string {
  const numeric = Number.parseInt(fontWeight, 10);
  if (!Number.isFinite(numeric)) {
    return fontWeight;
  }

  return String(clamp(numeric, 450, 600));
}

export function getIntegratedLineHeight(lineHeight: string, sourceFontSize: number, heading: boolean): string {
  if (heading) {
    return "1.25";
  }

  const lineHeightPixels = parseCssPixels(lineHeight);
  if (lineHeightPixels === undefined || sourceFontSize <= 0) {
    return "1.5";
  }

  return String(roundCssNumber(clamp(lineHeightPixels / sourceFontSize, 1.42, 1.78)));
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

function resolveTargetLanguageCode(targetLanguage: string): string {
  const trimmed = targetLanguage.trim();
  const normalized = normalizeLanguageKey(trimmed);
  const knownCode = LANGUAGE_CODE_BY_TARGET[normalized as keyof typeof LANGUAGE_CODE_BY_TARGET];
  if (knownCode) {
    return knownCode;
  }

  if (/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(trimmed)) {
    return normalizeLanguageCode(trimmed);
  }

  if (/繁體|繁中/.test(trimmed)) {
    return "zh-TW";
  }
  if (/简体|简中/.test(trimmed)) {
    return "zh-CN";
  }
  if (/中文/.test(trimmed)) {
    return "zh";
  }
  if (/日本語|日文/.test(trimmed)) {
    return "ja";
  }
  if (/韓文|韩文|한국어|한글/.test(trimmed)) {
    return "ko";
  }

  if (normalized.includes("traditional") && normalized.includes("chinese")) {
    return "zh-TW";
  }
  if (normalized.includes("simplified") && normalized.includes("chinese")) {
    return "zh-CN";
  }
  if (normalized.includes("chinese")) {
    return "zh";
  }
  if (normalized.includes("japanese")) {
    return "ja";
  }
  if (normalized.includes("korean")) {
    return "ko";
  }

  return trimmed || "und";
}

function isCjkTargetLanguage(targetLanguage: string, languageCode: string): boolean {
  if (/^(zh|ja|ko)(?:-|$)/i.test(languageCode)) {
    return true;
  }
  return /中文|繁體|繁中|简体|简中|日本語|日文|韓文|韩文|한국어|한글/.test(targetLanguage);
}

function getCjkWordBreak(languageCode: string): string {
  if (/^ko(?:-|$)/i.test(languageCode)) {
    return "keep-all";
  }
  if (/^ja(?:-|$)/i.test(languageCode) && supportsCss("word-break: auto-phrase")) {
    return "auto-phrase";
  }
  return "normal";
}

function normalizeLanguageKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeLanguageCode(value: string): string {
  const [base, ...rest] = value.split("-");
  return [base?.toLowerCase(), ...rest.map((part) => part.toUpperCase())].filter(Boolean).join("-");
}

function supportsCss(declaration: string): boolean {
  return typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports(declaration);
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
