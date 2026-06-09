import en from "../public/_locales/en/messages.json";

const messages = en as Record<string, { message: string; placeholders?: Record<string, { content: string }> }>;

// Minimal chrome.i18n stub that resolves keys against the default-locale (en) messages,
// applying named placeholders ($name$ -> content) and positional substitutions ($1, $2, ...).
export function chromeI18nMock(): { getUILanguage: () => string; getMessage: (key: string, substitutions?: string | string[]) => string } {
  return {
    getUILanguage: () => "en",
    getMessage(key, substitutions) {
      const entry = messages[key];
      if (!entry) {
        return "";
      }
      let result = entry.message;
      for (const [name, placeholder] of Object.entries(entry.placeholders ?? {})) {
        result = result.replaceAll(`$${name}$`, placeholder.content);
      }
      const list = substitutions === undefined ? [] : Array.isArray(substitutions) ? substitutions : [substitutions];
      list.forEach((value, index) => {
        result = result.replaceAll(`$${index + 1}`, value);
      });
      return result;
    }
  };
}
