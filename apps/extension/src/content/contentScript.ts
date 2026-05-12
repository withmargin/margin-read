import { SETTINGS_KEY } from "../shared/defaults";
import type { ExtensionSettings, RuntimeMessage } from "../shared/types";
import { installFloatingButton, type FloatingButtonHandle } from "./floatingButton";
import { createOrchestrator } from "./orchestrator";
import { initializeYouTubeControls } from "./siteAdapters/youtube";

interface SettingsResponse {
  ok: boolean;
  settings?: Partial<ExtensionSettings>;
}

let floatingButton: FloatingButtonHandle | undefined;

const orchestrator = createOrchestrator({
  onEnabledChange: (enabled) => {
    floatingButton?.setEnabledState(enabled);
  }
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  if (message.type === "TOGGLE_TRANSLATION") {
    const next = typeof message.enabled === "boolean" ? message.enabled : !orchestrator.isEnabled();
    void orchestrator.setEnabled(next).finally(() => {
      sendResponse({ ok: true, enabled: orchestrator.isEnabled(), debug: orchestrator.getDebugState() });
    });
    return true;
  }

  if (message.type === "GET_PAGE_STATE") {
    sendResponse({ ok: true, enabled: orchestrator.isEnabled(), debug: orchestrator.getDebugState() });
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
    floatingButton?.syncFromSettings(nextSettings);
  }
});

async function initializeFloatingButton(): Promise<void> {
  if (!document.body) {
    window.addEventListener("DOMContentLoaded", () => void initializeFloatingButton(), { once: true });
    return;
  }

  floatingButton = installFloatingButton({
    document,
    initialEnabled: orchestrator.isEnabled(),
    onToggle: () => orchestrator.setEnabled(!orchestrator.isEnabled())
  });

  try {
    const response: SettingsResponse = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
    if (response.settings) {
      floatingButton.syncFromSettings(response.settings);
    }
  } catch {
    floatingButton.dispose();
    floatingButton = undefined;
  }
}
