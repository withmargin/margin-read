import { de } from "./de";
import { en } from "./en";
import { es } from "./es";
import { fr } from "./fr";
import { ja } from "./ja";
import { ko } from "./ko";
import { zhCN } from "./zh-CN";
import { zhTW } from "./zh-TW";
import type { MessageKey, OptionsLocale } from "./types";

export type { MessageDictionary, MessageKey, OptionsLocale } from "./types";
export { MESSAGE_KEYS } from "./types";

export const dictionaries = {
  de,
  en,
  es,
  fr,
  ja,
  ko,
  "zh-CN": zhCN,
  "zh-TW": zhTW
} satisfies Record<OptionsLocale, Record<MessageKey, string>>;

export function detectOptionsLocale(languages: readonly string[]): OptionsLocale {
  for (const language of languages) {
    const normalized = language.toLowerCase();

    if (normalized === "zh-cn" || normalized === "zh-sg" || normalized.startsWith("zh-hans")) {
      return "zh-CN";
    }

    if (normalized.startsWith("zh")) {
      return "zh-TW";
    }

    const baseLanguage = normalized.split("-")[0];
    if (baseLanguage && baseLanguage in dictionaries) {
      return baseLanguage as OptionsLocale;
    }
  }

  return "en";
}

export function t(locale: OptionsLocale, key: MessageKey, values: Record<string, string | number> = {}): string {
  return Object.entries(values).reduce(
    (message, [name, value]) => message.replaceAll(`{${name}}`, String(value)),
    dictionaries[locale][key]
  );
}

export function applyOptionsI18n(locale: OptionsLocale, root: ParentNode = document): void {
  document.documentElement.lang = locale;
  document.title = t(locale, "title");

  root.querySelectorAll<HTMLElement>("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n as MessageKey | undefined;
    if (key) {
      element.textContent = t(locale, key);
    }
  });
}
