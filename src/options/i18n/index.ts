import { en } from "./en";
import { ja } from "./ja";
import { ko } from "./ko";
import { zhCN } from "./zh-CN";
import { zhTW } from "./zh-TW";
import type { MessageKey, OptionsLocale } from "./types";

export type { MessageDictionary, MessageKey, OptionsLocale } from "./types";
export { MESSAGE_KEYS } from "./types";

export const dictionaries = {
  en,
  ja,
  ko,
  "zh-CN": zhCN,
  "zh-TW": zhTW
} satisfies Record<OptionsLocale, Record<MessageKey, string>>;

export function detectOptionsLocale(languages: readonly string[]): OptionsLocale {
  for (const language of languages) {
    const normalized = language.toLowerCase();
    if (normalized === "ja" || normalized.startsWith("ja-")) {
      return "ja";
    }
    if (normalized === "ko" || normalized.startsWith("ko-")) {
      return "ko";
    }
    if (["zh-cn", "zh-sg"].some((locale) => normalized === locale || normalized.startsWith(`${locale}-`))) {
      return "zh-CN";
    }
    if (normalized === "zh" || normalized.startsWith("zh-")) {
      return "zh-TW";
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
