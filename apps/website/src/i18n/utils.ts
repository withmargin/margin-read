// Locale helpers used by Astro components. Keep this file thin so the
// pages remain readable: `const t = useTranslations(locale)`.

import { defaultLocale, locales, ui } from "./ui";
import type { Locale, TranslationKey } from "./ui";

export type { Locale, TranslationKey };

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && (locales as readonly string[]).includes(value);
}

// Derive a locale from Astro.currentLocale (which can be undefined when
// rendering the default locale at "/"). Falls back to the configured
// defaultLocale rather than throwing — keeps unit tests / previews simple.
export function resolveLocale(input: string | undefined): Locale {
  return isLocale(input) ? input : defaultLocale;
}

export function useTranslations(input: string | undefined) {
  const locale = resolveLocale(input);
  return function t(key: TranslationKey): string {
    return ui[locale][key] ?? ui[defaultLocale][key];
  };
}
