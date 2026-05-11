import { SETTINGS_KEY } from "../shared/defaults";
import type { ExtensionSettings } from "../shared/types";

const YOUTUBE_CONTROL_HOST_ID = "margin-youtube-subtitle-control";
const YOUTUBE_CONTROL_ATTR = "data-margin-youtube-control";
const YOUTUBE_WATCH_PATH = "/watch";
const YOUTUBE_NAVIGATION_EVENT = "yt-navigate-finish";

let observer: MutationObserver | undefined;
let rescanTimer: number | undefined;
let controlHost: HTMLElement | undefined;
let targetLanguage = "English";
let installed = false;

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
  removeYouTubeControl();
  if (installed) {
    window.removeEventListener(YOUTUBE_NAVIGATION_EVENT, scheduleYouTubeControlScan);
    window.removeEventListener("popstate", scheduleYouTubeControlScan);
    installed = false;
  }
  targetLanguage = "English";
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

function findRightControls(): HTMLElement | undefined {
  const controls =
    document.querySelector(".html5-video-player .ytp-right-controls") ?? document.querySelector(".ytp-right-controls");
  return controls instanceof HTMLElement ? controls : undefined;
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
    root.dataset.mode = root.dataset.mode === "bilingual" ? "idle" : "bilingual";
    root.dataset.open = "false";
    updateControlState();
  });
  bilingualItem.dataset.action = "bilingual";

  const translateItem = createMenuItem("Translated captions", "Show only translated captions.", () => {
    root.dataset.mode = root.dataset.mode === "translated" ? "idle" : "translated";
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
  return node instanceof HTMLElement && (node.hasAttribute(YOUTUBE_CONTROL_ATTR) || node.id === YOUTUBE_CONTROL_HOST_ID);
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
