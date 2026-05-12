import type { ExtensionSettings, PageDebugState, TranslationProviderId, TranslationResult } from "../shared/types";
import { type TranslationDisplayStyle } from "./displayStyle";
import { collectTextBlocks } from "./textBlocks";
import {
  BLOCK_ID_ATTR,
  TRANSLATED_ATTR,
  TRANSLATION_CLASS,
  createTranslationRenderer,
  type TranslationRenderer
} from "./translationRenderer";
import { TranslationQueue, type QueuePriority, type TranslationQueueItem } from "./translationQueue";

const MIN_TEXT_LENGTH = 24;
const BATCH_SIZE = 6;
const CONCURRENCY = 2;
const LOCAL_BATCH_SIZE = 3;
const LOCAL_CONCURRENCY = 1;
const NEAR_VIEWPORT_MULTIPLIER = 1.5;
const FLOATING_HOST_ATTR = "data-margin-floating-controls";

interface TranslationBatchResponse {
  ok: boolean;
  results?: TranslationResult[];
  error?: string;
}

interface SettingsResponse {
  ok: boolean;
  settings?: Partial<ExtensionSettings>;
}

export interface ContentOrchestrator {
  setEnabled(nextEnabled: boolean): Promise<void>;
  isEnabled(): boolean;
  getDebugState(): PageDebugState;
}

export interface ContentOrchestratorOptions {
  onEnabledChange: (enabled: boolean) => void;
}

export function createOrchestrator(options: ContentOrchestratorOptions): ContentOrchestrator {
  const { onEnabledChange } = options;

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
  const renderer: TranslationRenderer = createTranslationRenderer({
    displayStyle,
    blockMap,
    onRetry: (block) => {
      void translateBlocks([block]);
    }
  });

  async function setEnabled(nextEnabled: boolean): Promise<void> {
    if (nextEnabled === enabled) {
      onEnabledChange(enabled);
      return;
    }

    enabled = nextEnabled;
    if (enabled) {
      await startTranslation();
    } else {
      stopTranslation();
    }
    onEnabledChange(enabled);
  }

  async function startTranslation(): Promise<void> {
    runId += 1;
    observer?.disconnect();
    observer = undefined;
    try {
      const response: SettingsResponse = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
      displayStyle = response.settings?.displayStyle ?? "integrated";
      renderer.setDisplayStyle(displayStyle);
      debugMode = response.settings?.debugMode ?? false;
      const selectedProvider = response.settings?.provider ?? "openai";
      xOptimizedTranslation = response.settings?.xOptimizedTranslation ?? true;
      xTranslateArticles = response.settings?.xTranslateArticles ?? true;
      xTranslateQuotedPosts = response.settings?.xTranslateQuotedPosts ?? false;
      xSkipNativeTranslatedPosts = response.settings?.xSkipNativeTranslatedPosts ?? true;
      debugState = {
        ...createDebugState(),
        debugMode,
        enabled
      };
      configureTranslationQueue(selectedProvider);
      startViewportObserver();
      scanAndQueue();
    } catch (error: unknown) {
      recordError(error instanceof Error ? error.message : "Could not load extension settings.");
    }
    observer = new MutationObserver((mutations) => {
      if (!enabled || pending) {
        return;
      }
      if (mutations.every(isMarginMutation)) {
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

    renderer.insertPendingState(blocks);
    updateDebugCounts();

    let response: TranslationBatchResponse;
    try {
      response = await chrome.runtime.sendMessage({
        type: "TRANSLATE_BATCH",
        segments
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Provider request failed.";
      recordError(message);
      renderer.insertErrorState(blocks, message);
      updateDebugCounts();
      return;
    }

    if (!enabled || activeRunId !== runId) {
      return;
    }

    if (!response.ok || !response.results) {
      const message = response.error ?? "Translation failed.";
      recordError(message);
      renderer.insertErrorState(blocks, message);
      updateDebugCounts();
      return;
    }

    renderer.applyTranslations(response.results);
    const translatedIds = new Set(response.results.map((result) => result.id));
    const missingBlocks = segments
      .filter((segment) => !translatedIds.has(segment.id))
      .map((segment) => blockMap.get(segment.id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (missingBlocks.length > 0) {
      const message = "The provider did not return a translation for this block.";
      recordError(message);
      renderer.insertErrorState(missingBlocks, message);
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
          .filter(
            (target): target is HTMLElement => target instanceof HTMLElement && !target.hasAttribute(TRANSLATED_ATTR)
          );

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

  function configureTranslationQueue(provider: TranslationProviderId): void {
    queue.configure(
      provider === "openai-compatible"
        ? { batchSize: LOCAL_BATCH_SIZE, concurrency: LOCAL_CONCURRENCY }
        : { batchSize: BATCH_SIZE, concurrency: CONCURRENCY }
    );
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

  function getDebugStateSnapshot(): PageDebugState {
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

  return {
    setEnabled,
    isEnabled: () => enabled,
    getDebugState: getDebugStateSnapshot
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

function isMarginMutation(mutation: MutationRecord): boolean {
  if (mutation.target instanceof HTMLElement && isMarginManagedNode(mutation.target)) {
    return true;
  }

  const nodes = [...Array.from(mutation.addedNodes), ...Array.from(mutation.removedNodes)];
  return nodes.length > 0 && nodes.every(isMarginManagedNode);
}

function isMarginManagedNode(node: Node): boolean {
  if (!(node instanceof HTMLElement)) {
    return false;
  }

  return (
    node.classList.contains(TRANSLATION_CLASS) ||
    node.hasAttribute(FLOATING_HOST_ATTR) ||
    node.hasAttribute(TRANSLATED_ATTR) ||
    node.hasAttribute(BLOCK_ID_ATTR) ||
    node.dataset.marginLegacyBlock === "true" ||
    node.dataset.marginBrSeparatedBlock === "true"
  );
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

function getSampleText(blocks: HTMLElement[]): string | undefined {
  const sample = blocks.map((block) => normalizeText(block.innerText)).find((text) => text.length > 0);
  return sample?.slice(0, 160);
}
