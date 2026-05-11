import type { PageDebugState } from "../shared/types";

interface PageStateResponse {
  ok: boolean;
  enabled?: boolean;
  error?: string;
  debug?: PageDebugState;
}

const statusEl = document.querySelector<HTMLParagraphElement>("#status");
const toggleButton = document.querySelector<HTMLButtonElement>("#toggle");
const optionsLink = document.querySelector<HTMLAnchorElement>("#options");
const debugEl = document.querySelector<HTMLPreElement>("#debug");

let enabled = false;
let debugState: PageDebugState | undefined;

void initialize();

async function initialize(): Promise<void> {
  optionsLink?.addEventListener("click", (event) => {
    event.preventDefault();
    void chrome.runtime.openOptionsPage();
  });

  toggleButton?.addEventListener("click", () => {
    void sendToggle(!enabled);
  });

  const response = await sendToActiveTab({ type: "GET_PAGE_STATE" });
  if (response?.ok) {
    enabled = Boolean(response.enabled);
    debugState = response.debug;
    render();
  } else {
    setStatus(response?.error ?? "Open a webpage to use Margin.");
    renderDebug(undefined);
  }
}

async function sendToggle(nextEnabled: boolean): Promise<void> {
  const response = await sendToActiveTab({ type: "TOGGLE_TRANSLATION", enabled: nextEnabled });
  if (response?.ok) {
    enabled = Boolean(response.enabled);
    debugState = response.debug;
    render();
  } else {
    setStatus(response?.error ?? "Could not reach this page.");
    renderDebug(undefined);
  }
}

async function sendToActiveTab(message: unknown): Promise<PageStateResponse | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.id) {
    return undefined;
  }
  try {
    return await chrome.tabs.sendMessage(tab.id, message);
  } catch {
    return { ok: false, error: "This page cannot be translated. Try a regular webpage." };
  }
}

function render(): void {
  if (toggleButton) {
    toggleButton.textContent = enabled ? "Disable on this page" : "Translate this page";
  }
  setStatus(enabled ? "Bilingual translation is enabled." : "Ready to translate the current page.");
  renderDebug(debugState);
}

function setStatus(message: string): void {
  if (statusEl) {
    statusEl.textContent = message;
  }
}

function renderDebug(debug: PageDebugState | undefined): void {
  if (!debugEl) {
    return;
  }
  if (!debug?.debugMode) {
    debugEl.hidden = true;
    debugEl.textContent = "";
    return;
  }

  debugEl.hidden = false;
  debugEl.textContent = [
    `Enabled: ${debug.enabled ? "yes" : "no"}`,
    `Detected blocks: ${debug.detectedBlocks}`,
    `Enqueued blocks: ${debug.enqueuedBlocks}`,
    `Queue size: ${debug.queueSize}`,
    `Running requests: ${debug.runningRequests}`,
    `Pending blocks: ${debug.pendingBlocks}`,
    `Translated blocks: ${debug.translatedBlocks}`,
    `Error blocks: ${debug.errorBlocks}`,
    `Last scan: ${debug.lastScanAt ? new Date(debug.lastScanAt).toLocaleTimeString() : "never"}`,
    `Last error: ${debug.lastError ?? "none"}`,
    `Sample: ${debug.sampleText ?? "none"}`
  ].join("\n");
}
