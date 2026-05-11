import { SETTINGS_KEY } from "../shared/defaults";
import type { ExtensionSettings } from "../shared/types";
import {
  choosePreferredCaptionTrack,
  discoverYouTubeCaptionTracks,
  fetchYouTubeCaptionCues,
  fetchYouTubeCaptionCuesFromUrl,
  type YouTubeCaptionCue
} from "./youtubeCaptionTracks";

const YOUTUBE_CONTROL_HOST_ID = "margin-youtube-subtitle-control";
const YOUTUBE_CAPTION_HOST_ID = "margin-youtube-caption-overlay";
const YOUTUBE_CONTROL_ATTR = "data-margin-youtube-control";
const YOUTUBE_CAPTION_ATTR = "data-margin-youtube-caption-overlay";
const YOUTUBE_NATIVE_CAPTION_STYLE_ID = "margin-youtube-native-caption-style";
const YOUTUBE_WATCH_PATH = "/watch";
const YOUTUBE_NAVIGATION_EVENT = "yt-navigate-finish";
const CAPTION_SEGMENT_SELECTOR = ".ytp-caption-window-container .ytp-caption-segment";
const CAPTION_REFRESH_DELAY_MS = 20;
const CAPTION_CACHE_LIMIT = 120;
const CAPTION_TRACK_BATCH_SIZE = 32;
const CAPTION_PLAYBACK_POLL_MS = 100;

let observer: MutationObserver | undefined;
let captionObserver: MutationObserver | undefined;
let rescanTimer: number | undefined;
let controlHost: HTMLElement | undefined;
let captionHost: HTMLElement | undefined;
let targetLanguage = "English";
let installed = false;
let captionMode: "idle" | "bilingual" | "translated" = "idle";
let lastCaptionText = "";
let activeCaptionRequest = 0;
let captionRefreshTimer: number | undefined;
let captionPlaybackTimer: number | undefined;
let activeTrackRequest = 0;
let captionTrackCues: YouTubeCaptionCue[] = [];
const translatedTrackCues = new Map<string, string>();
const captionTranslationCache = new Map<string, string>();

interface SettingsResponse {
  ok: boolean;
  settings?: Partial<ExtensionSettings>;
}

export function initializeYouTubeControls(): void {
  if (!isYouTubePage()) {
    return;
  }

  if (!document.body) {
    window.addEventListener("DOMContentLoaded", initializeYouTubeControls, { once: true });
    return;
  }

  void loadTargetLanguage();
  installObservers();
  scheduleYouTubeControlScan();
}

async function loadTargetLanguage(): Promise<void> {
  try {
    const response: SettingsResponse = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
    targetLanguage = response.settings?.targetLanguage || targetLanguage;
    updateControlState();
  } catch {
    updateControlState();
  }
}

function installObservers(): void {
  observer?.disconnect();
  observer = new MutationObserver((mutations) => {
    if (mutations.every(isMarginYouTubeMutation)) {
      return;
    }
    scheduleYouTubeControlScan();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  if (!installed) {
    window.addEventListener(YOUTUBE_NAVIGATION_EVENT, scheduleYouTubeControlScan);
    window.addEventListener("popstate", scheduleYouTubeControlScan);
    installed = true;
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") {
      return;
    }
    const nextSettings = changes[SETTINGS_KEY]?.newValue as Partial<ExtensionSettings> | undefined;
    if (nextSettings?.targetLanguage) {
      targetLanguage = nextSettings.targetLanguage;
      updateControlState();
    }
  });
}

export function resetYouTubeControlsForTests(): void {
  observer?.disconnect();
  observer = undefined;
  if (rescanTimer !== undefined) {
    window.clearTimeout(rescanTimer);
    rescanTimer = undefined;
  }
  if (captionRefreshTimer !== undefined) {
    window.clearTimeout(captionRefreshTimer);
    captionRefreshTimer = undefined;
  }
  if (captionPlaybackTimer !== undefined) {
    window.clearInterval(captionPlaybackTimer);
    captionPlaybackTimer = undefined;
  }
  stopCaptionTranslation();
  removeYouTubeControl();
  if (installed) {
    window.removeEventListener(YOUTUBE_NAVIGATION_EVENT, scheduleYouTubeControlScan);
    window.removeEventListener("popstate", scheduleYouTubeControlScan);
    installed = false;
  }
  targetLanguage = "English";
  captionMode = "idle";
  activeCaptionRequest = 0;
  activeTrackRequest = 0;
  captionTrackCues = [];
  translatedTrackCues.clear();
  captionTranslationCache.clear();
}

