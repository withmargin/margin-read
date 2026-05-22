import { isLocalTranslationProvider } from "../shared/localProviders";
import { normalizeText } from "../shared/text";
import type { ExtensionSettings, PageDebugState, TranslationProviderId, TranslationResult } from "../shared/types";
import type { BlockCandidate } from "./blockCandidates";
import { type TranslationDisplayStyle } from "./displayStyle";
import { createIncludedBlockCandidates } from "./extraction/shared";
import { collectSiteAdapterBlocks } from "./siteAdapters";
import { collectBlockCandidates } from "./textBlocks";
import { getTranslationLabel } from "../shared/translationLabel";
import {
  BLOCK_ID_ATTR,
  RENDER_STRATEGY_ATTR,
  TRANSLATED_ATTR,
  TRANSLATION_CLASS,
  createTranslationRenderer,
  type TranslationRenderer
} from "./translationRenderer";
import { compareQueueItems, TranslationQueue, type QueuePriority, type TranslationQueueItem } from "./translationQueue";

const MIN_TEXT_LENGTH = 24;
const BATCH_SIZE = 6;
const CONCURRENCY = 2;
const LOCAL_BATCH_SIZE = 3;
const LOCAL_CONCURRENCY = 1;
const INITIAL_QUEUE_LIMIT = 80;
const NEAR_VIEWPORT_MULTIPLIER = 1.5;
const FLOATING_HOST_ATTR = "data-margin-floating-controls";
const PROVIDER_DISPLAY_NAMES: Record<TranslationProviderId, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic Claude",
  google: "Google Gemini",
  "openai-compatible": "OpenAI Compatible"
};

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
  let displayStyle: TranslationDisplayStyle = "balanced";
  let showTranslationLabel = false;
  let targetLanguage = "English";
  let translationLabel = getTranslationLabel(targetLanguage);
  let debugMode = false;
  let xOptimizedTranslation = true;
  let xTranslateArticles = true;
  let xTranslateQuotedPosts = false;
  let xSkipNativeTranslatedPosts = true;
  let providerConfig: PageDebugState["providerConfig"];
  let debugState: PageDebugState = createDebugState();

  const blockMap = new Map<string, HTMLElement>();
  const candidateByElement = new WeakMap<HTMLElement, BlockCandidate>();
  const queue = new TranslationQueue<HTMLElement>({
    batchSize: BATCH_SIZE,
    concurrency: CONCURRENCY,
    worker: translateBlocks
  });
  const renderer: TranslationRenderer = createTranslationRenderer({
    displayStyle,
    showTranslationLabel,
    translationLabel,
    targetLanguage,
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
      displayStyle = response.settings?.displayStyle ?? "balanced";
      showTranslationLabel = response.settings?.showTranslationLabel ?? false;
      targetLanguage = response.settings?.targetLanguage ?? targetLanguage;
      translationLabel = getTranslationLabel(targetLanguage);
      renderer.setDisplayStyle(displayStyle);
      renderer.setTranslationLabel(showTranslationLabel, translationLabel);
      renderer.setTargetLanguage(targetLanguage);
      debugMode = response.settings?.debugMode ?? false;
      const selectedProvider = response.settings?.provider ?? "openai";
      providerConfig = createProviderDebugConfig(response.settings, selectedProvider);
      const xConfig = response.settings?.siteAdapters?.x;
      xOptimizedTranslation = xConfig?.enabled ?? true;
      xTranslateArticles = xConfig?.translateArticles ?? true;
      xTranslateQuotedPosts = xConfig?.quotedPosts ?? false;
      xSkipNativeTranslatedPosts = xConfig?.skipNativeTranslated ?? true;
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
      node.removeAttribute(RENDER_STRATEGY_ATTR);
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

    const textBlockOptions = {
      minTextLength: MIN_TEXT_LENGTH,
      translatedAttr: TRANSLATED_ATTR,
      translationClass: TRANSLATION_CLASS,
      xOptimizedTranslation,
      xTranslateArticles,
      xTranslateQuotedPosts,
      xSkipNativeTranslatedPosts
    };
    const adapterBlocks = collectSiteAdapterBlocks(document, textBlockOptions);
    const candidates =
      adapterBlocks.length > 0
        ? createIncludedBlockCandidates(adapterBlocks, "adapter")
        : collectBlockCandidates(document, textBlockOptions);
    rememberCandidates(candidates);
    const initialQueueItems = candidates.map(createQueueItem).sort(compareQueueItems).slice(0, INITIAL_QUEUE_LIMIT);
    debugState.lastScanAt = Date.now();
    debugState.detectedBlocks = candidates.length;
    debugState.enqueuedBlocks += initialQueueItems.length;
    debugState.sampleText = getSampleText(candidates);
    if (candidates.length === 0) {
      debugState.lastError = "No readable text blocks were detected on this page.";
    }
    queue.enqueue(initialQueueItems);
    for (const candidate of candidates) {
      viewportObserver?.observe(candidate.element);
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
    const requestStartedAt = Date.now();
    recordProviderRequestStarted(requestStartedAt);
    try {
      response = await chrome.runtime.sendMessage({
        type: "TRANSLATE_BATCH",
        segments
      });
      recordProviderRequestFinished(requestStartedAt);
    } catch (error) {
      recordProviderRequestFinished(requestStartedAt);
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
        const candidates = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => entry.target)
          .filter(
            (target): target is HTMLElement => target instanceof HTMLElement && !target.hasAttribute(TRANSLATED_ATTR)
          )
          .map((element) => candidateByElement.get(element))
          .filter((candidate): candidate is BlockCandidate => Boolean(candidate));

        if (candidates.length > 0) {
          debugState.enqueuedBlocks += candidates.length;
          queue.enqueue(candidates.map(createQueueItem));
          updateDebugCounts();
        }
      },
      {
        root: null,
        rootMargin: "100% 0px"
      }
    );
  }

  function createQueueItem(candidate: BlockCandidate): TranslationQueueItem<HTMLElement> {
    const { element } = candidate;
    const id = element.getAttribute(BLOCK_ID_ATTR) ?? `block-${nextId++}`;
    element.setAttribute(BLOCK_ID_ATTR, id);
    return {
      id,
      priority: getQueuePriority(element),
      contentPriority: candidate.priority,
      distance: getViewportDistance(element),
      value: element
    };
  }

  function configureTranslationQueue(provider: TranslationProviderId): void {
    queue.configure(
      isLocalTranslationProvider(provider)
        ? { batchSize: LOCAL_BATCH_SIZE, concurrency: LOCAL_CONCURRENCY }
        : { batchSize: BATCH_SIZE, concurrency: CONCURRENCY }
    );
  }

  function createDebugState(): PageDebugState {
    const state: PageDebugState = {
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
    if (providerConfig) {
      state.providerConfig = providerConfig;
    }
    return state;
  }

  function createProviderDebugConfig(
    settings: Partial<ExtensionSettings> | undefined,
    provider: TranslationProviderId
  ): PageDebugState["providerConfig"] {
    return {
      provider,
      providerName: PROVIDER_DISPLAY_NAMES[provider],
      model: settings?.model?.trim() || "unknown",
      endpoint: sanitizeEndpoint(settings?.providerEndpoint),
      structuredOutput: getStructuredOutputMode(settings, provider),
      extensionVersion: getExtensionVersion()
    };
  }

  function getStructuredOutputMode(
    settings: Partial<ExtensionSettings> | undefined,
    provider: TranslationProviderId
  ): string {
    if (provider === "google") return "responseJsonSchema";
    if (provider === "openai") return "json_schema";
    if (provider === "anthropic") return "tool input_schema";
    return settings?.openAICompatibleJsonMode ? "json_object" : "prompt only";
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
    if (!debugMode) return;
    debugState.pendingBlocks = document.querySelectorAll(`[${TRANSLATED_ATTR}="pending"]`).length;
    debugState.translatedBlocks = document.querySelectorAll(`[${TRANSLATED_ATTR}="done"]`).length;
    debugState.errorBlocks = document.querySelectorAll(`[${TRANSLATED_ATTR}="error"]`).length;
  }

  function recordError(message: string): void {
    debugState.lastError = message;
    updateDebugCounts();
  }

  function recordProviderRequestStarted(startedAt: number): void {
    debugState.lastProviderRequestStartedAt = startedAt;
    updateDebugCounts();
  }

  function recordProviderRequestFinished(startedAt: number): void {
    const finishedAt = Date.now();
    debugState.lastProviderRequestFinishedAt = finishedAt;
    debugState.lastProviderDurationMs = Math.max(0, finishedAt - startedAt);
    updateDebugCounts();
  }

  function rememberCandidates(candidates: BlockCandidate[]): void {
    for (const candidate of candidates) {
      candidate.element.setAttribute(RENDER_STRATEGY_ATTR, candidate.renderStrategy);
      candidateByElement.set(candidate.element, candidate);
    }
  }

  return {
    setEnabled,
    isEnabled: () => enabled,
    getDebugState: getDebugStateSnapshot
  };
}

function sanitizeEndpoint(endpoint: string | undefined): string {
  const value = endpoint?.trim();
  if (!value) return "unknown";

  try {
    const url = new URL(value);
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return stripTrailingSlash(url.toString());
  } catch {
    return stripTrailingSlash(value.split(/[?#]/)[0] || "unknown");
  }
}

function stripTrailingSlash(value: string): string {
  return value.length > 1 ? value.replace(/\/$/, "") : value;
}

function getExtensionVersion(): string | undefined {
  try {
    return chrome.runtime.getManifest?.().version;
  } catch {
    return undefined;
  }
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
    node.hasAttribute(RENDER_STRATEGY_ATTR) ||
    node.dataset.marginLegacyBlock === "true" ||
    node.dataset.marginBrSeparatedBlock === "true" ||
    node.dataset.marginLayout === "table-cell"
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


function getSampleText(candidates: BlockCandidate[]): string | undefined {
  const sample = candidates.map((candidate) => candidate.text).find((text) => text.length > 0);
  return sample?.slice(0, 160);
}
