import type { PageDebugState, RuntimeMessage, TranslationResult } from "../shared/types";
import { applyIntegratedStyle, getTranslationClassName, type TranslationDisplayStyle } from "./displayStyle";
import { collectTextBlocks } from "./textBlocks";
import { TranslationQueue, type QueuePriority, type TranslationQueueItem } from "./translationQueue";

const TRANSLATION_CLASS = "toast-translation";
const TRANSLATED_ATTR = "data-toast-translated";
const BLOCK_ID_ATTR = "data-toast-block-id";
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
let displayStyle: TranslationDisplayStyle = "integrated";
let debugMode = false;
let xOptimizedTranslation = true;
let xTranslateArticles = true;
let xTranslateQuotedPosts = false;
let xSkipNativeTranslatedPosts = true;
let debugState: PageDebugState = createDebugState();

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
      void startTranslation().finally(() => {
        sendResponse({ ok: true, enabled, debug: getDebugState() });
      });
      return true;
    } else {
      stopTranslation();
    }
    sendResponse({ ok: true, enabled, debug: getDebugState() });
    return;
  }

  if (message.type === "GET_PAGE_STATE") {
    sendResponse({ ok: true, enabled, debug: getDebugState() });
    return;
  }
});

async function startTranslation(): Promise<void> {
  runId += 1;
  try {
    const response: SettingsResponse = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
    displayStyle = response.settings?.displayStyle ?? "integrated";
    debugMode = response.settings?.debugMode ?? false;
    xOptimizedTranslation = response.settings?.xOptimizedTranslation ?? true;
    xTranslateArticles = response.settings?.xTranslateArticles ?? true;
    xTranslateQuotedPosts = response.settings?.xTranslateQuotedPosts ?? false;
    xSkipNativeTranslatedPosts = response.settings?.xSkipNativeTranslatedPosts ?? true;
    debugState = {
      ...createDebugState(),
      debugMode,
      enabled
    };
    startViewportObserver();
    scanAndQueue();
  } catch (error: unknown) {
    recordError(error instanceof Error ? error.message : "Could not load extension settings.");
  }
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
  debugState = createDebugState();
  debugState.debugMode = debugMode;
  debugState.enabled = false;
}

function scanAndQueue(): void {
  if (!enabled) {
    return;
  }

  const blocks = collectTextBlocks(document, {
    minTextLength: MIN_TEXT_LENGTH,
    translatedAttr: TRANSLATED_ATTR,
    translationClass: TRANSLATION_CLASS,
    xOptimizedTranslation,
    xTranslateArticles,
    xTranslateQuotedPosts,
    xSkipNativeTranslatedPosts
  }).slice(0, 80);
  debugState.lastScanAt = Date.now();
  debugState.detectedBlocks = blocks.length;
  debugState.enqueuedBlocks += blocks.length;
  debugState.sampleText = getSampleText(blocks);
  if (blocks.length === 0) {
    debugState.lastError = "No readable text blocks were detected on this page.";
  }
  queue.enqueue(blocks.map(createQueueItem));
  for (const block of blocks) {
    viewportObserver?.observe(block);
  }
  updateDebugCounts();
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

  let response: TranslationBatchResponse;
  try {
    response = await chrome.runtime.sendMessage({
      type: "TRANSLATE_BATCH",
      segments
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Provider request failed.";
    recordError(message);
    insertErrorState(blocks, message);
    return;
  }

  if (!enabled || activeRunId !== runId) {
    return;
  }

  if (!response.ok || !response.results) {
    const message = response.error ?? "Translation failed.";
    recordError(message);
    insertErrorState(blocks, message);
    return;
  }

  applyTranslations(response.results);
  const translatedIds = new Set(response.results.map((result) => result.id));
  const missingBlocks = segments
    .filter((segment) => !translatedIds.has(segment.id))
    .map((segment) => blockMap.get(segment.id))
    .filter((element): element is HTMLElement => Boolean(element));

  if (missingBlocks.length > 0) {
    const message = "The provider did not return a translation for this block.";
    recordError(message);
    insertErrorState(missingBlocks, message);
  }
  updateDebugCounts();
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
        debugState.enqueuedBlocks += blocks.length;
        queue.enqueue(blocks.map(createQueueItem));
        updateDebugCounts();
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

interface SettingsResponse {
  ok: boolean;
  settings?: {
    displayStyle?: TranslationDisplayStyle;
    debugMode?: boolean;
    xOptimizedTranslation?: boolean;
    xTranslateArticles?: boolean;
    xTranslateQuotedPosts?: boolean;
    xSkipNativeTranslatedPosts?: boolean;
  };
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
  updateDebugCounts();
}

function insertPendingState(blocks: HTMLElement[]): void {
  for (const block of blocks) {
    upsertTranslation(block, "Translating...", "pending");
  }
  updateDebugCounts();
}

function insertErrorState(blocks: HTMLElement[], message: string): void {
  for (const block of blocks) {
    block.setAttribute(TRANSLATED_ATTR, "error");
    upsertTranslation(block, message, "error");
  }
  updateDebugCounts();
}

function upsertTranslation(source: HTMLElement, text: string, state: "pending" | "done" | "error"): void {
  let translation = source.nextElementSibling;
  if (!translation?.classList.contains(TRANSLATION_CLASS)) {
    translation = document.createElement("div");
    source.insertAdjacentElement("afterend", translation);
  }

  if (!(translation instanceof HTMLElement)) {
    return;
  }

  translation.className = getTranslationClassName(displayStyle);
  translation.dataset.toastSource = source.dataset.toastXBlock ? "x" : "web";
  translation.dataset.state = state;
  translation.removeAttribute("style");
  if (displayStyle === "integrated") {
    applyIntegratedStyle(source, translation);
  }
  translation.replaceChildren();

  if (state === "error") {
    const message = document.createElement("span");
    message.textContent = text;

    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "toast-retry";
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

function createDebugState(): PageDebugState {
  return {
    debugMode,
    enabled,
    detectedBlocks: 0,
    enqueuedBlocks: 0,
    queueSize: 0,
    runningRequests: 0,
    pendingBlocks: 0,
    translatedBlocks: 0,
    errorBlocks: 0
  };
}

function getDebugState(): PageDebugState {
  updateDebugCounts();
  return {
    ...debugState,
    debugMode,
    enabled
  };
}

function updateDebugCounts(): void {
  debugState.queueSize = queue.size;
  debugState.runningRequests = queue.running;
  debugState.pendingBlocks = document.querySelectorAll(`[${TRANSLATED_ATTR}="pending"]`).length;
  debugState.translatedBlocks = document.querySelectorAll(`[${TRANSLATED_ATTR}="done"]`).length;
  debugState.errorBlocks = document.querySelectorAll(`[${TRANSLATED_ATTR}="error"]`).length;
}

function recordError(message: string): void {
  debugState.lastError = message;
  updateDebugCounts();
}

function getSampleText(blocks: HTMLElement[]): string | undefined {
  const sample = blocks.map((block) => normalizeText(block.innerText)).find((text) => text.length > 0);
  return sample?.slice(0, 160);
}
