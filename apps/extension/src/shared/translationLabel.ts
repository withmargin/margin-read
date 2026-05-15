const TRANSLATION_LABELS_BY_LOCALE = {
  ar: "ترجمة",
  cs: "Překl.",
  da: "Overs.",
  de: "Uebers.",
  en: "Translation",
  es: "Trad.",
  fi: "Käännös",
  fr: "Trad.",
  he: "תרגום",
  hi: "अनुवाद",
  hu: "Ford.",
  id: "Terj.",
  it: "Trad.",
  ja: "翻訳",
  ko: "번역",
  ms: "Terj.",
  nl: "Vert.",
  no: "Overs.",
  pl: "Tłum.",
  "pt-BR": "Trad.",
  "pt-PT": "Trad.",
  ro: "Trad.",
  ru: "Пер.",
  sv: "Övers.",
  th: "แปล",
  tr: "Çev.",
  uk: "Пер.",
  vi: "Dịch",
  "zh-CN": "译",
  "zh-TW": "譯"
} as const;

const LOCALE_BY_TARGET_LANGUAGE = {
  arabic: "ar",
  "brazilian portuguese": "pt-BR",
  chinese: "zh-TW",
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
  portuguese: "pt-PT",
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

export function getBrowserTranslationLabel(): string {
  const locale =
    typeof chrome !== "undefined" && chrome.i18n?.getUILanguage
      ? chrome.i18n.getUILanguage()
      : navigator.languages[0] ?? navigator.language;
  return getTranslationLabel(locale);
}

export function getTranslationLabel(languageOrLocale: string | undefined): string {
  const raw = languageOrLocale ?? "";
  const normalized = raw.toLowerCase().trim();
  const searchKey = normalizeLanguageKey(raw);
  if (
    normalized === "zh-cn" ||
    normalized === "zh-sg" ||
    normalized.startsWith("zh-hans") ||
    searchKey === "simplified chinese" ||
    /简体|简中/.test(raw)
  ) {
    return TRANSLATION_LABELS_BY_LOCALE["zh-CN"];
  }
  if (
    normalized.startsWith("zh") ||
    searchKey === "traditional chinese" ||
    searchKey === "chinese" ||
    /繁體|繁中|中文/.test(raw)
  ) {
    return TRANSLATION_LABELS_BY_LOCALE["zh-TW"];
  }
  if (searchKey === "brazilian portuguese") {
    return TRANSLATION_LABELS_BY_LOCALE["pt-BR"];
  }
  if (searchKey === "european portuguese") {
    return TRANSLATION_LABELS_BY_LOCALE["pt-PT"];
  }
  if (/日本語|日文/.test(raw)) {
    return TRANSLATION_LABELS_BY_LOCALE.ja;
  }
  if (/韓文|韩文|한국어|한글/.test(raw)) {
    return TRANSLATION_LABELS_BY_LOCALE.ko;
  }

  const targetLocale = LOCALE_BY_TARGET_LANGUAGE[searchKey as keyof typeof LOCALE_BY_TARGET_LANGUAGE];
  const targetLabel = getLabelForLocale(targetLocale);
  if (targetLabel) {
    return targetLabel;
  }

  const localeLabel = getLabelForLocale(normalized);
  if (localeLabel) {
    return localeLabel;
  }

  const baseLocale = normalized.split("-")[0] ?? "";
  const baseLabel = getLabelForLocale(baseLocale);
  if (baseLabel) {
    return baseLabel;
  }

  return TRANSLATION_LABELS_BY_LOCALE.en;
}

function getLabelForLocale(locale: string | undefined): string | undefined {
  if (!locale) {
    return undefined;
  }
  const normalizedLocale = locale.toLowerCase();
  const match = Object.entries(TRANSLATION_LABELS_BY_LOCALE).find(([key]) => key.toLowerCase() === normalizedLocale);
  return match?.[1];
}

function normalizeLanguageKey(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}
