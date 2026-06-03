import { countCodePoints } from "../../shared/text";
import type { TextBlockOptions } from "../textBlocks";
import {
  getBaseMinimumTextLength,
  getNormalizedText,
  isTranslatableElement,
  isVisibleElement,
  shouldSkipElement,
  splitTextByParagraphBreaks,
  toKebabCase
} from "../extraction/shared";
import type { SiteAdapter } from "./types";

const X_TWEET_ARTICLE_SELECTOR = 'article[data-testid="tweet"]';
const X_TWEET_TEXT_SELECTOR = 'article[data-testid="tweet"] [data-testid="tweetText"]';
const X_ARTICLE_SELECTOR = '[data-testid="twitterArticleReadView"]';
const X_ARTICLE_TITLE_SELECTOR = '[data-testid="twitter-article-title"]';
const X_ARTICLE_BLOCK_SELECTOR = '[data-testid="longformRichTextComponent"] [data-block="true"]';
const X_TWEET_PARAGRAPH_BLOCK_DATASET = "marginXParagraphBlock";

export const xAdapter: SiteAdapter = {
  id: "x",
  matches(document, options) {
    return Boolean(options.xOptimizedTranslation && document.querySelector(X_TWEET_ARTICLE_SELECTOR));
  },
  collectBlocks(document, options) {
    const articleBlocks = collectArticleBlocks(document, options);
    if (articleBlocks.length > 0) {
      return articleBlocks;
    }
    return Array.from(document.querySelectorAll<HTMLElement>(X_TWEET_TEXT_SELECTOR)).flatMap((element) =>
      getTranslatableTweetTextBlocks(element, document, options)
    );
  }
};

function collectArticleBlocks(document: Document, options: TextBlockOptions): HTMLElement[] {
  if (!options.xTranslateArticles || !document.querySelector(X_ARTICLE_SELECTOR)) {
    return [];
  }

  const titleBlocks = Array.from(document.querySelectorAll<HTMLElement>(X_ARTICLE_TITLE_SELECTOR)).filter((element) =>
    isArticleTextBlock(element, options)
  );
  const richTextBlocks = Array.from(document.querySelectorAll<HTMLElement>(X_ARTICLE_BLOCK_SELECTOR)).filter((element) =>
    isArticleTextBlock(element, options)
  );

  return [...titleBlocks, ...richTextBlocks];
}

function getTranslatableTweetTextBlocks(
  element: HTMLElement,
  document: Document,
  options: TextBlockOptions
): HTMLElement[] {
  const article = element.closest<HTMLElement>(X_TWEET_ARTICLE_SELECTOR);
  if (!article) {
    return [];
  }

  if (!options.xTranslateQuotedPosts && isInsideQuotedPost(element, article)) {
    return [];
  }

  if (options.xSkipNativeTranslatedPosts && hasNativeXTranslationMarker(article, element)) {
    return [];
  }

  const existingParagraphBlocks = getExistingTweetParagraphBlocks(element, options);
  if (element.querySelector(`[data-${toKebabCase(X_TWEET_PARAGRAPH_BLOCK_DATASET)}="true"]`)) {
    return existingParagraphBlocks;
  }

  if (!isEligibleTweetTextContainer(element, options)) {
    return [];
  }

  const paragraphBlocks = splitTweetTextParagraphs(element, document, options);
  if (paragraphBlocks.length > 0) {
    return paragraphBlocks;
  }

  if (!isTranslatableElement(element, options)) {
    return [];
  }

  element.dataset.marginXBlock = "tweet-text";
  return [element];
}

function isArticleTextBlock(element: HTMLElement, options: TextBlockOptions): boolean {
  if (element.matches("section") || element.closest("section[contenteditable='false']")) {
    return false;
  }

  const mediaBlockText = getNormalizedText(element);
  if (
    element.querySelector("img, video, svg") &&
    countCodePoints(mediaBlockText) < getBaseMinimumTextLength(mediaBlockText, options) * 2
  ) {
    return false;
  }

  if (!isTranslatableElement(element, options)) {
    return false;
  }

  element.dataset.marginXBlock = "article";
  return true;
}

