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

function pointerEvent(type: string, clientY: number): PointerEvent {
  return new PointerEvent(type, { clientY, button: 0, bubbles: true, cancelable: true });
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

  it("uses the dark shell theme on a dark page", () => {
    document.body.style.backgroundColor = "rgb(17, 24, 39)";
    handle = installFloatingButton({ document, initialEnabled: false, onToggle: onToggle });
    handle.syncFromSettings({ showFloatingButton: true });

    expect(getHost()?.getAttribute("data-theme")).toBe("dark");
  });

  it("uses the light shell theme on a light page", () => {
    document.body.style.backgroundColor = "rgb(255, 255, 255)";
    handle = installFloatingButton({ document, initialEnabled: false, onToggle: onToggle });
    handle.syncFromSettings({ showFloatingButton: true });

    expect(getHost()?.getAttribute("data-theme")).toBe("light");
  });

  it("defaults to the light theme when the page has no background", () => {
    handle = installFloatingButton({ document, initialEnabled: false, onToggle: onToggle });
    handle.syncFromSettings({ showFloatingButton: true });

    expect(getHost()?.getAttribute("data-theme")).toBe("light");
  });

  it("wraps the button and close affordance in a shell container", () => {
    handle = installFloatingButton({ document, initialEnabled: false, onToggle: onToggle });
    handle.syncFromSettings({ showFloatingButton: true });

    const shell = getHost()?.shadowRoot?.querySelector(".margin-floating__shell");
    expect(shell).not.toBeNull();
    expect(shell?.querySelector(".margin-floating__button--primary")).not.toBeNull();
    expect(shell?.querySelector(".margin-floating__button--secondary")).not.toBeNull();
  });

  // Viewport is 768px tall in the test env and the host measures 0 (no layout), so the
  // fallback height (46) gives bounds minTop 8 / maxTop 714; a 0.5 ratio centres at 361.
  it("drags vertically and stays pinned to the right edge", () => {
    handle = installFloatingButton({ document, initialEnabled: false, onToggle: onToggle });
    handle.syncFromSettings({ showFloatingButton: true });

    expect(getHost()?.style.top).toBe("361px");

    getPrimaryButton()?.dispatchEvent(pointerEvent("pointerdown", 361));
    document.dispatchEvent(pointerEvent("pointermove", 461));

    expect(getHost()?.style.top).toBe("461px");
    expect(getHost()?.style.right).toBe(""); // horizontal is never set inline; CSS keeps right: 0

    document.dispatchEvent(pointerEvent("pointerup", 461));
  });

  it("treats movement under the threshold as a click, not a drag", () => {
    handle = installFloatingButton({ document, initialEnabled: false, onToggle: onToggle });
    handle.syncFromSettings({ showFloatingButton: true });

    getPrimaryButton()?.dispatchEvent(pointerEvent("pointerdown", 361));
    document.dispatchEvent(pointerEvent("pointermove", 363));
    document.dispatchEvent(pointerEvent("pointerup", 363));
    getPrimaryButton()?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(getHost()?.style.top).toBe("361px");
    expect(toggleSpy).toHaveBeenCalledTimes(1);
  });

  it("suppresses the click that immediately follows a drag", () => {
    handle = installFloatingButton({ document, initialEnabled: false, onToggle: onToggle });
    handle.syncFromSettings({ showFloatingButton: true });

    getPrimaryButton()?.dispatchEvent(pointerEvent("pointerdown", 361));
    document.dispatchEvent(pointerEvent("pointermove", 461));
    document.dispatchEvent(pointerEvent("pointerup", 461));
    getPrimaryButton()?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(toggleSpy).not.toHaveBeenCalled();
  });

  it("clamps the drag to the bottom edge margin", () => {
    handle = installFloatingButton({ document, initialEnabled: false, onToggle: onToggle });
    handle.syncFromSettings({ showFloatingButton: true });

    getPrimaryButton()?.dispatchEvent(pointerEvent("pointerdown", 361));
    document.dispatchEvent(pointerEvent("pointermove", 5000));
    document.dispatchEvent(pointerEvent("pointerup", 5000));

    expect(getHost()?.style.top).toBe("714px");
  });

  it("applies initialPositionRatio and reports the new ratio after a drag", () => {
    const onPositionChange = vi.fn<(ratio: number) => void>();
    handle = installFloatingButton({
      document,
      initialEnabled: false,
      onToggle: onToggle,
      initialPositionRatio: 0,
      onPositionChange
    });
    handle.syncFromSettings({ showFloatingButton: true });

    expect(getHost()?.style.top).toBe("8px"); // ratio 0 pins to the top edge margin

    getPrimaryButton()?.dispatchEvent(pointerEvent("pointerdown", 8));
    document.dispatchEvent(pointerEvent("pointermove", 714));
    document.dispatchEvent(pointerEvent("pointerup", 714));

    expect(onPositionChange).toHaveBeenCalledTimes(1);
    expect(onPositionChange.mock.calls[0][0]).toBeCloseTo(1, 5);
  });
});
