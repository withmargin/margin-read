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
    syncDisplayPreview({ marker, markerInput, root, styleSelect }, "zh-TW");

    expect(root.dataset.previewStyle).toBe("card");
    expect(root.dataset.previewMarker).toBe("hidden");
    expect(marker.hidden).toBe(true);

    markerInput.checked = true;
    syncDisplayPreview({ marker, markerInput, root, styleSelect }, "zh-TW");

    expect(root.dataset.previewStyle).toBe("card");
    expect(root.dataset.previewMarker).toBe("visible");
    expect(marker.hidden).toBe(false);
    expect(marker.textContent).toBe("譯");
  });

  it("updates when the controls change", () => {
    initializeDisplayPreview("ja");

    const root = document.querySelector<HTMLElement>("#display-style-preview")!;
    const styleSelect = document.querySelector<HTMLSelectElement>('[name="displayStyle"]')!;
    const markerInput = document.querySelector<HTMLInputElement>('[name="showTranslationLabel"]')!;
    const marker = document.querySelector<HTMLElement>("#display-style-preview-marker")!;

    styleSelect.value = "focus";
    styleSelect.dispatchEvent(new Event("change"));
    markerInput.checked = true;
    markerInput.dispatchEvent(new Event("change"));

    expect(root.dataset.previewStyle).toBe("focus");
    expect(root.dataset.previewMarker).toBe("visible");
    expect(marker.textContent).toBe("翻訳");
  });
});
