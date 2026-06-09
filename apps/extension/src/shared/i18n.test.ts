import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { chromeI18nMock } from "../../test/chromeI18n";
import { applyI18n, msg } from "./i18n";

const localesDir = join(process.cwd(), "public/_locales");
const locales = readdirSync(localesDir);

function readMessages(locale: string): Record<string, { message: string }> {
  return JSON.parse(readFileSync(join(localesDir, locale, "messages.json"), "utf8")) as Record<
    string,
    { message: string }
  >;
}

describe("_locales parity", () => {
  const englishKeys = Object.keys(readMessages("en")).sort();

  it("ships the expected locales with en as the default", () => {
    expect(locales).toContain("en");
    expect(locales.sort()).toEqual(["de", "en", "es", "fr", "ja", "ko", "zh_CN", "zh_TW"]);
  });

  it("keeps every locale complete and non-empty", () => {
    for (const locale of locales) {
      const messages = readMessages(locale);
      expect(Object.keys(messages).sort(), `${locale} keys`).toEqual(englishKeys);
      for (const [key, entry] of Object.entries(messages)) {
        expect(entry.message.trim(), `${locale}.${key}`).not.toBe("");
      }
    }
  });
});

describe("i18n wrapper", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves keys and applies positional substitutions", () => {
    vi.stubGlobal("chrome", { i18n: chromeI18nMock() });

    expect(msg("popupDisable")).toBe("Disable on this page");
    expect(msg("statusLoadedModels", ["4"])).toBe("Loaded 4 models.");
  });

  it("localizes data-i18n elements and sets the document language", () => {
    vi.stubGlobal("chrome", { i18n: chromeI18nMock() });
    document.body.innerHTML = `<button data-i18n="popupTranslate">x</button><span data-i18n="popupOptions">y</span>`;

    applyI18n();

    expect(document.documentElement.lang).toBe("en");
    expect(document.querySelector("button")?.textContent).toBe("Translate this page");
    expect(document.querySelector("span")?.textContent).toBe("Options");
  });
});
