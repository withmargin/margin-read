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

type TranslationState = "pending" | "done" | "error";

export interface TranslationRenderer {
  applyTranslations(results: TranslationResult[]): void;
  insertPendingState(blocks: HTMLElement[]): void;
  insertErrorState(blocks: HTMLElement[], message: string): void;
  setDisplayStyle(style: TranslationDisplayStyle): void;
  setTargetLanguage(language: string): void;
}

export interface TranslationRendererOptions {
  displayStyle: TranslationDisplayStyle;
  targetLanguage: string;
  blockMap: Map<string, HTMLElement>;
  onRetry: (block: HTMLElement) => void;
}

export function createTranslationRenderer(options: TranslationRendererOptions): TranslationRenderer {
  let displayStyle = options.displayStyle;
  let targetLanguage = options.targetLanguage;
  const { blockMap, onRetry } = options;

  function upsert(source: HTMLElement, text: string, state: TranslationState): void {
    let translation = source.nextElementSibling;
    if (!translation?.classList.contains(TRANSLATION_CLASS)) {
      translation = createTranslationElement(source);
      source.insertAdjacentElement("afterend", translation);
    }

    if (!(translation instanceof HTMLElement)) {
      return;
    }

    translation.className = getTranslationClassName(displayStyle);
    translation.dataset.marginSource = getTranslationSource(source);
    translation.dataset.state = state;
    translation.removeAttribute("style");
    applyTranslationDisplayStyle(source, translation, displayStyle);
    applyTranslationLayout(source, translation);
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
        if (isLegacySplitBlock(block)) {
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
    setTargetLanguage(language) {
      targetLanguage = language;
    }
  };
}

function createTranslationElement(source: HTMLElement): HTMLElement {
  return document.createElement(isLegacySplitBlock(source) ? "span" : "div");
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
