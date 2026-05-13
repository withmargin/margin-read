import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BLOCK_ID_ATTR,
  RENDER_STRATEGY_ATTR,
  TRANSLATED_ATTR,
  TRANSLATION_CLASS,
  createTranslationRenderer,
  isLegacySplitBlock,
  type TranslationRenderer
} from "./translationRenderer";

let blockMap: Map<string, HTMLElement>;
let onRetry: ReturnType<typeof vi.fn<(block: HTMLElement) => void>>;
let renderer: TranslationRenderer;

function appendBlock(id: string, text = "Source text", attrs: Record<string, string> = {}): HTMLElement {
  const element = document.createElement("p");
  element.textContent = text;
  element.setAttribute(BLOCK_ID_ATTR, id);
  for (const [key, value] of Object.entries(attrs)) {
    element.setAttribute(key, value);
  }
  document.body.append(element);
  blockMap.set(id, element);
  return element;
}

function getTranslation(source: HTMLElement): HTMLElement | null {
  const next = source.nextElementSibling;
  return next instanceof HTMLElement && next.classList.contains(TRANSLATION_CLASS) ? next : null;
}

function getNestedTranslation(source: HTMLElement): HTMLElement | null {
  const child = Array.from(source.children).find(
    (element): element is HTMLElement => element instanceof HTMLElement && element.classList.contains(TRANSLATION_CLASS)
  );
  return child ?? null;
}

beforeEach(() => {
  document.body.innerHTML = "";
  blockMap = new Map();
  onRetry = vi.fn<(block: HTMLElement) => void>();
  renderer = createTranslationRenderer({ displayStyle: "balanced", targetLanguage: "English", blockMap, onRetry });
});

describe("applyTranslations", () => {
  it("inserts a translation element after each matched source", () => {
    const block = appendBlock("a");

    renderer.applyTranslations([{ id: "a", text: "你好" }]);

    const translation = getTranslation(block);
    expect(translation?.textContent).toBe("你好");
    expect(translation?.dataset.state).toBe("done");
    expect(block.getAttribute(TRANSLATED_ATTR)).toBe("done");
  });

  it("skips results whose id is not in the block map", () => {
    renderer.applyTranslations([{ id: "missing", text: "ignored" }]);

    expect(document.body.children).toHaveLength(0);
    expect(blockMap.has("missing")).toBe(false);
  });

  it("reuses an existing translation node instead of stacking", () => {
    appendBlock("a");

    renderer.applyTranslations([{ id: "a", text: "first" }]);
    renderer.applyTranslations([{ id: "a", text: "second" }]);

    const translations = document.querySelectorAll(`.${TRANSLATION_CLASS}`);
    expect(translations).toHaveLength(1);
    expect(translations[0].textContent).toBe("second");
  });
});

describe("insertPendingState", () => {
  it("inserts a 'Translating...' placeholder for non-legacy blocks", () => {
    const block = appendBlock("a");

    renderer.insertPendingState([block]);

    const translation = getTranslation(block);
    expect(translation?.textContent).toBe("Translating...");
    expect(translation?.dataset.state).toBe("pending");
  });

  it("skips legacy split blocks", () => {
    const block = appendBlock("a", "Source", { "data-margin-legacy-block": "true" });

    renderer.insertPendingState([block]);

    expect(getTranslation(block)).toBeNull();
  });
});

describe("insertErrorState", () => {
  it("inserts the error message with a Retry button and marks the source as error", () => {
    const block = appendBlock("a");

    renderer.insertErrorState([block], "Provider request failed.");

    const translation = getTranslation(block);
    expect(translation?.dataset.state).toBe("error");
    expect(block.getAttribute(TRANSLATED_ATTR)).toBe("error");
    expect(translation?.querySelector("span")?.textContent).toBe("Provider request failed.");
    expect(translation?.querySelector("button.margin-retry")?.textContent).toBe("Retry");
  });

  it("retry button clears the translated attr and invokes onRetry with the source block", () => {
    const block = appendBlock("a");
    renderer.insertErrorState([block], "fail");
    const retry = getTranslation(block)?.querySelector<HTMLButtonElement>("button.margin-retry");

    retry?.click();

    expect(block.hasAttribute(TRANSLATED_ATTR)).toBe(false);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(block);
  });
});

