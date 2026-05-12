import type { ExtensionSettings } from "../shared/types";

const FLOATING_HOST_ID = "margin-floating-controls";
const FLOATING_HOST_ATTR = "data-margin-floating-controls";

export interface FloatingButtonHandle {
  syncFromSettings(settings: Partial<ExtensionSettings>): void;
  setEnabledState(enabled: boolean): void;
  dispose(): void;
}

export interface FloatingButtonOptions {
  document: Document;
  initialEnabled: boolean;
  onToggle: () => void | Promise<void>;
}

export function installFloatingButton(options: FloatingButtonOptions): FloatingButtonHandle {
  const { document: doc, onToggle } = options;
  let enabled = options.initialEnabled;
  let host: HTMLElement | undefined;
  let primaryButton: HTMLButtonElement | undefined;
  let showEnabled = false;
  let hiddenForPage = false;
  let targetLanguage = "English";

  function ensureHost(): void {
    if (host || !doc.body) {
      return;
    }

    host = doc.createElement("div");
    host.id = FLOATING_HOST_ID;
    host.setAttribute(FLOATING_HOST_ATTR, "true");
    host.setAttribute("data-margin-root", "floating-controls");
    host.setAttribute("data-position", "right");
    host.setAttribute("data-theme", "light");
    host.setAttribute("data-state", enabled ? "enabled" : "idle");
    host.setAttribute("translate", "no");
    host.className = "margin-notranslate";
    const shadow = host.attachShadow({ mode: "open" });
    shadow.append(createFloatingStyles(doc), createFloatingControls(doc, handleToggle, handleClose));
    doc.documentElement.append(host);
    primaryButton = shadow.querySelector<HTMLButtonElement>(".margin-floating__button--primary") ?? undefined;
    updateLabel();
  }

  function removeHost(): void {
    host?.remove();
    host = undefined;
    primaryButton = undefined;
  }

  function handleToggle(): void {
    void onToggle();
  }

  function handleClose(): void {
    hiddenForPage = true;
    removeHost();
  }

  function updateLabel(): void {
    if (!primaryButton) {
      return;
    }
    host?.setAttribute("data-state", enabled ? "enabled" : "idle");
    primaryButton.dataset.state = enabled ? "enabled" : "idle";
    if (enabled) {
      primaryButton.title = "Hide Margin translations";
      primaryButton.setAttribute("aria-label", "Hide Margin translations");
      return;
    }
    const label = `Translate into ${targetLanguage}`;
    primaryButton.title = label;
    primaryButton.setAttribute("aria-label", label);
  }

  return {
    syncFromSettings(settings) {
      if (typeof settings.showFloatingButton === "boolean") {
        showEnabled = settings.showFloatingButton;
      }
      targetLanguage = settings.targetLanguage || targetLanguage;
      if (showEnabled && !hiddenForPage) {
        ensureHost();
      } else {
        removeHost();
      }
      updateLabel();
    },
    setEnabledState(nextEnabled) {
      enabled = nextEnabled;
      updateLabel();
    },
    dispose() {
      removeHost();
    }
  };
}

function createFloatingControls(
  doc: Document,
  onToggle: () => void,
  onClose: () => void
): HTMLElement {
  const container = doc.createElement("div");
  container.className = "margin-floating";
  container.setAttribute("part", "container");

  const primary = doc.createElement("button");
  primary.type = "button";
  primary.className = "margin-floating__button margin-floating__button--primary";
  primary.setAttribute("part", "primary-button");
  primary.append(createTranslateIcon(doc));
  primary.addEventListener("click", onToggle);

  const close = doc.createElement("button");
  close.type = "button";
  close.className = "margin-floating__button margin-floating__button--secondary";
  close.setAttribute("part", "close-button");
  close.textContent = "×";
  close.title = "Hide Margin on this page";
  close.setAttribute("aria-label", "Hide Margin floating button on this page");
  close.addEventListener("click", onClose);

  const overlay = doc.createElement("div");
  overlay.className = "margin-floating__overlay";
  overlay.setAttribute("part", "overlay");
  overlay.hidden = true;

  container.append(primary, close, overlay);
  return container;
}

function createTranslateIcon(doc: Document): SVGSVGElement {
  const icon = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
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

function createFloatingStyles(doc: Document): HTMLStyleElement {
  const style = doc.createElement("style");
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