function scheduleYouTubeControlScan(): void {
  if (rescanTimer !== undefined) {
    window.clearTimeout(rescanTimer);
  }
  rescanTimer = window.setTimeout(() => {
    rescanTimer = undefined;
    ensureYouTubeControl();
  }, 250);
}

function ensureYouTubeControl(): void {
  if (!isYouTubeWatchPage()) {
    removeYouTubeControl();
    stopCaptionTranslation();
    return;
  }

  const rightControls = findRightControls();
  if (!rightControls) {
    return;
  }

  if (!controlHost) {
    controlHost = createControlHost();
  }

  if (!rightControls.contains(controlHost)) {
    const insertionPoint = rightControls.querySelector(".ytp-right-controls-left");
    rightControls.insertBefore(controlHost, insertionPoint ?? rightControls.firstChild);
  }

  updateControlState();
}

function removeYouTubeControl(): void {
  controlHost?.remove();
  controlHost = undefined;
}

function startCaptionTranslation(nextMode: "bilingual" | "translated"): void {
  captionMode = captionMode === nextMode ? "idle" : nextMode;
  if (captionMode === "idle") {
    stopCaptionTranslation();
    updateControlState();
    return;
  }

  ensureCaptionOverlay();
  void startCaptionTrackPipeline();
  observeCaptions();
  refreshCaptionTranslation();
  updateControlState();
}

function stopCaptionTranslation(): void {
  captionMode = "idle";
  activeCaptionRequest += 1;
  lastCaptionText = "";
  if (captionRefreshTimer !== undefined) {
    window.clearTimeout(captionRefreshTimer);
    captionRefreshTimer = undefined;
  }
  if (captionPlaybackTimer !== undefined) {
    window.clearInterval(captionPlaybackTimer);
    captionPlaybackTimer = undefined;
  }
  activeTrackRequest += 1;
  captionTrackCues = [];
  translatedTrackCues.clear();
  captionObserver?.disconnect();
  captionObserver = undefined;
  removeNativeCaptionHiding();
  captionHost?.remove();
  captionHost = undefined;
}

async function fetchCaptionCuesWithYouTubeFallback(track: Parameters<typeof fetchYouTubeCaptionCues>[0]): Promise<YouTubeCaptionCue[]> {
  const directCues = await fetchYouTubeCaptionCues(track);
  if (directCues.length > 0) {
    return directCues;
  }

  const primedTimedTextUrl = await primeYouTubeTimedTextUrl();
  if (!primedTimedTextUrl) {
    return [];
  }
  return fetchYouTubeCaptionCuesFromUrl(primedTimedTextUrl);
}

async function primeYouTubeTimedTextUrl(): Promise<string | undefined> {
  const existingUrl = getLatestLoadedTimedTextUrl();
  if (existingUrl) {
    return existingUrl;
  }

  const subtitlesButton = document.querySelector<HTMLButtonElement>(".ytp-subtitles-button");
  if (!subtitlesButton || subtitlesButton.hasAttribute("disabled") || subtitlesButton.getAttribute("aria-disabled") === "true") {
    return undefined;
  }

  const wasPressed = subtitlesButton.getAttribute("aria-pressed") === "true";
  hideNativeCaptions();
  if (!wasPressed) {
    subtitlesButton.click();
  }

  const loadedUrl = await waitForTimedTextUrl();
  if (!wasPressed) {
    subtitlesButton.click();
  }
  return loadedUrl;
}

function getLatestLoadedTimedTextUrl(): string | undefined {
  return performance
    .getEntriesByType("resource")
    .filter((entry) => entry.name.includes("/api/timedtext") && "decodedBodySize" in entry && Number(entry.decodedBodySize) > 0)
    .at(-1)?.name;
}

async function waitForTimedTextUrl(): Promise<string | undefined> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const url = getLatestLoadedTimedTextUrl();
    if (url) {
      return url;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }
  return undefined;
}

