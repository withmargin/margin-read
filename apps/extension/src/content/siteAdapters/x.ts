import { isTranslatableElement, type TextBlockOptions } from "../textBlocks";
import type { SiteAdapter } from "./types";

const X_TWEET_ARTICLE_SELECTOR = 'article[data-testid="tweet"]';
const X_TWEET_TEXT_SELECTOR = 'article[data-testid="tweet"] [data-testid="tweetText"]';
const X_ARTICLE_SELECTOR = '[data-testid="twitterArticleReadView"]';
const X_ARTICLE_TITLE_SELECTOR = '[data-testid="twitter-article-title"]';
const X_ARTICLE_BLOCK_SELECTOR = '[data-testid="longformRichTextComponent"] [data-block="true"]';

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
    return Array.from(document.querySelectorAll<HTMLElement>(X_TWEET_TEXT_SELECTOR)).filter((element) =>
      isTranslatableTweetText(element, options)
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

function isTranslatableTweetText(element: HTMLElement, options: TextBlockOptions): boolean {
  const article = element.closest<HTMLElement>(X_TWEET_ARTICLE_SELECTOR);
  if (!article) {
    return false;
  }

  if (!options.xTranslateQuotedPosts && isInsideQuotedPost(element, article)) {
    return false;
  }

  if (options.xSkipNativeTranslatedPosts && hasNativeXTranslationMarker(article, element)) {
    return false;
  }

  if (!isTranslatableElement(element, options)) {
    return false;
  }

  element.dataset.marginXBlock = "tweet-text";
  return true;
}

function isArticleTextBlock(element: HTMLElement, options: TextBlockOptions): boolean {
  if (element.matches("section") || element.closest("section[contenteditable='false']")) {
    return false;
  }

  if (element.querySelector("img, video, svg") && getNormalizedText(element).length < options.minTextLength * 2) {
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

function getNormalizedText(element: HTMLElement): string {
  return element.innerText.replace(/\s+/g, " ").trim();
}