function isInsideQuotedPost(element: HTMLElement, article: HTMLElement): boolean {
  const quotedContainer = element.closest<HTMLElement>('[role="link"]');
  return Boolean(quotedContainer && article.contains(quotedContainer));
}

function hasNativeXTranslationMarker(article: HTMLElement, textElement: HTMLElement): boolean {
  return Array.from(article.querySelectorAll<HTMLElement>("div, span")).some((element) => {
    if (element === textElement || textElement.contains(element) || isInsideQuotedPost(element, article)) {
      return false;
    }
    return /Translated from\s+\w+/i.test(element.innerText);
  });
}

function isEligibleTweetTextContainer(element: HTMLElement, options: TextBlockOptions): boolean {
  if (element.hasAttribute(options.translatedAttr) || element.closest(`.${options.translationClass}`)) {
    return false;
  }

  if (shouldSkipElement(element, options) || element.querySelector("input, textarea, select, button")) {
    return false;
  }

  return isVisibleElement(element);
}

function splitTweetTextParagraphs(
  container: HTMLElement,
  document: Document,
  options: TextBlockOptions
): HTMLElement[] {
  if (!/\n{2,}/.test(container.innerText ?? container.textContent ?? "")) {
    return [];
  }

  const renderedBlocks: HTMLElement[] = [];
  let currentBlock = createTweetParagraphBlock(document, renderedBlocks.length);

  const flush = (): void => {
    /* v8 ignore next -- Empty groups can happen only around degenerate blank-line-only tweet fragments. */
    if (currentBlock.childNodes.length === 0) {
      return;
    }
    renderedBlocks.push(currentBlock);
    currentBlock = createTweetParagraphBlock(document, renderedBlocks.length);
  };

  for (const node of Array.from(container.childNodes)) {
    const pieces = splitNodeByParagraphBreaks(node, document);
    for (const piece of pieces) {
      if (piece === "paragraph-break") {
        flush();
        continue;
      }
      currentBlock.append(piece);
    }
  }
  flush();

  /* v8 ignore next -- If splitting does not produce multiple rendered groups, the original tweet is used. */
  if (renderedBlocks.length < 2) {
    return [];
  }

  container.replaceChildren(...renderedBlocks);
  return renderedBlocks.filter((block) => isTranslatableElement(block, options));
}

function createTweetParagraphBlock(document: Document, index: number): HTMLElement {
  const block = document.createElement("span");
  block.dataset.marginXBlock = "tweet-text";
  block.dataset[X_TWEET_PARAGRAPH_BLOCK_DATASET] = "true";
  block.style.display = "block";
  block.style.whiteSpace = "pre-wrap";
  if (index > 0) {
    block.style.marginTop = "1em";
  }
  return block;
}

function splitNodeByParagraphBreaks(node: ChildNode, document: Document): Array<ChildNode | "paragraph-break"> {
  if (node.nodeType === Node.TEXT_NODE) {
    return splitTextByParagraphBreaks(node.textContent ?? "", document);
  }

  if (node instanceof HTMLElement && isPlainTextInlineElement(node)) {
    const text = node.textContent ?? "";
    return splitTextByParagraphBreaks(text, document, (part) => {
      const clone = node.cloneNode(false) as ChildNode;
      clone.textContent = part;
      return clone;
    });
  }

  return [node];
}

function isPlainTextInlineElement(element: HTMLElement): boolean {
  return element.children.length === 0 && !element.matches("a, button, input, textarea, select, svg, img, video");
}

function getExistingTweetParagraphBlocks(container: HTMLElement, options: TextBlockOptions): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(`[data-${toKebabCase(X_TWEET_PARAGRAPH_BLOCK_DATASET)}="true"]`)
  ).filter((element) => isTranslatableElement(element, options));
}