function hideNativeCaptions(): void {
  if (document.getElementById(YOUTUBE_NATIVE_CAPTION_STYLE_ID)) {
    return;
  }
  const style = document.createElement("style");
  style.id = YOUTUBE_NATIVE_CAPTION_STYLE_ID;
  style.textContent = `
    .ytp-caption-window-container {
      opacity: 0 !important;
      pointer-events: none !important;
    }
  `;
  document.documentElement.append(style);
}

function removeNativeCaptionHiding(): void {
  document.getElementById(YOUTUBE_NATIVE_CAPTION_STYLE_ID)?.remove();
}

async function startCaptionTrackPipeline(): Promise<void> {
  const requestId = activeTrackRequest + 1;
  activeTrackRequest = requestId;

  try {
    const track = choosePreferredCaptionTrack(await discoverYouTubeCaptionTracks(document));
    if (!track) {
      return;
    }
    const cues = await fetchCaptionCuesWithYouTubeFallback(track);
    if (captionMode === "idle" || requestId !== activeTrackRequest || cues.length === 0) {
      return;
    }
    captionTrackCues = cues;
    startCaptionPlayback();
    void translateCaptionTrack(cues, requestId);
  } catch {
    if (requestId === activeTrackRequest) {
      captionTrackCues = [];
      translatedTrackCues.clear();
    }
  }
}

async function translateCaptionTrack(cues: YouTubeCaptionCue[], requestId: number): Promise<void> {
  const orderedCues = orderCuesFromCurrentTime(cues);
  for (let index = 0; index < orderedCues.length; index += CAPTION_TRACK_BATCH_SIZE) {
    if (isCaptionTranslationIdle() || requestId !== activeTrackRequest) {
      return;
    }

    const batch = orderedCues.slice(index, index + CAPTION_TRACK_BATCH_SIZE).filter((cue) => !translatedTrackCues.has(cue.id));
    if (batch.length === 0) {
      continue;
    }

    try {
      const response: { ok?: boolean; results?: Array<{ id: string; text: string }> } = await chrome.runtime.sendMessage({
        type: "TRANSLATE_BATCH",
        segments: batch.map((cue) => ({ id: cue.id, text: cue.text }))
      });
      if (isCaptionTranslationIdle() || requestId !== activeTrackRequest || !response.ok) {
        return;
      }
      for (const result of response.results ?? []) {
        translatedTrackCues.set(result.id, result.text);
      }
      renderTrackCaptionAtCurrentTime();
    } catch {
      return;
    }
  }
}

function orderCuesFromCurrentTime(cues: YouTubeCaptionCue[]): YouTubeCaptionCue[] {
  const currentTimeMs = getCurrentVideoTimeMs();
  const firstUpcomingIndex = cues.findIndex((cue) => cue.startMs + cue.durationMs >= currentTimeMs);
  if (firstUpcomingIndex <= 0) {
    return cues;
  }
  return [...cues.slice(firstUpcomingIndex), ...cues.slice(0, firstUpcomingIndex)];
}

function startCaptionPlayback(): void {
  if (captionPlaybackTimer !== undefined) {
    window.clearInterval(captionPlaybackTimer);
  }
  renderTrackCaptionAtCurrentTime();
  captionPlaybackTimer = window.setInterval(renderTrackCaptionAtCurrentTime, CAPTION_PLAYBACK_POLL_MS);
}

function ensureCaptionOverlay(): void {
  if (captionHost) {
    return;
  }

  const player = findVideoPlayer();
  if (!player) {
    return;
  }

  captionHost = document.createElement("div");
  captionHost.id = YOUTUBE_CAPTION_HOST_ID;
  captionHost.setAttribute(YOUTUBE_CAPTION_ATTR, "true");
  captionHost.setAttribute("translate", "no");
  captionHost.className = "margin-notranslate";

  const shadow = captionHost.attachShadow({ mode: "open" });
  shadow.append(createCaptionStyles(), createCaptionOverlay());
  player.append(captionHost);
}

function observeCaptions(): void {
  captionObserver?.disconnect();
  const observerTarget = findVideoPlayer();
  if (!observerTarget) {
    return;
  }

  captionObserver = new MutationObserver(() => {
    scheduleCaptionRefresh();
  });
  captionObserver.observe(observerTarget, { childList: true, subtree: true, characterData: true });
}

