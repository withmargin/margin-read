import { beforeEach, describe, expect, it } from "vitest";
import { initializeLanguageSelect } from "./languageSelect";
import { LANGUAGE_OPTIONS } from "./languages";

describe("language select", () => {
  let input: HTMLInputElement;
  let hiddenInput: HTMLInputElement;
  let listbox: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = `
      <span class="language-combobox">
        <input id="target-language-combobox" />
        <input name="targetLanguage" type="hidden" />
        <span id="target-language-listbox" hidden></span>
      </span>
    `;
    input = document.querySelector<HTMLInputElement>("#target-language-combobox")!;
    hiddenInput = document.querySelector<HTMLInputElement>("[name='targetLanguage']")!;
    listbox = document.querySelector<HTMLElement>("#target-language-listbox")!;
  });

  it("shows the full option list when opening a selected language", () => {
    initializeLanguageSelect({ input, hiddenInput, listbox }, "Traditional Chinese");

    input.dispatchEvent(new FocusEvent("focus"));

    expect(listbox.hidden).toBe(false);
    expect(listbox.children).toHaveLength(8);
    expect(listbox.children[0]?.textContent).toContain(LANGUAGE_OPTIONS[0]?.name);
  });

  it("filters options only after the user types", () => {
    initializeLanguageSelect({ input, hiddenInput, listbox }, "Traditional Chinese");

    input.value = "jap";
    input.dispatchEvent(new InputEvent("input"));

    const optionText = Array.from(listbox.children, (element) => element.textContent ?? "");
    expect(optionText).toEqual(
      expect.arrayContaining([expect.stringContaining("Japanese")])
    );
    expect(optionText).not.toEqual(
      expect.arrayContaining([expect.stringContaining("Traditional Chinese")])
    );
  });
});
