import { en } from "./en";
import { zhTW } from "./zh-TW";
import type { MessageKey, OptionsLocale } from "./types";

export type { MessageDictionary, MessageKey, OptionsLocale } from "./types";
export { MESSAGE_KEYS } from "./types";

export const dictionaries = {
  en,
  "zh-TW": zhTW
} satisfies Record<OptionsLocale, Record<MessageKey, string>>;

export function detectOptionsLocale(languages: readonly string[]): OptionsLocale {
  return languages.some((language) => language.toLowerCase().startsWith("zh")) ? "zh-TW" : "en";
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
