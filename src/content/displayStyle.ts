export type TranslationDisplayStyle = "integrated" | "highlighted";

export function getTranslationClassName(style: TranslationDisplayStyle): string {
  return `rosetta-translation rosetta-translation--${style}`;
}

export function applyIntegratedStyle(source: HTMLElement, translation: HTMLElement): void {
  const style = window.getComputedStyle(source);
  translation.style.fontFamily = style.fontFamily;
  translation.style.fontSize = scaleFontSize(style.fontSize, source.tagName);
  translation.style.fontWeight = getIntegratedFontWeight(style.fontWeight);
  translation.style.lineHeight = style.lineHeight;
  translation.style.letterSpacing = style.letterSpacing;
  translation.style.textAlign = style.textAlign;
  translation.style.color = style.color;
  translation.style.maxWidth = style.maxWidth === "none" ? "" : style.maxWidth;
}

export function scaleFontSize(fontSize: string, tagName: string): string {
  const value = Number.parseFloat(fontSize);
  if (!Number.isFinite(value)) {
    return fontSize;
  }

  const multiplier = /^H[1-3]$/.test(tagName) ? 0.52 : 0.92;
  return `${Math.max(13, Math.round(value * multiplier * 100) / 100)}px`;
}

export function getIntegratedFontWeight(fontWeight: string): string {
  const numeric = Number.parseInt(fontWeight, 10);
  if (!Number.isFinite(numeric)) {
    return fontWeight;
  }

  return String(Math.min(numeric, 500));
}