describe("display style handling", () => {
  it("uses a span wrapper for legacy split blocks", () => {
    const block = appendBlock("a", "Source", { "data-margin-legacy-block": "true" });

    renderer.applyTranslations([{ id: "a", text: "你好" }]);

    const translation = getTranslation(block);
    expect(translation?.tagName).toBe("SPAN");
    expect(translation?.dataset.marginSource).toBe("legacy");
  });

  it("keeps definition term translations inside the term", () => {
    const block = document.createElement("dt");
    block.textContent = "Term";
    block.setAttribute(BLOCK_ID_ATTR, "a");
    block.setAttribute(RENDER_STRATEGY_ATTR, "inline");
    document.body.append(block);
    blockMap.set("a", block);

    renderer.applyTranslations([{ id: "a", text: "術語" }]);

    const translation = getNestedTranslation(block);
    expect(getTranslation(block)).toBeNull();
    expect(translation?.tagName).toBe("SPAN");
    expect(translation?.dataset.marginLayout).toBe("definition-term");
    expect(translation?.textContent).toBe("術語");
  });

  it("keeps table cell translations inside the source cell", () => {
    const table = document.createElement("table");
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.textContent = "System prompt and output style";
    cell.setAttribute(BLOCK_ID_ATTR, "a");
    cell.setAttribute(RENDER_STRATEGY_ATTR, "table-cell");
    row.append(cell);
    table.append(row);
    document.body.append(table);
    blockMap.set("a", cell);

    renderer.applyTranslations([{ id: "a", text: "系統提示與輸出風格" }]);

    const translation = getNestedTranslation(cell);
    expect(getTranslation(cell)).toBeNull();
    expect(translation?.dataset.marginLayout).toBe("table-cell");
    expect(translation?.textContent).toBe("系統提示與輸出風格");
  });

  it("tags translations from X blocks with the x source", () => {
    const block = appendBlock("a");
    block.dataset.marginXBlock = "tweet-text";

    renderer.applyTranslations([{ id: "a", text: "你好" }]);

    expect(getTranslation(block)?.dataset.marginSource).toBe("x");
  });

  it("setDisplayStyle changes the className on the next render", () => {
    const block = appendBlock("a");

    renderer.applyTranslations([{ id: "a", text: "first" }]);
    const initialClass = getTranslation(block)?.className;

    renderer.setDisplayStyle("highlighted");
    renderer.applyTranslations([{ id: "a", text: "second" }]);

    expect(getTranslation(block)?.className).not.toBe(initialClass);
  });

  it("applies target language typography on render", () => {
    const block = appendBlock("a");

    renderer.setTargetLanguage("Traditional Chinese");
    renderer.applyTranslations([{ id: "a", text: "你好 Margin" }]);

    const translation = getTranslation(block);
    expect(translation?.lang).toBe("zh-TW");
    expect(translation?.dir).toBe("auto");
    expect(translation?.style.getPropertyValue("line-break")).toBe("auto");
  });
});

describe("isLegacySplitBlock", () => {
  it("recognizes legacy block marker", () => {
    const element = document.createElement("span");
    element.dataset.marginLegacyBlock = "true";
    expect(isLegacySplitBlock(element)).toBe(true);
  });

  it("recognizes br-separated block marker", () => {
    const element = document.createElement("span");
    element.dataset.marginBrSeparatedBlock = "true";
    expect(isLegacySplitBlock(element)).toBe(true);
  });

  it("returns false for plain elements", () => {
    expect(isLegacySplitBlock(document.createElement("p"))).toBe(false);
  });
});
