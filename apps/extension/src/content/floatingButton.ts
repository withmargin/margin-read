import type { ExtensionSettings } from "../shared/types";

const FLOATING_HOST_ID = "margin-floating-controls";
const FLOATING_HOST_ATTR = "data-margin-floating-controls";

// Drag tuning. The button only moves vertically and always stays pinned to the right
// edge; EDGE_MARGIN keeps it fully on screen, and DRAG_THRESHOLD separates a click (toggle)
// from a drag. FALLBACK_HOST_HEIGHT is used when layout has not measured the host yet.
const EDGE_MARGIN = 8;
const DRAG_THRESHOLD = 4;
const FALLBACK_HOST_HEIGHT = 46;
const DEFAULT_POSITION_RATIO = 0.5;

export interface FloatingButtonHandle {
  syncFromSettings(settings: Partial<ExtensionSettings>): void;
  setEnabledState(enabled: boolean): void;
  dispose(): void;
}

export interface FloatingButtonOptions {
  document: Document;
  initialEnabled: boolean;
  onToggle: () => void | Promise<void>;
  // Vertical position as a 0..1 ratio of the available height (0 = top edge, 1 = bottom).
  // Null/undefined centres the button. Reported back via onPositionChange after a drag.
  initialPositionRatio?: number | null;
  onPositionChange?: (ratio: number) => void;
  // Invoked when the close (×) button turns the feature off, so the caller can persist
  // showFloatingButton = false (keeping the options page in sync).
  onClose?: () => void;
}

