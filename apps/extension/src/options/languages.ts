export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  promptName: string;
  aliases: string[];
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: "en", name: "English", nativeName: "English", promptName: "English", aliases: ["american english", "british english"] },
  { code: "zh-TW", name: "Traditional Chinese", nativeName: "繁體中文", promptName: "Traditional Chinese", aliases: ["taiwan chinese", "繁中", "中文", "chinese traditional"] },
  { code: "zh-CN", name: "Simplified Chinese", nativeName: "简体中文", promptName: "Simplified Chinese", aliases: ["mainland chinese", "简中", "中文", "chinese simplified"] },
  { code: "ja", name: "Japanese", nativeName: "日本語", promptName: "Japanese", aliases: ["nihongo", "日文"] },
  { code: "ko", name: "Korean", nativeName: "한국어", promptName: "Korean", aliases: ["hangul", "韓文"] },
  { code: "es", name: "Spanish", nativeName: "Español", promptName: "Spanish", aliases: ["espanol", "castilian"] },
  { code: "fr", name: "French", nativeName: "Français", promptName: "French", aliases: ["francais"] },
  { code: "de", name: "German", nativeName: "Deutsch", promptName: "German", aliases: ["deutsch"] },
  { code: "it", name: "Italian", nativeName: "Italiano", promptName: "Italian", aliases: ["italiano"] },
  { code: "pt-BR", name: "Brazilian Portuguese", nativeName: "Português do Brasil", promptName: "Brazilian Portuguese", aliases: ["portuguese", "brazil portuguese", "portugues"] },
  { code: "pt-PT", name: "European Portuguese", nativeName: "Português", promptName: "European Portuguese", aliases: ["portuguese portugal", "portugues"] },
  { code: "nl", name: "Dutch", nativeName: "Nederlands", promptName: "Dutch", aliases: ["nederlands"] },
  { code: "sv", name: "Swedish", nativeName: "Svenska", promptName: "Swedish", aliases: ["svenska"] },
  { code: "da", name: "Danish", nativeName: "Dansk", promptName: "Danish", aliases: ["dansk"] },
  { code: "no", name: "Norwegian", nativeName: "Norsk", promptName: "Norwegian", aliases: ["norsk"] },
  { code: "fi", name: "Finnish", nativeName: "Suomi", promptName: "Finnish", aliases: ["suomi"] },
  { code: "pl", name: "Polish", nativeName: "Polski", promptName: "Polish", aliases: ["polski"] },
  { code: "cs", name: "Czech", nativeName: "Čeština", promptName: "Czech", aliases: ["cestina"] },
  { code: "hu", name: "Hungarian", nativeName: "Magyar", promptName: "Hungarian", aliases: ["magyar"] },
  { code: "ro", name: "Romanian", nativeName: "Română", promptName: "Romanian", aliases: ["romana"] },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", promptName: "Turkish", aliases: ["turkce"] },
  { code: "uk", name: "Ukrainian", nativeName: "Українська", promptName: "Ukrainian", aliases: ["ukrainian"] },
  { code: "ru", name: "Russian", nativeName: "Русский", promptName: "Russian", aliases: ["russian"] },
  { code: "ar", name: "Arabic", nativeName: "العربية", promptName: "Arabic", aliases: ["arabic"] },
  { code: "he", name: "Hebrew", nativeName: "עברית", promptName: "Hebrew", aliases: ["hebrew"] },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", promptName: "Hindi", aliases: ["hindi"] },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", promptName: "Indonesian", aliases: ["bahasa"] },
  { code: "ms", name: "Malay", nativeName: "Bahasa Melayu", promptName: "Malay", aliases: ["malay"] },
  { code: "th", name: "Thai", nativeName: "ไทย", promptName: "Thai", aliases: ["thai"] },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", promptName: "Vietnamese", aliases: ["vietnamese"] }
];

const DEFAULT_LANGUAGE = LANGUAGE_OPTIONS[0];

export function filterLanguageOptions(query: string, options = LANGUAGE_OPTIONS): LanguageOption[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return options;
  }

  return options.filter((option) =>
    [option.code, option.name, option.nativeName, option.promptName, ...option.aliases]
      .map(normalizeSearchText)
      .some((value) => value.includes(normalizedQuery))
  );
}

export function formatLanguageOption(option: LanguageOption): string {
  return option.nativeName === option.name ? option.name : `${option.nativeName} / ${option.name}`;
}

export function findLanguageOption(value: string, options = LANGUAGE_OPTIONS): LanguageOption | undefined {
  const normalizedValue = normalizeSearchText(value);
  return options.find((option) =>
    [option.code, option.name, option.nativeName, option.promptName, ...option.aliases]
      .map(normalizeSearchText)
      .includes(normalizedValue)
  );
}

export function getPreferredLanguageOption(browserLanguages: readonly string[], options = LANGUAGE_OPTIONS): LanguageOption {
  for (const language of browserLanguages) {
    const exact = options.find((option) => option.code.toLowerCase() === language.toLowerCase());
    if (exact) {
      return exact;
    }

    const base = language.split("-")[0]?.toLowerCase();
    const match = options.find((option) => option.code.split("-")[0]?.toLowerCase() === base);
    if (match) {
      return match;
    }
  }

  return DEFAULT_LANGUAGE;
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}