function scheduleCaptionRefresh(): void {
  if (captionRefreshTimer !== undefined) {
    window.clearTimeout(captionRefreshTimer);
  }
  captionRefreshTimer = window.setTimeout(() => {
    captionRefreshTimer = undefined;
    refreshCaptionTranslation();
  }, CAPTION_REFRESH_DELAY_MS);
}

function findRightControls(): HTMLElement | undefined {
  const controls =
    document.querySelector(".html5-video-player .ytp-right-controls") ?? document.querySelector(".ytp-right-controls");
  return controls instanceof HTMLElement ? controls : undefined;
}

function findVideoPlayer(): HTMLElement | undefined {
  const player = document.querySelector(".html5-video-player");
  return player instanceof HTMLElement ? player : undefined;
}

function createControlHost(): HTMLElement {
  const host = document.createElement("div");
  host.id = YOUTUBE_CONTROL_HOST_ID;
  host.setAttribute(YOUTUBE_CONTROL_ATTR, "true");
  host.setAttribute("translate", "no");
  host.className = "margin-notranslate";

  const shadow = host.attachShadow({ mode: "open" });
  shadow.append(createControlStyles(), createControl());
  return host;
}

function createControl(): HTMLElement {
  const root = document.createElement("div");
  root.className = "margin-youtube";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "margin-youtube__button";
  button.append(createSubtitleIcon());
  button.addEventListener("click", () => {
    root.dataset.open = root.dataset.open === "true" ? "false" : "true";
  });

  const menu = document.createElement("div");
  menu.className = "margin-youtube__menu";
  menu.setAttribute("role", "menu");

  const bilingualItem = createMenuItem("Bilingual captions", "Show original captions with Margin translation.", () => {
    startCaptionTranslation("bilingual");
    root.dataset.mode = captionMode;
    root.dataset.open = "false";
    updateControlState();
  });
  bilingualItem.dataset.action = "bilingual";

  const translateItem = createMenuItem("Translated captions", "Show only translated captions.", () => {
    startCaptionTranslation("translated");
    root.dataset.mode = captionMode;
    root.dataset.open = "false";
    updateControlState();
  });
  translateItem.dataset.action = "translated";

  const settingsItem = createMenuItem("Settings", "Open Margin settings.", () => {
    root.dataset.open = "false";
    void chrome.runtime.openOptionsPage();
  });

  menu.append(bilingualItem, translateItem, settingsItem);
  root.append(button, menu);
  return root;
}

function createMenuItem(label: string, description: string, onClick: () => void): HTMLButtonElement {
  const item = document.createElement("button");
  item.type = "button";
  item.className = "margin-youtube__menu-item";
  item.setAttribute("role", "menuitem");

  const text = document.createElement("span");
  text.className = "margin-youtube__menu-label";
  text.textContent = label;

  const detail = document.createElement("span");
  detail.className = "margin-youtube__menu-detail";
  detail.textContent = description;

  item.append(text, detail);
  item.addEventListener("click", onClick);
  return item;
}

function updateControlState(): void {
  if (!controlHost?.shadowRoot) {
    return;
  }

  const hasCaptions = hasYouTubeCaptionControls();
  const root = controlHost.shadowRoot.querySelector(".margin-youtube");
  if (root instanceof HTMLElement) {
    root.dataset.hasCaptions = String(hasCaptions);
    root.dataset.mode = captionMode;
  }

  const button = controlHost.shadowRoot.querySelector(".margin-youtube__button");
  if (button instanceof HTMLButtonElement) {
    const label = hasCaptions
      ? `Margin captions into ${targetLanguage}`
      : `Margin captions into ${targetLanguage} when captions are available`;
    button.title = label;
    button.setAttribute("aria-label", label);
  }

  const captionItems = controlHost.shadowRoot.querySelectorAll<HTMLButtonElement>(
    '.margin-youtube__menu-item[data-action="bilingual"], .margin-youtube__menu-item[data-action="translated"]'
  );
  captionItems.forEach((item) => {
    item.disabled = !hasCaptions;
  });
}

function refreshCaptionTranslation(): void {
  if (captionMode === "idle") {
    return;
  }
  if (captionTrackCues.length > 0) {
    return;
  }

  ensureCaptionOverlay();
  const captionText = readVisibleCaptionText();
  if (!captionText) {
    activeCaptionRequest += 1;
    renderCaptionOverlay("");
    lastCaptionText = "";
    return;
  }
  if (captionText === lastCaptionText) {
    return;
  }

  lastCaptionText = captionText;
  const cachedTranslation = captionTranslationCache.get(getCaptionCacheKey(captionText));
  if (cachedTranslation) {
    renderCaptionOverlay(cachedTranslation);
    return;
  }
  void translateCaption(captionText);
}

