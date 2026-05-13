const TRANSLATION_LABELS_BY_LOCALE = {
  de: "Uebers.",
  en: "Translation",
  es: "Trad.",
  fr: "Trad.",
  ja: "翻訳",
  ko: "번역",
  "zh-CN": "译",
  "zh-TW": "譯"
} as const;

export function getBrowserTranslationLabel(): string {
  const locale =
    typeof chrome !== "undefined" && chrome.i18n?.getUILanguage
      ? chrome.i18n.getUILanguage()
      : navigator.languages[0] ?? navigator.language;
  return getTranslationLabel(locale);
}

export function getTranslationLabel(locale: string | undefined): string {
  const normalized = (locale ?? "").toLowerCase();
  if (normalized === "zh-cn" || normalized === "zh-sg" || normalized.startsWith("zh-hans")) {
    return TRANSLATION_LABELS_BY_LOCALE["zh-CN"];
  }
  if (normalized.startsWith("zh")) {
    return TRANSLATION_LABELS_BY_LOCALE["zh-TW"];
  }

  const baseLocale = normalized.split("-")[0];
  if (baseLocale && baseLocale in TRANSLATION_LABELS_BY_LOCALE) {
    return TRANSLATION_LABELS_BY_LOCALE[baseLocale as keyof typeof TRANSLATION_LABELS_BY_LOCALE];
  }

  return TRANSLATION_LABELS_BY_LOCALE.en;
}
