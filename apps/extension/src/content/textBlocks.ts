export interface TextBlockOptions {
  minTextLength: number;
  translatedAttr: string;
  translationClass: string;
  xOptimizedTranslation?: boolean;
  xTranslateArticles?: boolean;
  xTranslateQuotedPosts?: boolean;
  xSkipNativeTranslatedPosts?: boolean;
}

const SEMANTIC_SELECTOR =
  "article p, article li, article blockquote, article h1, article h2, article h3, main p, main li, main blockquote, main h1, main h2, main h3, p, li, blockquote, h1, h2, h3";

const LEGACY_SELECTOR = "td, font, body";
const MIN_SEMANTIC_BLOCKS = 3;
const MIN_SEMANTIC_TEXT_LENGTH = 500;
const MAX_TEXT_LENGTH = 4000;
const BR_SEPARATED_SELECTOR = "p, td, font";
const X_TWEET_TEXT_SELECTOR = 'article[data-testid="tweet"] [data-testid="tweetText"]';
const X_ARTICLE_SELECTOR = '[data-testid="twitterArticleReadView"]';
const X_ARTICLE_TITLE_SELECTOR = '[data-testid="twitter-article-title"]';
const X_ARTICLE_BLOCK_SELECTOR = '[data-testid="longformRichTextComponent"] [data-block="true"]';

export function collectTextBlocks(document: Document, options: TextBlockOptions): HTMLElement[] {
  const xBlocks = collectXBlocks(document, options);
  if (xBlocks.length > 0) {
    return xBlocks;
  }

  const semanticBlocks = collectSemanticBlocks(document, options);
  if (hasEnoughSemanticContent(semanticBlocks)) {
    return semanticBlocks;
  }

  const legacyBlocks = collectLegacyBlocks(document, options);
  return legacyBlocks.length > 0 ? legacyBlocks : semanticBlocks;
}

function collectXBlocks(document: Document, options: TextBlockOptions): HTMLElement[] {
  if (!options.xOptimizedTranslation || !document.querySelector('article[data-testid="tweet"]')) {
    return [];
  }

  const articleBlocks = collectXArticleBlocks(document, options);
  if (articleBlocks.length > 0) {
    return articleBlocks;
  }

  return Array.from(document.querySelectorAll<HTMLElement>(X_TWEET_TEXT_SELECTOR)).filter((element) =>
    isXTranslatableTweetText(element, options)
  );
}

function collectXArticleBlocks(document: Document, options: TextBlockOptions): HTMLElement[] {
  if (!options.xTranslateArticles || !document.querySelector(X_ARTICLE_SELECTOR)) {
    return [];
  }

  const titleBlocks = Array.from(document.querySelectorAll<HTMLElement>(X_ARTICLE_TITLE_SELECTOR)).filter((element) =>
    isXArticleTextBlock(element, options)
  );
  const richTextBlocks = Array.from(document.querySelectorAll<HTMLElement>(X_ARTICLE_BLOCK_SELECTOR)).filter((element) =>
    isXArticleTextBlock(element, options)
  );

  return [...titleBlocks, ...richTextBlocks];
}

