// chrome.i18n wrapper. Messages live in public/_locales/<locale>/messages.json and are
// resolved at runtime against the browser UI language. MessageKey is derived from the
// default-locale file at compile time (type-only import — nothing is bundled), so calls
// to msg() are checked against the real set of keys.
// Type-only import of the default-locale messages to derive the key union without bundling
// the JSON into the runtime.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type Messages = typeof import("../../public/_locales/en/messages.json");
export type MessageKey = keyof Messages;

export function msg(key: MessageKey, substitutions?: string | string[]): string {
  return chrome.i18n.getMessage(key, substitutions);
}

// Localizes every element carrying a data-i18n="<key>" attribute and sets the document
// language. Used by the popup and options pages.
export function applyI18n(root: ParentNode = document): void {
  document.documentElement.lang = chrome.i18n.getUILanguage();
  root.querySelectorAll<HTMLElement>("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    if (!key) {
      return;
    }
    const text = chrome.i18n.getMessage(key);
    if (text) {
      element.textContent = text;
    }
  });
}