export function installFloatingButton(options: FloatingButtonOptions): FloatingButtonHandle {
  const { document: doc, onToggle } = options;
  let enabled = options.initialEnabled;
  let host: HTMLElement | undefined;
  let primaryButton: HTMLButtonElement | undefined;
  let showEnabled = false;
  let targetLanguage = "English";

  let positionRatio = clampRatio(options.initialPositionRatio ?? DEFAULT_POSITION_RATIO);
  let currentTop = 0;
  let pointerActive = false;
  let dragging = false;
  let suppressClick = false;
  let dragStartPointerY = 0;
  let dragStartTop = 0;

  function ensureHost(): void {
    if (host || !doc.body) {
      return;
    }

    host = doc.createElement("div");
    host.id = FLOATING_HOST_ID;
    host.setAttribute(FLOATING_HOST_ATTR, "true");
    host.setAttribute("data-margin-root", "floating-controls");
    host.setAttribute("data-position", "right");
    host.setAttribute("data-theme", detectPageTheme(doc));
    host.setAttribute("data-state", enabled ? "enabled" : "idle");
    host.setAttribute("translate", "no");
    host.className = "margin-notranslate";
    const shadow = host.attachShadow({ mode: "open" });
    shadow.append(createFloatingStyles(doc), createFloatingControls(doc, handlePrimaryClick, handleClose));
    doc.documentElement.append(host);
    primaryButton = shadow.querySelector<HTMLButtonElement>(".margin-floating__button--primary") ?? undefined;
    const dragHandle = shadow.querySelector<HTMLElement>(".margin-floating__shell") ?? primaryButton;
    dragHandle?.addEventListener("pointerdown", handlePointerDown);
    applyPosition();
    doc.defaultView?.addEventListener("resize", applyPosition);
    updateLabel();
  }

  function removeHost(): void {
    doc.defaultView?.removeEventListener("resize", applyPosition);
    doc.removeEventListener("pointermove", handlePointerMove);
    doc.removeEventListener("pointerup", handlePointerUp);
    pointerActive = false;
    dragging = false;
    host?.remove();
    host = undefined;
    primaryButton = undefined;
  }

  function handleToggle(): void {
    void onToggle();
  }

  // A click fires after a drag ends on the same button, so swallow that one click.
  function handlePrimaryClick(): void {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    handleToggle();
  }

  function handlePointerDown(event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }
    pointerActive = true;
    dragging = false;
    suppressClick = false;
    dragStartPointerY = event.clientY;
    dragStartTop = currentTop;
    doc.addEventListener("pointermove", handlePointerMove);
    doc.addEventListener("pointerup", handlePointerUp);
  }

  function handlePointerMove(event: PointerEvent): void {
    if (!pointerActive) {
      return;
    }
    const delta = event.clientY - dragStartPointerY;
    if (!dragging && Math.abs(delta) < DRAG_THRESHOLD) {
      return;
    }
    dragging = true;
    event.preventDefault();
    setTop(dragStartTop + delta);
  }

  function handlePointerUp(): void {
    doc.removeEventListener("pointermove", handlePointerMove);
    doc.removeEventListener("pointerup", handlePointerUp);
    pointerActive = false;
    if (dragging) {
      suppressClick = true;
      positionRatio = topToRatio(currentTop);
      options.onPositionChange?.(positionRatio);
    }
  }

  function verticalBounds(): { minTop: number; maxTop: number } {
    const viewportHeight = doc.defaultView?.innerHeight ?? 0;
    const hostHeight = host?.getBoundingClientRect().height || FALLBACK_HOST_HEIGHT;
    const minTop = EDGE_MARGIN;
    const maxTop = Math.max(minTop, viewportHeight - hostHeight - EDGE_MARGIN);
    return { minTop, maxTop };
  }

  // Horizontal position is never touched — the host stays pinned to the right edge (CSS
  // right: 0), so the button is always against the edge. Only `top` moves.
  function setTop(top: number): void {
    const { minTop, maxTop } = verticalBounds();
    currentTop = Math.min(Math.max(top, minTop), maxTop);
    if (host) {
      host.style.top = `${currentTop}px`;
      host.style.transform = "none";
    }
  }

  function applyPosition(): void {
    const { minTop, maxTop } = verticalBounds();
    setTop(minTop + positionRatio * (maxTop - minTop));
  }

  function topToRatio(top: number): number {
    const { minTop, maxTop } = verticalBounds();
    if (maxTop <= minTop) {
      return DEFAULT_POSITION_RATIO;
    }
    return clampRatio((top - minTop) / (maxTop - minTop));
  }

  function handleClose(): void {
    removeHost();
    options.onClose?.();
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
      if (showEnabled) {
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

function clampRatio(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_POSITION_RATIO;
  }
  return Math.min(1, Math.max(0, value));
}

// Pick a shell theme from the page's effective background: a dark page gets the dark shell,
// a light (or unknown/transparent) page gets the white shell.
function detectPageTheme(doc: Document): "dark" | "light" {
  const view = doc.defaultView;
  if (!view) {
    return "light";
  }
  const background = effectivePageBackground(doc, view);
  if (!background) {
    return "light";
  }
  // Perceived brightness (YIQ); below mid-scale reads as a dark page.
  const brightness = (background.r * 299 + background.g * 587 + background.b * 114) / 1000;
  return brightness < 128 ? "dark" : "light";
}

function effectivePageBackground(
  doc: Document,
  view: Window
): { r: number; g: number; b: number } | undefined {
  for (const element of [doc.body, doc.documentElement]) {
    if (!element) {
      continue;
    }
    const color = parseRgbColor(view.getComputedStyle(element).backgroundColor);
    if (color && color.a > 0) {
      return color;
    }
  }
  return undefined;
}

// Parses the rgb()/rgba() strings that getComputedStyle returns. Returns undefined for
// anything else (e.g. a transparent keyword), which the caller treats as "no background".
function parseRgbColor(value: string): { r: number; g: number; b: number; a: number } | undefined {
  const match = /rgba?\(([^)]+)\)/i.exec(value);
  if (!match) {
    return undefined;
  }
  const parts = match[1]
    .split(/[,\s/]+/)
    .map((part) => Number.parseFloat(part))
    .filter((part) => Number.isFinite(part));
  if (parts.length < 3) {
    return undefined;
  }
  return { r: parts[0], g: parts[1], b: parts[2], a: parts.length >= 4 ? parts[3] : 1 };
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
  close.append(createCloseIcon(doc));
  close.title = "Turn off the Margin button";
  close.setAttribute("aria-label", "Turn off the Margin floating button");
  close.addEventListener("click", onClose);

  // Outer container: a backdrop that holds the button and doubles as the drag handle. Its
  // right edge is flush with the screen; the left side curves around the button.
  const shell = doc.createElement("div");
  shell.className = "margin-floating__shell";
  shell.setAttribute("part", "shell");
  shell.append(primary);

  const overlay = doc.createElement("div");
  overlay.className = "margin-floating__overlay";
  overlay.setAttribute("part", "overlay");
  overlay.hidden = true;

  // Close sits outside the shell (revealed on hover), so it never crowds the button.
  container.append(shell, close, overlay);
  return container;
}

