import { SETTINGS_KEY } from "../shared/defaults";
import type { ExtensionSettings, PageDebugState, RuntimeMessage, TranslationProviderId, TranslationResult } from "../shared/types";
import { applyIntegratedStyle, getTranslationClassName, type TranslationDisplayStyle } from "./displayStyle";
import { applyTranslationLayout } from "./layoutStrategy";
import { collectTextBlocks } from "./textBlocks";
import { TranslationQueue, type QueuePriority, type TranslationQueueItem } from "./translationQueue";
import { initializeYouTubeControls } from "./youtubeControls";

const TRANSLATION_CLASS = "margin-translation";
const TRANSLATED_ATTR = "data-margin-translated";
const BLOCK_ID_ATTR = "data-margin-block-id";
const MIN_TEXT_LENGTH = 24;
const BATCH_SIZE = 6;
const CONCURRENCY = 2;
const LOCAL_BATCH_SIZE = 3;
const LOCAL_CONCURRENCY = 1;
const NEAR_VIEWPORT_MULTIPLIER = 1.5;
const FLOATING_HOST_ID = "margin-floating-controls";
const FLOATING_HOST_ATTR = "data-margin-floating-controls";

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
let floatingHost: HTMLElement | undefined;
let floatingButton: HTMLButtonElement | undefined;
let floatingButtonEnabled = false;
let floatingTargetLanguage = "English";
let floatingHiddenForPage = false;

const blockMap = new Map<string, HTMLElement>();
const queue = new TranslationQueue<HTMLElement>({
  batchSize: BATCH_SIZE,
  concurrency: CONCURRENCY,
  worker: translateBlocks
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  if (message.type === "TOGGLE_TRANSLATION") {
    void setTranslationEnabled(typeof message.enabled === "boolean" ? message.enabled : !enabled)
      .finally(() => {
        sendResponse({ ok: true, enabled, debug: getDebugState() });
      });
    return true;
  }

  if (message.type === "GET_PAGE_STATE") {
    sendResponse({ ok: true, enabled, debug: getDebugState() });
    return;
  }
});

void initializeFloatingButton();
initializeYouTubeControls();

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") {
    return;
  }

  const nextSettings = changes[SETTINGS_KEY]?.newValue as Partial<ExtensionSettings> | undefined;
  if (nextSettings) {
    syncFloatingButton(nextSettings);
  }
});

async function setTranslationEnabled(nextEnabled: boolean): Promise<void> {
  if (nextEnabled === enabled) {
    updateFloatingButtonLabel();
    return;
  }

  enabled = nextEnabled;
  if (enabled) {
    await startTranslation();
  } else {
    stopTranslation();
  }
  updateFloatingButtonLabel();
}