function renderTrackCaptionAtCurrentTime(): void {
  if (captionMode === "idle" || captionTrackCues.length === 0) {
    return;
  }

  const cue = findActiveCue(captionTrackCues, getCurrentVideoTimeMs());
  if (!cue) {
    renderCaptionOverlay("");
    return;
  }

  const translatedText = translatedTrackCues.get(cue.id);
  renderCaptionOverlay(translatedText ?? "");
}

function findActiveCue(cues: YouTubeCaptionCue[], currentTimeMs: number): YouTubeCaptionCue | undefined {
  return cues.find((cue) => currentTimeMs >= cue.startMs && currentTimeMs < cue.startMs + cue.durationMs);
}

function getCurrentVideoTimeMs(): number {
  const video = document.querySelector("video");
  return video instanceof HTMLVideoElement ? Math.round(video.currentTime * 1000) : 0;
}

function isCaptionTranslationIdle(): boolean {
  return captionMode === "idle";
}

async function translateCaption(text: string): Promise<void> {
  const requestId = activeCaptionRequest + 1;
  activeCaptionRequest = requestId;
  renderCaptionOverlay("");

  try {
    const response: { ok?: boolean; results?: Array<{ id: string; text: string }>; error?: string } =
      await chrome.runtime.sendMessage({
      type: "TRANSLATE_BATCH",
      segments: [{ id: "youtube-caption", text }]
    });

    if (captionMode === "idle" || requestId !== activeCaptionRequest) {
      return;
    }

    const translatedText = response.results?.find((result) => result.id === "youtube-caption")?.text;
    if (response.ok && translatedText) {
      setCachedCaptionTranslation(text, translatedText);
      renderCaptionOverlay(translatedText);
      return;
    }
    renderCaptionOverlay(response.error || "Caption translation failed.");
  } catch (error) {
    if (captionMode !== "idle" && requestId === activeCaptionRequest) {
      renderCaptionOverlay(error instanceof Error ? error.message : "Caption translation failed.");
    }
  }
}

function setCachedCaptionTranslation(text: string, translatedText: string): void {
  const key = getCaptionCacheKey(text);
  captionTranslationCache.delete(key);
  captionTranslationCache.set(key, translatedText);
  if (captionTranslationCache.size > CAPTION_CACHE_LIMIT) {
    const oldestKey = captionTranslationCache.keys().next().value;
    if (oldestKey) {
      captionTranslationCache.delete(oldestKey);
    }
  }
}

function getCaptionCacheKey(text: string): string {
  return `${targetLanguage}\n${text}`;
}

