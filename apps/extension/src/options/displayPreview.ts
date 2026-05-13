import { normalizeDisplayStyle } from "../shared/displayStyle";
import { getTranslationLabel } from "../shared/translationLabel";
import type { OptionsLocale } from "./i18n";

export interface DisplayPreviewElements {
  marker: HTMLElement;
  markerInput: HTMLInputElement;
  root: HTMLElement;
  styleSelect: HTMLSelectElement;
}

export function initializeDisplayPreview(locale: OptionsLocale): void {
  const root = document.querySelector<HTMLElement>("#display-style-preview");
  const styleSelect = document.querySelector<HTMLSelectElement>('[name="displayStyle"]');
  const markerInput = document.querySelector<HTMLInputElement>('[name="showTranslationLabel"]');
  const marker = document.querySelector<HTMLElement>("#display-style-preview-marker");
  if (!root || !styleSelect || !markerInput || !marker) {
    return;
  }

  const elements = { marker, markerInput, root, styleSelect };
  const sync = (): void => {
    syncDisplayPreview(elements, locale);
  };

  sync();
  styleSelect.addEventListener("change", sync);
  markerInput.addEventListener("change", sync);
}

export function syncDisplayPreview(elements: DisplayPreviewElements, locale: OptionsLocale): void {
  const displayStyle = normalizeDisplayStyle(elements.styleSelect.value);
  const showMarker = elements.markerInput.checked;

  elements.root.dataset.previewStyle = displayStyle;
  elements.root.dataset.previewMarker = showMarker ? "visible" : "hidden";
  elements.marker.hidden = !showMarker;
  elements.marker.textContent = getTranslationLabel(locale);
}