async function startTranslation(): Promise<void> {
  runId += 1;
  observer?.disconnect();
  observer = undefined;
  try {
    const response: SettingsResponse = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
    displayStyle = response.settings?.displayStyle ?? "integrated";
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
  updateFloatingButtonLabel();
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
  settings?: Partial<ExtensionSettings>;
}

function configureTranslationQueue(provider: TranslationProviderId): void {
  queue.configure(
    provider === "openai-compatible"
      ? { batchSize: LOCAL_BATCH_SIZE, concurrency: LOCAL_CONCURRENCY }
      : { batchSize: BATCH_SIZE, concurrency: CONCURRENCY }
  );
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
    if (isLegacySplitBlock(block)) {
      continue;
    }
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
    translation = createTranslationElement(source);
    source.insertAdjacentElement("afterend", translation);
  }

  if (!(translation instanceof HTMLElement)) {
    return;
  }

  translation.className = getTranslationClassName(displayStyle);
  translation.dataset.marginSource = getTranslationSource(source);
  translation.dataset.state = state;
  translation.removeAttribute("style");
  if (displayStyle === "integrated") {
    applyIntegratedStyle(source, translation);
    applyTranslationLayout(source, translation);
  }
  translation.replaceChildren();

  if (state === "error") {
    const message = document.createElement("span");
    message.textContent = text;

    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "margin-retry";
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

function createTranslationElement(source: HTMLElement): HTMLElement {
  return document.createElement(isLegacySplitBlock(source) ? "span" : "div");
}

function getTranslationSource(source: HTMLElement): "legacy" | "web" | "x" {
  if (source.dataset.marginXBlock) {
    return "x";
  }
  if (isLegacySplitBlock(source)) {
    return "legacy";
  }
  return "web";
}

function isLegacySplitBlock(element: HTMLElement): boolean {
  return element.dataset.marginLegacyBlock === "true" || element.dataset.marginBrSeparatedBlock === "true";
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

async function initializeFloatingButton(): Promise<void> {
  if (!document.body) {
    window.addEventListener("DOMContentLoaded", () => void initializeFloatingButton(), { once: true });
    return;
  }

  try {
    const response: SettingsResponse = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
    if (response.settings) {
      syncFloatingButton(response.settings);
    }
  } catch {
    removeFloatingButton();
  }
}

function syncFloatingButton(settings: Partial<ExtensionSettings>): void {
  if (typeof settings.showFloatingButton === "boolean") {
    floatingButtonEnabled = settings.showFloatingButton;
  }
  floatingTargetLanguage = settings.targetLanguage || floatingTargetLanguage;
  if (floatingButtonEnabled && !floatingHiddenForPage) {
    ensureFloatingButton();
  } else {
    removeFloatingButton();
  }
  updateFloatingButtonLabel();
}

function ensureFloatingButton(): void {
  if (floatingHost || !document.body) {
    return;
  }

  floatingHost = document.createElement("div");
  floatingHost.id = FLOATING_HOST_ID;
  floatingHost.setAttribute(FLOATING_HOST_ATTR, "true");
  floatingHost.setAttribute("data-margin-root", "floating-controls");
  floatingHost.setAttribute("data-position", "right");
  floatingHost.setAttribute("data-theme", "light");
  floatingHost.setAttribute("data-state", enabled ? "enabled" : "idle");
  floatingHost.setAttribute("translate", "no");
  floatingHost.className = "margin-notranslate";
  const shadow = floatingHost.attachShadow({ mode: "open" });
  shadow.append(createFloatingStyles(), createFloatingControls());
  document.documentElement.append(floatingHost);
}

function removeFloatingButton(): void {
  floatingHost?.remove();
  floatingHost = undefined;
  floatingButton = undefined;
}

function createFloatingControls(): HTMLElement {
  const container = document.createElement("div");
  container.className = "margin-floating";
  container.setAttribute("part", "container");

  floatingButton = document.createElement("button");
  floatingButton.type = "button";
  floatingButton.className = "margin-floating__button margin-floating__button--primary";
  floatingButton.setAttribute("part", "primary-button");
  floatingButton.append(createTranslateIcon());
  floatingButton.addEventListener("click", () => {
    void setTranslationEnabled(!enabled);
  });

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "margin-floating__button margin-floating__button--secondary";
  closeButton.setAttribute("part", "close-button");
  closeButton.textContent = "×";
  closeButton.title = "Hide Margin on this page";
  closeButton.setAttribute("aria-label", "Hide Margin floating button on this page");
  closeButton.addEventListener("click", () => {
    floatingHiddenForPage = true;
    removeFloatingButton();
  });

  const overlay = document.createElement("div");
  overlay.className = "margin-floating__overlay";
  overlay.setAttribute("part", "overlay");
  overlay.hidden = true;

  container.append(floatingButton, closeButton, overlay);
  return container;
}

function updateFloatingButtonLabel(): void {
  if (!floatingButton) {
    return;
  }

  floatingHost?.setAttribute("data-state", enabled ? "enabled" : "idle");
  floatingButton.dataset.state = enabled ? "enabled" : "idle";
  if (enabled) {
    floatingButton.title = "Hide Margin translations";
    floatingButton.setAttribute("aria-label", "Hide Margin translations");
    return;
  }

  const label = `Translate into ${floatingTargetLanguage}`;
  floatingButton.title = label;
  floatingButton.setAttribute("aria-label", label);
}

function createTranslateIcon(): SVGSVGElement {
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("viewBox", "0 0 28 28");
  icon.setAttribute("aria-hidden", "true");
  icon.setAttribute("focusable", "false");
  icon.classList.add("margin-floating__icon");
  icon.innerHTML = `
    <path class="margin-floating__icon-bg" d="M0 14C0 6.268 6.268 0 14 0s14 6.268 14 14-6.268 14-14 14S0 21.732 0 14Z" />
    <path class="margin-floating__icon-mark" d="M8.2 21.2v-8.65c0-2.05 1.45-3.83 3.45-4.24A3.35 3.35 0 0 1 14 5.2c1.53 0 2.87 1.03 3.25 2.5a4.33 4.33 0 0 1 2.55 3.95v9.55H8.2Z" />
    <path class="margin-floating__icon-accent" d="M10.7 13.1h6.6v1.45h-6.6v-1.45Zm0 3.15h4.9v1.45h-4.9v-1.45Z" />
    <g class="margin-floating__icon-badge">
      <circle cx="21.5" cy="21.5" r="5.6" />
      <path d="m18.8 21.4 1.8 1.8 3.7-4" />
    </g>
  `;
  return icon;
}

function createFloatingStyles(): HTMLStyleElement {
  const style = document.createElement("style");
  style.textContent = `
    :host {
      all: initial;
      position: fixed;
      z-index: 2147483647;
      top: 50%;
      right: 0;
      transform: translateY(-50%);
      color-scheme: light;
      pointer-events: none;
    }

    .margin-floating {
      display: grid;
      gap: 10px;
      justify-items: end;
      pointer-events: auto;
    }

    .margin-floating__button {
      box-sizing: border-box;
      display: grid;
      width: 46px;
      height: 46px;
      place-items: center;
      border: 0;
      border-radius: 999px;
      box-shadow: 0 10px 30px rgb(15 23 42 / 18%);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      padding: 0;
      line-height: 1;
      cursor: pointer;
      transition:
        transform 140ms ease,
        box-shadow 140ms ease,
        opacity 140ms ease;
    }

    .margin-floating__button:hover {
      transform: translateY(-1px);
      box-shadow: 0 14px 36px rgb(15 23 42 / 24%);
    }

    .margin-floating__button:focus-visible {
      outline: 3px solid rgb(47 111 237 / 40%);
      outline-offset: 3px;
    }

    .margin-floating__button--primary {
      background: #d96890;
    }

    .margin-floating__button--primary[data-state="enabled"] {
      background: #d96890;
    }

    .margin-floating__button--secondary {
      position: absolute;
      top: 50%;
      left: -30px;
      width: 24px;
      height: 24px;
      color: #ffffff;
      background: rgb(17 24 39 / 32%);
      font-size: 21px;
      font-weight: 500;
      opacity: 0;
      transform: translate(-3px, -50%) scale(0.96);
    }

    .margin-floating:hover .margin-floating__button--secondary,
    .margin-floating:focus-within .margin-floating__button--secondary {
      opacity: 1;
      transform: translate(0, -50%) scale(1);
    }

    .margin-floating__icon {
      width: 25px;
      height: 25px;
      display: block;
    }

    .margin-floating__icon-bg {
      fill: #d96890;
      transition: fill 140ms ease;
    }

    .margin-floating__icon-mark {
      fill: #ffffff;
      transition: opacity 140ms ease;
    }

    .margin-floating__icon-accent {
      fill: #d96890;
      transition:
        fill 140ms ease,
        opacity 140ms ease;
    }

    .margin-floating__icon-badge {
      opacity: 0;
      transform: translate(1px, 1px) scale(0.86);
      transform-origin: 21.5px 21.5px;
      transition:
        opacity 140ms ease,
        transform 140ms ease;
    }

    .margin-floating__icon-badge circle {
      fill: #8ed081;
      stroke: #ffffff;
      stroke-width: 1.4;
    }

    .margin-floating__icon-badge path {
      fill: none;
      stroke: #ffffff;
      stroke-width: 1.45;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .margin-floating__button--primary[data-state="enabled"] .margin-floating__icon-bg {
      fill: #d96890;
    }

    .margin-floating__button--primary[data-state="enabled"] .margin-floating__icon-accent {
      fill: #d96890;
    }

    .margin-floating__button--primary[data-state="enabled"] .margin-floating__icon-badge {
      opacity: 1;
      transform: translate(1px, 1px) scale(1);
    }

    .margin-floating__overlay {
      position: absolute;
      right: 54px;
      top: 0;
      min-width: 220px;
      border-radius: 12px;
      background: #ffffff;
      box-shadow: 0 18px 48px rgb(15 23 42 / 22%);
    }

    @media (max-width: 720px) {
      :host {
        right: 0;
      }

      .margin-floating__button {
        width: 42px;
        height: 42px;
      }

      .margin-floating__icon {
        width: 23px;
        height: 23px;
      }
    }
  `;
  return style;
}