function readVisibleCaptionText(): string {
  return Array.from(document.querySelectorAll(CAPTION_SEGMENT_SELECTOR), (segment) => segment.textContent?.trim() ?? "")
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function renderCaptionOverlay(text: string): void {
  if (!captionHost?.shadowRoot) {
    return;
  }
  const overlay = captionHost.shadowRoot.querySelector<HTMLElement>(".margin-youtube-caption");
  if (!overlay) {
    return;
  }
  overlay.textContent = text;
  overlay.hidden = text.length === 0;
  overlay.dataset.mode = captionMode;
}

function hasYouTubeCaptionControls(): boolean {
  const subtitlesButton = document.querySelector(".ytp-subtitles-button");
  if (!(subtitlesButton instanceof HTMLElement)) {
    return false;
  }
  return !subtitlesButton.hasAttribute("disabled") && subtitlesButton.getAttribute("aria-disabled") !== "true";
}

function isMarginYouTubeMutation(mutation: MutationRecord): boolean {
  const nodes = [...Array.from(mutation.addedNodes), ...Array.from(mutation.removedNodes)];
  return nodes.length > 0 && nodes.every(isMarginYouTubeNode);
}

function isMarginYouTubeNode(node: Node): boolean {
  return (
    node instanceof HTMLElement &&
    (node.hasAttribute(YOUTUBE_CONTROL_ATTR) ||
      node.hasAttribute(YOUTUBE_CAPTION_ATTR) ||
      node.id === YOUTUBE_CONTROL_HOST_ID ||
      node.id === YOUTUBE_CAPTION_HOST_ID)
  );
}

function isYouTubePage(): boolean {
  return location.hostname === "youtube.com" || location.hostname.endsWith(".youtube.com");
}

function isYouTubeWatchPage(): boolean {
  return isYouTubePage() && location.pathname === YOUTUBE_WATCH_PATH;
}

function createSubtitleIcon(): SVGSVGElement {
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("aria-hidden", "true");
  icon.setAttribute("focusable", "false");
  icon.classList.add("margin-youtube__icon");
  icon.innerHTML = `
    <path d="M5 4.75h14A2.25 2.25 0 0 1 21.25 7v10A2.25 2.25 0 0 1 19 19.25H5A2.25 2.25 0 0 1 2.75 17V7A2.25 2.25 0 0 1 5 4.75Z" />
    <path d="M6.75 10h4.5M6.75 14h6.5M15.75 10h1.5M15.75 14h1.5" />
  `;
  return icon;
}

function createControlStyles(): HTMLStyleElement {
  const style = document.createElement("style");
  style.textContent = `
    :host {
      all: initial;
      display: inline-flex;
      height: 100%;
      align-items: center;
      color-scheme: dark;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    .margin-youtube {
      position: relative;
      display: inline-flex;
      height: 100%;
      align-items: center;
    }

    .margin-youtube__button {
      display: grid;
      width: 36px;
      height: 36px;
      place-items: center;
      border: 0;
      border-radius: 999px;
      background: transparent;
      color: #ffffff;
      cursor: pointer;
      opacity: 0.92;
      padding: 0;
    }

    .margin-youtube__button:hover,
    .margin-youtube[data-open="true"] .margin-youtube__button {
      opacity: 1;
      background: rgb(255 255 255 / 12%);
    }

    .margin-youtube__button:focus-visible {
      outline: 2px solid rgb(255 255 255 / 70%);
      outline-offset: -2px;
    }

    .margin-youtube__icon {
      width: 24px;
      height: 24px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .margin-youtube__menu {
      position: absolute;
      right: 0;
      bottom: 44px;
      display: none;
      min-width: 238px;
      overflow: hidden;
      border-radius: 10px;
      background: rgb(15 15 15 / 94%);
      box-shadow: 0 12px 32px rgb(0 0 0 / 40%);
      padding: 8px 0;
      z-index: 2147483647;
    }

    .margin-youtube[data-open="true"] .margin-youtube__menu {
      display: block;
    }

    .margin-youtube__menu-item {
      display: grid;
      width: 100%;
      gap: 2px;
      border: 0;
      background: transparent;
      color: #ffffff;
      cursor: pointer;
      font: inherit;
      padding: 9px 14px;
      text-align: left;
    }

    .margin-youtube__menu-item:hover:not(:disabled),
    .margin-youtube__menu-item:focus-visible {
      background: rgb(255 255 255 / 12%);
      outline: 0;
    }

    .margin-youtube__menu-item:disabled {
      cursor: not-allowed;
      opacity: 0.46;
    }

    .margin-youtube__menu-label {
      font-size: 13px;
      font-weight: 600;
      line-height: 1.25;
    }

    .margin-youtube__menu-detail {
      color: rgb(255 255 255 / 68%);
      font-size: 11px;
      line-height: 1.35;
    }
  `;
  return style;
}

function createCaptionOverlay(): HTMLElement {
  const overlay = document.createElement("div");
  overlay.className = "margin-youtube-caption";
  overlay.hidden = true;
  return overlay;
}

function createCaptionStyles(): HTMLStyleElement {
  const style = document.createElement("style");
  style.textContent = `
    :host {
      all: initial;
      position: absolute;
      left: 50%;
      bottom: 84px;
      z-index: 2147483646;
      max-width: min(78%, 920px);
      transform: translateX(-50%);
      pointer-events: none;
      color-scheme: dark;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    .margin-youtube-caption {
      box-sizing: border-box;
      border-radius: 2px;
      background: rgb(8 8 8 / 75%);
      color: #ffffff;
      font-size: clamp(16px, 2.1vw, 28px);
      font-weight: 400;
      line-height: 1.35;
      padding: 2px 4px;
      text-align: center;
      text-shadow: none;
      white-space: pre-wrap;
    }
  `;
  return style;
}
