import { beforeEach, describe, expect, it } from "vitest";
import { initializeDisplayPreview, syncDisplayPreview } from "./displayPreview";

describe("display preview", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <select name="displayStyle">
        <option value="balanced">Balanced</option>
        <option value="quiet">Quiet</option>
        <option value="focus">Focus</option>
        <option value="card">Card</option>
      </select>
      <input name="showTranslationLabel" type="checkbox" />
      <input name="targetLanguage" type="hidden" value="Traditional Chinese" />
      <div id="display-style-preview">
        <span id="display-style-preview-marker"></span>
      </div>
    `;
  });

  it("keeps display style and marker state independent", () => {
    const root = document.querySelector<HTMLElement>("#display-style-preview")!;
    const styleSelect = document.querySelector<HTMLSelectElement>('[name="displayStyle"]')!;
    const markerInput = document.querySelector<HTMLInputElement>('[name="showTranslationLabel"]')!;
    const marker = document.querySelector<HTMLElement>("#display-style-preview-marker")!;

    styleSelect.value = "card";
    markerInput.checked = false;
    const targetLanguageInput = document.querySelector<HTMLInputElement>('[name="targetLanguage"]')!;
    syncDisplayPreview({ marker, markerInput, root, styleSelect, targetLanguageInput });

    expect(root.dataset.previewStyle).toBe("card");
    expect(root.dataset.previewMarker).toBe("hidden");
    expect(marker.hidden).toBe(true);

    markerInput.checked = true;
    syncDisplayPreview({ marker, markerInput, root, styleSelect, targetLanguageInput });

    expect(root.dataset.previewStyle).toBe("card");
    expect(root.dataset.previewMarker).toBe("visible");
    expect(marker.hidden).toBe(false);
    expect(marker.textContent).toBe("譯");
  });

  it("updates from the target language instead of the UI locale", () => {
    initializeDisplayPreview();

    const root = document.querySelector<HTMLElement>("#display-style-preview")!;
    const styleSelect = document.querySelector<HTMLSelectElement>('[name="displayStyle"]')!;
    const markerInput = document.querySelector<HTMLInputElement>('[name="showTranslationLabel"]')!;
    const marker = document.querySelector<HTMLElement>("#display-style-preview-marker")!;
    const targetLanguageInput = document.querySelector<HTMLInputElement>('[name="targetLanguage"]')!;

    styleSelect.value = "focus";
    styleSelect.dispatchEvent(new Event("change"));
    markerInput.checked = true;
    markerInput.dispatchEvent(new Event("change"));

    expect(root.dataset.previewStyle).toBe("focus");
    expect(root.dataset.previewMarker).toBe("visible");
    expect(marker.textContent).toBe("譯");

    targetLanguageInput.value = "Japanese";
    targetLanguageInput.dispatchEvent(new Event("change", { bubbles: true }));

    expect(marker.textContent).toBe("翻訳");
  });
});
