import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installFloatingButton, type FloatingButtonHandle } from "./floatingButton";

const FLOATING_HOST_ID = "margin-floating-controls";

function getHost(): HTMLElement | null {
  return document.getElementById(FLOATING_HOST_ID);
}

function getPrimaryButton(): HTMLButtonElement | null {
  return (
    getHost()?.shadowRoot?.querySelector<HTMLButtonElement>(".margin-floating__button--primary") ?? null
  );
}

function getCloseButton(): HTMLButtonElement | null {
  return (
    getHost()?.shadowRoot?.querySelector<HTMLButtonElement>(".margin-floating__button--secondary") ?? null
  );
}

let handle: FloatingButtonHandle | undefined;
let toggleSpy: ReturnType<typeof vi.fn<() => void>>;

function onToggle(): void {
  toggleSpy();
}

beforeEach(() => {
  document.documentElement.innerHTML = "<head></head><body></body>";
  toggleSpy = vi.fn<() => void>();
});

afterEach(() => {
  handle?.dispose();
  handle = undefined;
});

describe("installFloatingButton", () => {
  it("does not insert anything until syncFromSettings enables it", () => {
    handle = installFloatingButton({ document, initialEnabled: false, onToggle: onToggle });
    expect(getHost()).toBeNull();
  });

  it("inserts the host when showFloatingButton is true", () => {
    handle = installFloatingButton({ document, initialEnabled: false, onToggle: onToggle });
    handle.syncFromSettings({ showFloatingButton: true, targetLanguage: "繁體中文" });

    const host = getHost();
    expect(host).not.toBeNull();
    expect(host?.shadowRoot).not.toBeNull();
    expect(getPrimaryButton()).not.toBeNull();
  });

  it("removes the host when showFloatingButton flips back to false", () => {
    handle = installFloatingButton({ document, initialEnabled: false, onToggle: onToggle });
    handle.syncFromSettings({ showFloatingButton: true });
    handle.syncFromSettings({ showFloatingButton: false });

    expect(getHost()).toBeNull();
  });

  it("uses targetLanguage in the idle aria-label", () => {
    handle = installFloatingButton({ document, initialEnabled: false, onToggle: onToggle });
    handle.syncFromSettings({ showFloatingButton: true, targetLanguage: "日本語" });

    expect(getPrimaryButton()?.getAttribute("aria-label")).toBe("Translate into 日本語");
  });

  it("flips the aria-label and host state when setEnabledState toggles", () => {
    handle = installFloatingButton({ document, initialEnabled: false, onToggle: onToggle });
    handle.syncFromSettings({ showFloatingButton: true, targetLanguage: "Español" });

    handle.setEnabledState(true);

    expect(getHost()?.getAttribute("data-state")).toBe("enabled");
    expect(getPrimaryButton()?.dataset.state).toBe("enabled");
    expect(getPrimaryButton()?.getAttribute("aria-label")).toBe("Hide Margin translations");

    handle.setEnabledState(false);

    expect(getHost()?.getAttribute("data-state")).toBe("idle");
    expect(getPrimaryButton()?.getAttribute("aria-label")).toBe("Translate into Español");
  });

  it("invokes onToggle when the primary button is clicked", () => {
    handle = installFloatingButton({ document, initialEnabled: false, onToggle: onToggle });
    handle.syncFromSettings({ showFloatingButton: true });

    getPrimaryButton()?.click();

    expect(toggleSpy).toHaveBeenCalledTimes(1);
  });

  it("hides for the current page after the close button is clicked and stays hidden across syncs", () => {
    handle = installFloatingButton({ document, initialEnabled: false, onToggle: onToggle });
    handle.syncFromSettings({ showFloatingButton: true });

    getCloseButton()?.click();
    expect(getHost()).toBeNull();

    handle.syncFromSettings({ showFloatingButton: true });
    expect(getHost()).toBeNull();
  });

  it("dispose removes the host", () => {
    handle = installFloatingButton({ document, initialEnabled: false, onToggle: onToggle });
    handle.syncFromSettings({ showFloatingButton: true });
    expect(getHost()).not.toBeNull();

    handle.dispose();
    expect(getHost()).toBeNull();
  });

  it("ignores syncFromSettings when document.body is missing", () => {
    document.body.remove();
    handle = installFloatingButton({ document, initialEnabled: false, onToggle: onToggle });
    handle.syncFromSettings({ showFloatingButton: true });

    expect(getHost()).toBeNull();
  });

  it("keeps the cached targetLanguage when a sync omits it", () => {
    handle = installFloatingButton({ document, initialEnabled: false, onToggle: onToggle });
    handle.syncFromSettings({ showFloatingButton: true, targetLanguage: "Français" });
    handle.syncFromSettings({ showFloatingButton: true });

    expect(getPrimaryButton()?.getAttribute("aria-label")).toBe("Translate into Français");
  });
});
