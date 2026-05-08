export interface TextBlockOptions {
  minTextLength: number;
  translatedAttr: string;
  translationClass: string;
}

const SEMANTIC_SELECTOR =
  "article p, article li, article blockquote, article h1, article h2, article h3, main p, main li, main blockquote, main h1, main h2, main h3, p, li, blockquote, h1, h2, h3";

const LEGACY_SELECTOR = "td, font, body";
const MIN_SEMANTIC_BLOCKS = 3;
const MIN_SEMANTIC_TEXT_LENGTH = 500;
const MAX_TEXT_LENGTH = 4000;
const BR_SEPARATED_SELECTOR = "p, td, font";
const BR_GROUP_MARKER = "\n\n";

export function collectTextBlocks(document: Document, options: TextBlockOptions): HTMLElement[] {
  const semanticBlocks = collectSemanticBlocks(document, options);
  if (hasEnoughSemanticContent(semanticBlocks)) {
    return semanticBlocks;
  }

  const legacyBlocks = collectLegacyBlocks(document, options);
  return legacyBlocks.length > 0 ? legacyBlocks : semanticBlocks;
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
  const blocks: HTMLElement[] = [];
  let buffer = "";

  const flush = (): void => {
    const text = normalizeText(buffer);
    buffer = "";
    if (text.length < options.minTextLength) {
      return;
    }

    const block = document.createElement("span");
    block.textContent = text;
    block.dataset.toastLegacyBlock = "true";
    container.append(document.createTextNode(" "));
    container.append(block);
    blocks.push(block);
  };

  for (const node of Array.from(container.childNodes)) {
    if (node instanceof HTMLBRElement) {
      flush();
      continue;
    }

    if (node instanceof Text) {
      buffer += ` ${node.textContent ?? ""}`;
      continue;
    }

    if (node instanceof HTMLElement && !shouldSkipElement(node, options)) {
      buffer += ` ${node.innerText}`;
    }
  }

  flush();
  return blocks;
}

function splitBrSeparatedContainer(container: HTMLElement, document: Document, options: TextBlockOptions): HTMLElement[] {
  return splitTextByBrGroups(container, document, options, "toastBrSeparatedBlock");
}

function splitTextByBrGroups(
  container: HTMLElement,
  document: Document,
  options: TextBlockOptions,
  datasetKey: "toastLegacyBlock" | "toastBrSeparatedBlock"
): HTMLElement[] {
  const text = getTextWithBreakMarkers(container);
  return text
    .split(BR_GROUP_MARKER)
    .map(normalizeText)
    .filter((segment) => segment.length >= options.minTextLength && segment.length <= MAX_TEXT_LENGTH)
    .map((segment) => {
      const block = document.createElement("span");
      block.textContent = segment;
      block.dataset[datasetKey] = "true";
      container.append(document.createTextNode(" "));
      container.append(block);
      return block;
    });
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

function getTextWithBreakMarkers(container: HTMLElement): string {
  let text = "";
  let breakCount = 0;

  for (const node of Array.from(container.childNodes)) {
    if (isBreakElement(node)) {
      breakCount += 1;
      if (breakCount >= 2 && !text.endsWith(BR_GROUP_MARKER)) {
        text += BR_GROUP_MARKER;
      }
      continue;
    }

    const nodeText = getNodeText(node);
    if (nodeText) {
      text += ` ${nodeText}`;
    }
    breakCount = 0;
  }

  return text;
}

function getNodeText(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }

  if (node instanceof HTMLElement && !node.matches("script, style, noscript")) {
    return node.innerText;
  }

  return "";
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