// A geometric cross, so the mark is centred regardless of the font's "×" glyph metrics.
function createCloseIcon(doc: Document): SVGSVGElement {
  const icon = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("viewBox", "0 0 10 10");
  icon.setAttribute("aria-hidden", "true");
  icon.setAttribute("focusable", "false");
  icon.classList.add("margin-floating__close-icon");
  icon.innerHTML =
    '<path d="M2.4 2.4 7.6 7.6M7.6 2.4 2.4 7.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none" />';
  return icon;
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

    /* Non-interactive positioning context: empty areas never block the underlying page. */
    .margin-floating {
      position: relative;
      pointer-events: none;
    }

    .margin-floating__shell {
      position: relative;
      box-sizing: border-box;
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      padding: 4px;
      /* Flat right edge (flush to screen), rounded left around the button. */
      border-radius: 999px 0 0 999px;
      background: rgb(255 255 255 / 92%);
      box-shadow: 0 10px 28px rgb(15 23 42 / 20%);
      opacity: 0.8;
      pointer-events: auto;
      cursor: grab;
      touch-action: none;
      transition:
        transform 140ms ease,
        box-shadow 140ms ease,
        opacity 140ms ease;
    }

    :host([data-theme="dark"]) .margin-floating__shell {
      background: rgb(17 24 39 / 88%);
      box-shadow: 0 10px 28px rgb(15 23 42 / 38%);
    }

    /* Idle controls stay slightly transparent to reduce intrusion; hover/focus over any
       part of the control (button or close) makes the whole thing solid. */
    .margin-floating:hover .margin-floating__shell,
    .margin-floating:focus-within .margin-floating__shell {
      opacity: 1;
      transform: translateY(-1px);
      box-shadow: 0 14px 34px rgb(15 23 42 / 32%);
    }

    .margin-floating__button {
      box-sizing: border-box;
      display: grid;
      place-items: center;
      border: 0;
      border-radius: 999px;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      padding: 0;
      line-height: 1;
      cursor: pointer;
      transition:
        transform 140ms ease,
        box-shadow 140ms ease,
        opacity 140ms ease;
    }

    .margin-floating__button:focus-visible {
      outline: 3px solid rgb(47 111 237 / 40%);
      outline-offset: 3px;
    }

    .margin-floating__button--primary {
      width: 32px;
      height: 32px;
      background: #d96890;
    }

    .margin-floating__button--primary[data-state="enabled"] {
      background: #d96890;
    }

    /* Outside the shell, to its left with a gap, so it never sits over the button. Themed
       against the page (not the shell) since it floats on the page background. */
    .margin-floating__button--secondary {
      position: absolute;
      top: 50%;
      right: 48px;
      width: 18px;
      height: 18px;
      color: #ffffff;
      background: rgb(30 41 59 / 55%);
      box-shadow: 0 2px 8px rgb(15 23 42 / 20%);
      opacity: 0;
      pointer-events: none;
      transform: translateY(-50%) scale(0.9);
    }

    :host([data-theme="dark"]) .margin-floating__button--secondary {
      color: #1e293b;
      background: rgb(255 255 255 / 78%);
    }

    .margin-floating__close-icon {
      width: 9px;
      height: 9px;
      display: block;
    }

    .margin-floating:hover .margin-floating__button--secondary,
    .margin-floating:focus-within .margin-floating__button--secondary {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(-50%) scale(1);
    }

    .margin-floating__icon {
      width: 18px;
      height: 18px;
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

      .margin-floating__shell {
        width: 36px;
        height: 36px;
      }

      .margin-floating__button--primary {
        width: 28px;
        height: 28px;
      }

      .margin-floating__icon {
        width: 16px;
        height: 16px;
      }
    }
  `;
  return style;
}
