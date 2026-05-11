import { SETTINGS_KEY } from "../shared/defaults";
import type { ExtensionSettings } from "../shared/types";

const YOUTUBE_CONTROL_HOST_ID = "margin-youtube-subtitle-control";
const YOUTUBE_CAPTION_HOST_ID = "margin-youtube-caption-overlay";
const YOUTUBE_CONTROL_ATTR = "data-margin-youtube-control";
const YOUTUBE_CAPTION_ATTR = "data-margin-youtube-caption-overlay";
const YOUTUBE_WATCH_PATH = "/watch";
const YOUTUBE_NAVIGATION_EVENT = "yt-navigate-finish";
const CAPTION_SEGMENT_SELECTOR = ".ytp-caption-window-container .ytp-caption-segment";

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
  observeCaptions();
  refreshCaptionTranslation();
  updateControlState();
}

function stopCaptionTranslation(): void {
  captionMode = "idle";
  activeCaptionRequest += 1;
  lastCaptionText = "";
  captionObserver?.disconnect();
  captionObserver = undefined;
  captionHost?.remove();
  captionHost = undefined;
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
    window.setTimeout(refreshCaptionTranslation, 80);
  });
  captionObserver.observe(observerTarget, { childList: true, subtree: true, characterData: true });
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

  ensureCaptionOverlay();
  const captionText = readVisibleCaptionText();
  if (!captionText) {
    renderCaptionOverlay("");
    lastCaptionText = "";
    return;
  }
  if (captionText === lastCaptionText) {
    return;
  }

  lastCaptionText = captionText;
  void translateCaption(captionText);
}

async function translateCaption(text: string): Promise<void> {
  const requestId = activeCaptionRequest + 1;
  activeCaptionRequest = requestId;
  renderCaptionOverlay("Translating...");

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
    renderCaptionOverlay(response.ok && translatedText ? translatedText : response.error || "Caption translation failed.");
  } catch (error) {
    if (captionMode !== "idle" && requestId === activeCaptionRequest) {
      renderCaptionOverlay(error instanceof Error ? error.message : "Caption translation failed.");
    }
  }
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
      border-radius: 8px;
      background: rgb(0 0 0 / 78%);
      color: #ffffff;
      font-size: clamp(16px, 2.1vw, 28px);
      font-weight: 600;
      line-height: 1.35;
      padding: 6px 12px;
      text-align: center;
      text-shadow: 0 1px 2px rgb(0 0 0 / 50%);
      white-space: pre-wrap;
    }

    .margin-youtube-caption[data-mode="translated"] {
      background: rgb(217 104 144 / 88%);
    }
  `;
  return style;
}
