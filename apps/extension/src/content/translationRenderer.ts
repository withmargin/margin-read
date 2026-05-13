import type { BlockRenderStrategy } from "./blockCandidates";
import {
  applyLanguageTypography,
  applyTranslationDisplayStyle,
  getTranslationClassName,
  type TranslationDisplayStyle
} from "./displayStyle";
import { applyTranslationLayout } from "./layoutStrategy";
import type { TranslationResult } from "../shared/types";

export const TRANSLATION_CLASS = "margin-translation";
export const TRANSLATED_ATTR = "data-margin-translated";
export const BLOCK_ID_ATTR = "data-margin-block-id";
export const RENDER_STRATEGY_ATTR = "data-margin-render-strategy";

type TranslationState = "pending" | "done" | "error";

export interface TranslationRenderer {
  applyTranslations(results: TranslationResult[]): void;
  insertPendingState(blocks: HTMLElement[]): void;
  insertErrorState(blocks: HTMLElement[], message: string): void;
  setDisplayStyle(style: TranslationDisplayStyle): void;
  setTranslationLabel(show: boolean, label: string): void;
  setTargetLanguage(language: string): void;
}

export interface TranslationRendererOptions {
  displayStyle: TranslationDisplayStyle;
  showTranslationLabel: boolean;
  translationLabel: string;
  targetLanguage: string;
  blockMap: Map<string, HTMLElement>;
  onRetry: (block: HTMLElement) => void;
}

export function createTranslationRenderer(options: TranslationRendererOptions): TranslationRenderer {
  let displayStyle = options.displayStyle;
  let showTranslationLabel = options.showTranslationLabel;
  let translationLabel = options.translationLabel;
  let targetLanguage = options.targetLanguage;
  const { blockMap, onRetry } = options;

  function upsert(source: HTMLElement, text: string, state: TranslationState): void {
    const translation = getOrCreateTranslationElement(source);

    translation.className = getTranslationClassName(displayStyle);
    translation.dataset.marginSource = getTranslationSource(source);
    translation.dataset.state = state;
    applyTranslationLabel(translation, state, showTranslationLabel, translationLabel);
    translation.removeAttribute("style");
    applyTranslationDisplayStyle(source, translation, displayStyle);
    const renderStrategy = getRenderStrategy(source);
    if (renderStrategy === "table-cell") {
      translation.dataset.marginLayout = "table-cell";
    } else {
      applyTranslationLayout(source, translation);
    }
    if (renderStrategy === "inline" && source.matches("dt")) {
      translation.dataset.marginLayout = "definition-term";
    }
    applyLanguageTypography(translation, targetLanguage);
    translation.replaceChildren();

    if (state === "error") {
      const message = document.createElement("span");
      message.textContent = text;

      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "margin-retry";
      retry.textContent = "Retry";
      retry.addEventListener("click", () => {
        source.removeAttribute(TRANSLATED_ATTR);
        onRetry(source);
      });

      translation.append(message, retry);
      return;
    }

    translation.textContent = text;
  }

  return {
    applyTranslations(results) {
      for (const result of results) {
        const element = blockMap.get(result.id);
        if (!element) {
          continue;
        }
        element.setAttribute(TRANSLATED_ATTR, "done");
        upsert(element, result.text, "done");
      }
    },
    insertPendingState(blocks) {
      for (const block of blocks) {
        if (isLegacySplitBlock(block) || getRenderStrategy(block) === "inline") {
          continue;
        }
        upsert(block, "Translating...", "pending");
      }
    },
    insertErrorState(blocks, message) {
      for (const block of blocks) {
        block.setAttribute(TRANSLATED_ATTR, "error");
        upsert(block, message, "error");
      }
    },
    setDisplayStyle(style) {
      displayStyle = style;
    },
    setTranslationLabel(show, label) {
      showTranslationLabel = show;
      translationLabel = label;
    },
    setTargetLanguage(language) {
      targetLanguage = language;
    }
  };
}

function applyTranslationLabel(
  translation: HTMLElement,
  state: TranslationState,
  showTranslationLabel: boolean,
  translationLabel: string
): void {
  const shouldShow = showTranslationLabel && state === "done";
  translation.classList.toggle("margin-translation--labeled", shouldShow);
  if (shouldShow) {
    translation.dataset.marginLabel = translationLabel;
  } else {
    delete translation.dataset.marginLabel;
  }
}

function createTranslationElement(source: HTMLElement): HTMLElement {
  return document.createElement(isLegacySplitBlock(source) || getRenderStrategy(source) === "inline" ? "span" : "div");
}

function getOrCreateTranslationElement(source: HTMLElement): HTMLElement {
  const renderStrategy = getRenderStrategy(source);
  if ((renderStrategy === "inline" && source.matches("dt")) || renderStrategy === "table-cell") {
    const existing = Array.from(source.children).find(
      (child): child is HTMLElement => child instanceof HTMLElement && child.classList.contains(TRANSLATION_CLASS)
    );
    if (existing) {
      return existing;
    }
    const translation = createTranslationElement(source);
    source.append(translation);
    return translation;
  }

  const nextElement = source.nextElementSibling;
  if (nextElement instanceof HTMLElement && nextElement.classList.contains(TRANSLATION_CLASS)) {
    return nextElement;
  }

  const translation = createTranslationElement(source);
  source.insertAdjacentElement("afterend", translation);
  return translation;
}

function getTranslationSource(source: HTMLElement): "legacy" | "web" | "x" {
  if (source.dataset.marginXBlock) {
    return "x";
  }
  if (isLegacySplitBlock(source)) {
    return "legacy";
  }
  return "web";
}

export function isLegacySplitBlock(element: HTMLElement): boolean {
  return element.dataset.marginLegacyBlock === "true" || element.dataset.marginBrSeparatedBlock === "true";
}

function getRenderStrategy(source: HTMLElement): BlockRenderStrategy {
  const value = source.getAttribute(RENDER_STRATEGY_ATTR);
  if (value === "inline" || value === "table-cell") {
    return value;
  }
  return "integrated";
}
