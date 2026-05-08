import type { RuntimeMessage, TranslationResult } from "../shared/types";
import { TranslationQueue, type QueuePriority, type TranslationQueueItem } from "./translationQueue";

const TRANSLATION_CLASS = "rosetta-translation";
const TRANSLATED_ATTR = "data-rosetta-translated";
const BLOCK_ID_ATTR = "data-rosetta-block-id";
const MIN_TEXT_LENGTH = 24;
const BATCH_SIZE = 6;
const CONCURRENCY = 2;
const NEAR_VIEWPORT_MULTIPLIER = 1.5;

let enabled = false;
let observer: MutationObserver | undefined;
let viewportObserver: IntersectionObserver | undefined;
let pending = false;
let nextId = 1;
let runId = 0;

const blockMap = new Map<string, HTMLElement>();
const queue = new TranslationQueue<HTMLElement>({
  batchSize: BATCH_SIZE,
  concurrency: CONCURRENCY,
  worker: translateBlocks
});

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
  runId += 1;
  startViewportObserver();
  scanAndQueue();
  observer = new MutationObserver(() => {
    if (!enabled || pending) {
      return;
    }
    pending = true;
    window.setTimeout(() => {
      pending = false;
      scanAndQueue();
    }, 600);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function stopTranslation(): void {
  runId += 1;
  queue.clear();
  observer?.disconnect();
  observer = undefined;
  viewportObserver?.disconnect();
  viewportObserver = undefined;
  document.querySelectorAll(`.${TRANSLATION_CLASS}`).forEach((node) => node.remove());
  document.querySelectorAll(`[${TRANSLATED_ATTR}]`).forEach((node) => {
    node.removeAttribute(TRANSLATED_ATTR);
    node.removeAttribute(BLOCK_ID_ATTR);
  });
  blockMap.clear();
}

function scanAndQueue(): void {
  if (!enabled) {
    return;
  }

  const blocks = collectTextBlocks().slice(0, 80);
  queue.enqueue(blocks.map(createQueueItem));
  for (const block of blocks) {
    viewportObserver?.observe(block);
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
  const activeRunId = runId;
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

  const response: TranslationBatchResponse = await chrome.runtime.sendMessage({
    type: "TRANSLATE_BATCH",
    segments
  });

  if (!enabled || activeRunId !== runId) {
    return;
  }

  if (!response.ok || !response.results) {
    insertErrorState(blocks, response.error ?? "Translation failed.");
    return;
  }

  applyTranslations(response.results);
  const translatedIds = new Set(response.results.map((result) => result.id));
  const missingBlocks = segments
    .filter((segment) => !translatedIds.has(segment.id))
    .map((segment) => blockMap.get(segment.id))
    .filter((element): element is HTMLElement => Boolean(element));

  if (missingBlocks.length > 0) {
    insertErrorState(missingBlocks, "The provider did not return a translation for this block.");
  }
}

function startViewportObserver(): void {
  viewportObserver?.disconnect();
  viewportObserver = new IntersectionObserver(
    (entries) => {
      const blocks = entries
        .filter((entry) => entry.isIntersecting)
        .map((entry) => entry.target)
        .filter((target): target is HTMLElement => target instanceof HTMLElement && !target.hasAttribute(TRANSLATED_ATTR));

      if (blocks.length > 0) {
        queue.enqueue(blocks.map(createQueueItem));
      }
    },
    {
      root: null,
      rootMargin: "100% 0px"
    }
  );
}

function createQueueItem(element: HTMLElement): TranslationQueueItem<HTMLElement> {
  const id = element.getAttribute(BLOCK_ID_ATTR) ?? `block-${nextId++}`;
  element.setAttribute(BLOCK_ID_ATTR, id);
  return {
    id,
    priority: getQueuePriority(element),
    distance: getViewportDistance(element),
    value: element
  };
}

function getQueuePriority(element: HTMLElement): QueuePriority {
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  if (rect.bottom >= 0 && rect.top <= viewportHeight) {
    return 0;
  }
  if (rect.top <= viewportHeight * (1 + NEAR_VIEWPORT_MULTIPLIER) && rect.bottom >= -viewportHeight * NEAR_VIEWPORT_MULTIPLIER) {
    return 1;
  }
  return 2;
}

function getViewportDistance(element: HTMLElement): number {
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  if (rect.bottom >= 0 && rect.top <= viewportHeight) {
    return 0;
  }
  return Math.min(Math.abs(rect.top - viewportHeight), Math.abs(rect.bottom));
}

interface TranslationBatchResponse {
  ok: boolean;
  results?: TranslationResult[];
  error?: string;
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
  let translation = source.nextElementSibling;
  if (!translation?.classList.contains(TRANSLATION_CLASS)) {
    translation = document.createElement("div");
    translation.className = TRANSLATION_CLASS;
    source.insertAdjacentElement("afterend", translation);
  }

  if (!(translation instanceof HTMLElement)) {
    return;
  }

  translation.dataset.state = state;
  translation.replaceChildren();

  if (state === "error") {
    const message = document.createElement("span");
    message.textContent = text;

    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "rosetta-retry";
    retry.textContent = "Retry";
    retry.addEventListener("click", () => {
      source.removeAttribute(TRANSLATED_ATTR);
      void translateBlocks([source]);
    });

    translation.append(message, retry);
    return;
  }

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
