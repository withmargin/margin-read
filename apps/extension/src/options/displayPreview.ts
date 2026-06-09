import { normalizeDisplayStyle } from "../shared/displayStyle";
import { getTranslationLabel } from "../shared/translationLabel";

export interface DisplayPreviewElements {
  marker: HTMLElement;
  markerInput: HTMLInputElement;
  root: HTMLElement;
  styleSelect: HTMLSelectElement;
  targetLanguageInput?: HTMLInputElement;
}

export function initializeDisplayPreview(): void {
  const root = document.querySelector<HTMLElement>("#display-style-preview");
  const styleSelect = document.querySelector<HTMLSelectElement>('[name="displayStyle"]');
  const markerInput = document.querySelector<HTMLInputElement>('[name="showTranslationLabel"]');
  const marker = document.querySelector<HTMLElement>("#display-style-preview-marker");
  const targetLanguageInput = document.querySelector<HTMLInputElement>('[name="targetLanguage"]');
  if (!root || !styleSelect || !markerInput || !marker) {
    return;
  }

  const elements = { marker, markerInput, root, styleSelect, targetLanguageInput: targetLanguageInput ?? undefined };
  const sync = (): void => {
    syncDisplayPreview(elements);
  };

  sync();
  styleSelect.addEventListener("change", sync);
  markerInput.addEventListener("change", sync);
  targetLanguageInput?.addEventListener("change", sync);
  targetLanguageInput?.addEventListener("input", sync);
}

export function syncDisplayPreview(elements: DisplayPreviewElements): void {
  const displayStyle = normalizeDisplayStyle(elements.styleSelect.value);
  const showMarker = elements.markerInput.checked;

  elements.root.dataset.previewStyle = displayStyle;
  elements.root.dataset.previewMarker = showMarker ? "visible" : "hidden";
  elements.marker.hidden = !showMarker;
  elements.marker.textContent = getTranslationLabel(
    elements.targetLanguageInput?.value || chrome.i18n.getUILanguage()
  );
}
