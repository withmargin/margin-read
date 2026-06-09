import { applyI18n, msg } from "../shared/i18n";
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
  applyI18n();

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
    setStatus(response?.error ?? msg("popupOpenWebpage"));
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
    setStatus(response?.error ?? msg("popupUnreachable"));
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
    return { ok: false, error: msg("popupCannotTranslate") };
  }
}

function render(): void {
  if (toggleButton) {
    toggleButton.textContent = msg(enabled ? "popupDisable" : "popupTranslate");
  }
  setStatus(msg(enabled ? "popupBilingualEnabled" : "popupReady"));
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
    ...(debug.providerConfig
      ? [
          `Provider: ${debug.providerConfig.providerName}`,
          `Model: ${debug.providerConfig.model}`,
          `Endpoint: ${debug.providerConfig.endpoint}`,
          `Structured output: ${debug.providerConfig.structuredOutput}`,
          `Extension version: ${debug.providerConfig.extensionVersion ?? "unknown"}`
        ]
      : []),
    `Detected blocks: ${debug.detectedBlocks}`,
    `Total enqueued: ${debug.enqueuedBlocks}`,
    `Queue size: ${debug.queueSize}`,
    `Running requests: ${debug.runningRequests}`,
    `Last request started: ${debug.lastProviderRequestStartedAt ? new Date(debug.lastProviderRequestStartedAt).toLocaleTimeString() : "never"}`,
    `Last request finished: ${debug.lastProviderRequestFinishedAt ? new Date(debug.lastProviderRequestFinishedAt).toLocaleTimeString() : "never"}`,
    `Last provider duration: ${formatProviderDuration(debug.lastProviderDurationMs)}`,
    `Pending blocks: ${debug.pendingBlocks}`,
    `Translated blocks: ${debug.translatedBlocks}`,
    `Error blocks: ${debug.errorBlocks}`,
    `Last scan: ${debug.lastScanAt ? new Date(debug.lastScanAt).toLocaleTimeString() : "never"}`,
    `Last error: ${debug.lastError ?? "none"}`,
    `Sample: ${debug.sampleText ?? "none"}`
  ].join("\n");
}

function formatProviderDuration(durationMs: number | undefined): string {
  if (durationMs === undefined) {
    return "none";
  }
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }
  return `${(durationMs / 1000).toFixed(1)}s`;
}
