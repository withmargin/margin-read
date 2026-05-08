interface PageStateResponse {
  ok: boolean;
  enabled?: boolean;
  error?: string;
}

const statusEl = document.querySelector<HTMLParagraphElement>("#status");
const toggleButton = document.querySelector<HTMLButtonElement>("#toggle");
const optionsLink = document.querySelector<HTMLAnchorElement>("#options");

let enabled = false;

void initialize();

async function initialize(): Promise<void> {
  optionsLink?.addEventListener("click", (event) => {
    event.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  toggleButton?.addEventListener("click", async () => {
    await sendToggle(!enabled);
  });

  const response = await sendToActiveTab({ type: "GET_PAGE_STATE" });
  if (response?.ok) {
    enabled = Boolean(response.enabled);
    render();
  } else {
    setStatus(response?.error ?? "Open a webpage to use Rosetta.");
  }
}

async function sendToggle(nextEnabled: boolean): Promise<void> {
  const response = await sendToActiveTab({ type: "TOGGLE_TRANSLATION", enabled: nextEnabled });
  if (response?.ok) {
    enabled = Boolean(response.enabled);
    render();
  } else {
    setStatus(response?.error ?? "Could not reach this page.");
  }
}

async function sendToActiveTab(message: unknown): Promise<PageStateResponse | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.id) {
    return undefined;
  }
  try {
    return (await chrome.tabs.sendMessage(tab.id, message)) as PageStateResponse;
  } catch {
    return { ok: false, error: "This page cannot be translated. Try a regular webpage." };
  }
}

function render(): void {
  if (toggleButton) {
    toggleButton.textContent = enabled ? "Disable on this page" : "Translate this page";
  }
  setStatus(enabled ? "Bilingual translation is enabled." : "Ready to translate the current page.");
}

function setStatus(message: string): void {
  if (statusEl) {
    statusEl.textContent = message;
  }
}