function isXTranslatableTweetText(element: HTMLElement, options: TextBlockOptions): boolean {
  const article = element.closest<HTMLElement>('article[data-testid="tweet"]');
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

function isXArticleTextBlock(element: HTMLElement, options: TextBlockOptions): boolean {
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

function collectSemanticBlocks(document: Document, options: TextBlockOptions): HTMLElement[] {
  const blocks: HTMLElement[] = [];

  for (const element of Array.from(document.querySelectorAll<HTMLElement>(SEMANTIC_SELECTOR))) {
    if (isBrSeparatedContainer(element, options)) {
      blocks.push(...splitBrSeparatedContainer(element, document, options));
      continue;
    }

    if (isTranslatableElement(element, options)) {
      blocks.push(element);
    }
  }

  return blocks;
}

function collectLegacyBlocks(document: Document, options: TextBlockOptions): HTMLElement[] {
  const containers = Array.from(document.querySelectorAll<HTMLElement>(LEGACY_SELECTOR))
    .filter((element) => isLegacyContainer(element, options))
    .sort((left, right) => getNormalizedText(right).length - getNormalizedText(left).length);

  const container = containers[0];
  if (!container) {
    return [];
  }

  const blocks = splitLegacyContainer(container, document, options);
  return blocks.filter((element) => isTranslatableElement(element, options));
}

function hasEnoughSemanticContent(blocks: HTMLElement[]): boolean {
  if (blocks.length >= MIN_SEMANTIC_BLOCKS) {
    return true;
  }

  const totalLength = blocks.reduce((length, block) => length + getNormalizedText(block).length, 0);
  return totalLength >= MIN_SEMANTIC_TEXT_LENGTH;
}

function splitLegacyContainer(container: HTMLElement, document: Document, options: TextBlockOptions): HTMLElement[] {
  return splitTextByBrGroups(container, document, options, "marginLegacyBlock");
}

function splitBrSeparatedContainer(container: HTMLElement, document: Document, options: TextBlockOptions): HTMLElement[] {
  return splitTextByBrGroups(container, document, options, "marginBrSeparatedBlock");
}

function splitTextByBrGroups(
  container: HTMLElement,
  document: Document,
  options: TextBlockOptions,
  datasetKey: "marginLegacyBlock" | "marginBrSeparatedBlock"
): HTMLElement[] {
  const existingBlocks = getExistingSplitBlocks(container, datasetKey, options);
  if (existingBlocks.length > 0) {
    return existingBlocks;
  }

  const blocks: HTMLElement[] = [];
  let currentNodes: ChildNode[] = [];
  let pendingBreaks: ChildNode[] = [];

  const flush = (): void => {
    const nodes = currentNodes;
    currentNodes = [];
    if (nodes.length === 0) {
      return;
    }

    const text = normalizeText(nodes.map((node) => getSplitNodeText(node, options)).join(" "));
    if (text.length < options.minTextLength || text.length > MAX_TEXT_LENGTH) {
      return;
    }

    const firstNode = nodes.find((node) => node.parentNode === container);
    if (!firstNode) {
      return;
    }

    const block = document.createElement("span");
    block.dataset[datasetKey] = "true";
    container.insertBefore(block, firstNode);
    for (const node of nodes) {
      if (node.parentNode === container) {
        block.append(node);
      }
    }
    blocks.push(block);
  };

  for (const node of Array.from(container.childNodes)) {
    if (isBreakElement(node)) {
      pendingBreaks.push(node);
      if (pendingBreaks.length >= 2) {
        flush();
        pendingBreaks = [];
      }
      continue;
    }

    if (pendingBreaks.length === 1) {
      currentNodes.push(pendingBreaks[0]);
    }
    pendingBreaks = [];

    if (getSplitNodeText(node, options).trim().length > 0) {
      currentNodes.push(node);
    }
  }

  flush();
  return blocks;
}

function isBrSeparatedContainer(element: HTMLElement, options: TextBlockOptions): boolean {
  if (!element.matches(BR_SEPARATED_SELECTOR) || shouldSkipElement(element, options)) {
    return false;
  }

  if (element.querySelectorAll("p, li, blockquote, h1, h2, h3").length > 0) {
    return false;
  }

  const breakCount = element.querySelectorAll("br").length;
  return breakCount >= 3 && getNormalizedText(element).length > options.minTextLength * 3;
}

function getSplitNodeText(node: ChildNode, options: TextBlockOptions): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }

  if (node instanceof HTMLElement && !shouldSkipElement(node, options) && !node.matches("script, style, noscript")) {
    return node.innerText;
  }

  return "";
}

function getExistingSplitBlocks(
  container: HTMLElement,
  datasetKey: "marginLegacyBlock" | "marginBrSeparatedBlock",
  options: TextBlockOptions
): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(`[data-${toKebabCase(datasetKey)}="true"]`)).filter((element) =>
    isTranslatableElement(element, options)
  );
}

function toKebabCase(value: string): string {
  return value.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);
}

function isBreakElement(node: ChildNode): boolean {
  return node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === "BR";
}

function isLegacyContainer(element: HTMLElement, options: TextBlockOptions): boolean {
  if (shouldSkipElement(element, options)) {
    return false;
  }

  const text = getNormalizedText(element);
  if (text.length < options.minTextLength * 3) {
    return false;
  }

  if (hasNestedLegacyCandidate(element, text.length, options)) {
    return false;
  }

  return element.querySelectorAll("p, li, blockquote, h1, h2, h3").length === 0;
}

function hasNestedLegacyCandidate(element: HTMLElement, textLength: number, options: TextBlockOptions): boolean {
  return Array.from(element.querySelectorAll<HTMLElement>("td, font")).some((child) => {
    if (child === element || shouldSkipElement(child, options)) {
      return false;
    }
    return getNormalizedText(child).length >= textLength * 0.8;
  });
}

function isTranslatableElement(element: HTMLElement, options: TextBlockOptions): boolean {
  if (element.hasAttribute(options.translatedAttr)) {
    return false;
  }

  if (element.closest(`.${options.translationClass}`)) {
    return false;
  }

  if (shouldSkipElement(element, options)) {
    return false;
  }

  const style = window.getComputedStyle(element);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    Number(style.opacity) === 0 ||
    element.offsetParent === null
  ) {
    return false;
  }

  const text = getNormalizedText(element);
  if (text.length < options.minTextLength && !/^H[1-3]$/.test(element.tagName)) {
    return false;
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return false;
  }

  if (element.querySelector("input, textarea, select, button")) {
    return false;
  }

  return true;
}

function shouldSkipElement(element: HTMLElement, options: TextBlockOptions): boolean {
  return Boolean(
    element.closest(
      `nav, footer, aside, form, button, pre, code, script, style, noscript, svg, canvas, textarea, select, .${options.translationClass}, [aria-hidden='true'], [hidden], [role='navigation'], [role='banner'], [role='contentinfo']`
    )
  );
}

function getNormalizedText(element: HTMLElement): string {
  return normalizeText(element.innerText);
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
