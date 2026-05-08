import type { RuntimeMessage, TranslateBatchResponse, TranslationResult } from "../shared/types";

const TRANSLATION_CLASS = "rosetta-translation";
const TRANSLATED_ATTR = "data-rosetta-translated";
const BLOCK_ID_ATTR = "data-rosetta-block-id";
const MIN_TEXT_LENGTH = 24;
const BATCH_SIZE = 8;

let enabled = false;
let observer: MutationObserver | undefined;
let pending = false;
let nextId = 1;

const blockMap = new Map<string, HTMLElement>();

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  if (message.type === "TOGGLE_TRANSLATION") {
    enabled = typeof message.enabled === "boolean" ? message.enabled : !enabled;
    if (enabled) {
      startTranslation();
    } else {
      stopTranslation();
    }
    sendResponse({ ok: true, enabled });
    return;
  }

  if (message.type === "GET_PAGE_STATE") {
    sendResponse({ ok: true, enabled });
    return;
  }
});

function startTranslation(): void {
  scanAndTranslate();
  observer = new MutationObserver(() => {
    if (!enabled || pending) {
      return;
    }
    pending = true;
    window.setTimeout(() => {
      pending = false;
      scanAndTranslate();
    }, 600);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function stopTranslation(): void {
  observer?.disconnect();
  observer = undefined;
  document.querySelectorAll(`.${TRANSLATION_CLASS}`).forEach((node) => node.remove());
  document.querySelectorAll(`[${TRANSLATED_ATTR}]`).forEach((node) => {
    node.removeAttribute(TRANSLATED_ATTR);
    node.removeAttribute(BLOCK_ID_ATTR);
  });
  blockMap.clear();
}

async function scanAndTranslate(): Promise<void> {
  const blocks = collectTextBlocks().slice(0, 80);
  for (let index = 0; index < blocks.length; index += BATCH_SIZE) {
    if (!enabled) {
      return;
    }
    const batch = blocks.slice(index, index + BATCH_SIZE);
    await translateBlocks(batch);
  }
}

function collectTextBlocks(): HTMLElement[] {
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>("article p, article li, article blockquote, article h1, article h2, article h3, main p, main li, main blockquote, main h1, main h2, main h3, p, li, blockquote, h1, h2, h3")
  );

  return candidates.filter((element) => {
    if (element.hasAttribute(TRANSLATED_ATTR)) {
      return false;
    }

    if (element.closest(`.${TRANSLATION_CLASS}`)) {
      return false;
    }

    if (element.closest("nav, footer, aside, form, button, pre, code, script, style, noscript, svg, canvas, textarea, select")) {
      return false;
    }

    if (element.closest("[aria-hidden='true'], [hidden], [role='navigation'], [role='banner'], [role='contentinfo']")) {
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

    const text = normalizeText(element.innerText);
    if (text.length < MIN_TEXT_LENGTH && !/^H[1-3]$/.test(element.tagName)) {
      return false;
    }

    if (text.length > 4000) {
      return false;
    }

    if (element.querySelector("input, textarea, select, button")) {
      return false;
    }

    return true;
  });
}

async function translateBlocks(blocks: HTMLElement[]): Promise<void> {
  const segments = blocks.map((element) => {
    const id = element.getAttribute(BLOCK_ID_ATTR) ?? `block-${nextId++}`;
    element.setAttribute(BLOCK_ID_ATTR, id);
    element.setAttribute(TRANSLATED_ATTR, "pending");
    blockMap.set(id, element);
    return {
      id,
      text: normalizeText(element.innerText),
      contextBefore: getSiblingText(element, "previousElementSibling"),
      contextAfter: getSiblingText(element, "nextElementSibling")
    };
  });

  insertPendingState(blocks);

  const response = (await chrome.runtime.sendMessage({
    type: "TRANSLATE_BATCH",
    segments
  })) as TranslateBatchResponse;

  if (!response.ok || !response.results) {
    insertErrorState(blocks, response.error ?? "Translation failed.");
    return;
  }

  applyTranslations(response.results);
}

function applyTranslations(results: TranslationResult[]): void {
  for (const result of results) {
    const element = blockMap.get(result.id);
    if (!element) {
      continue;
    }
    element.setAttribute(TRANSLATED_ATTR, "done");
    upsertTranslation(element, result.text, "done");
  }
}

function insertPendingState(blocks: HTMLElement[]): void {
  for (const block of blocks) {
    upsertTranslation(block, "Translating...", "pending");
  }
}

function insertErrorState(blocks: HTMLElement[], message: string): void {
  for (const block of blocks) {
    block.setAttribute(TRANSLATED_ATTR, "error");
    upsertTranslation(block, message, "error");
  }
}

function upsertTranslation(source: HTMLElement, text: string, state: "pending" | "done" | "error"): void {
  let translation = source.nextElementSibling as HTMLElement | null;
  if (!translation?.classList.contains(TRANSLATION_CLASS)) {
    translation = document.createElement("div");
    translation.className = TRANSLATION_CLASS;
    source.insertAdjacentElement("afterend", translation);
  }

  translation.dataset.state = state;
  translation.textContent = text;
}

function getSiblingText(element: HTMLElement, key: "previousElementSibling" | "nextElementSibling"): string | undefined {
  const sibling = element[key];
  if (!(sibling instanceof HTMLElement)) {
    return undefined;
  }
  const text = normalizeText(sibling.innerText);
  return text.length > 0 ? text.slice(0, 280) : undefined;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
