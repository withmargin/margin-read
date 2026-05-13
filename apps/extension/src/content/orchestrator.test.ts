import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../shared/defaults";
import type { ExtensionSettings, TextSegment, TranslationResult } from "../shared/types";
import { createOrchestrator, type ContentOrchestrator } from "./orchestrator";
import { TRANSLATION_CLASS, TRANSLATED_ATTR } from "./translationRenderer";

interface SendMessageRequest {
  type: string;
  segments?: TextSegment[];
  settings?: ExtensionSettings;
}

type SendMessageImpl = (message: SendMessageRequest) => Promise<unknown>;

let sendMessageMock: ReturnType<typeof vi.fn<SendMessageImpl>>;
let onEnabledChange: ReturnType<typeof vi.fn<(enabled: boolean) => void>>;
let orchestrator: ContentOrchestrator | undefined;

const SAMPLE_PARAGRAPH =
  "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna.";

function seedDocument(html: string): void {
  document.body.innerHTML = html;
  // happy-dom doesn't compute innerText from CSS layout; replicate the
  // simple case where innerText equals textContent so detection works.
  for (const element of Array.from(document.querySelectorAll<HTMLElement>("*"))) {
    Object.defineProperty(element, "innerText", {
      configurable: true,
      get(this: HTMLElement) {
        return this.textContent ?? "";
      }
    });
    Object.defineProperty(element, "offsetParent", {
      configurable: true,
      get() {
        return document.body;
      }
    });
  }
}

function stubComputedStyle(): CSSStyleDeclaration {
  // Return a Proxy that yields safe default strings for every CSS
  // property the production code reads. Layout/visibility paths
  // touch boxSizing, width, maxWidth, margin*, alignSelf, position,
  // overflow, clip, clipPath, font-size, etc. — returning "" or "0px"
  // keeps assignments to translation.style.* and parseCssPixels()
  // from crashing or producing NaN.
  return new Proxy(
    {
      display: "block",
      visibility: "visible",
      opacity: "1",
      position: "static",
      width: "0px",
      height: "0px",
      maxWidth: "none",
      marginLeft: "0px",
      marginRight: "0px",
      boxSizing: "content-box",
      alignSelf: "auto",
      overflow: "visible",
      clip: "auto",
      clipPath: "none",
      left: "0px",
      top: "0px"
    },
    {
      get(target, prop) {
        if (prop in target) {
          return target[prop as keyof typeof target];
        }
        return "";
      }
    }
  ) as unknown as CSSStyleDeclaration;
}

function defaultRouter(message: SendMessageRequest): unknown {
  if (message.type === "GET_SETTINGS") {
    return { ok: true, settings: DEFAULT_SETTINGS };
  }
  if (message.type === "TRANSLATE_BATCH") {
    const segments = message.segments ?? [];
    const results: TranslationResult[] = segments.map((segment) => ({
      id: segment.id,
      text: `[T] ${segment.text}`
    }));
    return { ok: true, results };
  }
  return { ok: false, error: `Unexpected message type ${message.type}` };
}

beforeEach(() => {
  document.documentElement.innerHTML = "<head></head><body></body>";
  onEnabledChange = vi.fn<(enabled: boolean) => void>();
  sendMessageMock = vi.fn<SendMessageImpl>((message) => Promise.resolve(defaultRouter(message)));

  vi.stubGlobal("chrome", { runtime: { sendMessage: sendMessageMock } });
  vi.stubGlobal("window", {
    getComputedStyle: stubComputedStyle,
    innerHeight: 800,
    setTimeout: globalThis.setTimeout.bind(globalThis)
  });
});

afterEach(() => {
  orchestrator = undefined;
  vi.unstubAllGlobals();
});

describe("createOrchestrator — initial state", () => {
  it("starts disabled and exposes empty debug state", () => {
    orchestrator = createOrchestrator({ onEnabledChange });

    expect(orchestrator.isEnabled()).toBe(false);
    const debug = orchestrator.getDebugState();
    expect(debug.enabled).toBe(false);
    expect(debug.detectedBlocks).toBe(0);
    expect(debug.translatedBlocks).toBe(0);
  });
});

describe("createOrchestrator — happy path", () => {
  it("setEnabled(true) fetches settings, detects blocks, translates, and renders", async () => {
    seedDocument(`<main><p>${SAMPLE_PARAGRAPH}</p></main>`);
    orchestrator = createOrchestrator({ onEnabledChange });

    await orchestrator.setEnabled(true);

    await vi.waitFor(() => {
      const calls = sendMessageMock.mock.calls.map(([msg]) => msg.type);
      expect(calls).toContain("GET_SETTINGS");
      expect(calls).toContain("TRANSLATE_BATCH");
      expect(document.querySelector(`.${TRANSLATION_CLASS}`)).not.toBeNull();
    });

    expect(orchestrator.isEnabled()).toBe(true);
    expect(onEnabledChange).toHaveBeenCalledWith(true);

    const translation = document.querySelector(`.${TRANSLATION_CLASS}`);
    expect(translation?.textContent).toBe(`[T] ${SAMPLE_PARAGRAPH}`);
  });

  it("tags source paragraphs with the translated attribute after translation", async () => {
    seedDocument(`<main><p>${SAMPLE_PARAGRAPH}</p></main>`);
    orchestrator = createOrchestrator({ onEnabledChange });

    await orchestrator.setEnabled(true);

    await vi.waitFor(() => {
      expect(document.querySelector(`p[${TRANSLATED_ATTR}="done"]`)).not.toBeNull();
    });
  });
});

describe("createOrchestrator — toggle lifecycle", () => {
  it("setEnabled(false) clears translation nodes and the translated attribute", async () => {
    seedDocument(`<main><p>${SAMPLE_PARAGRAPH}</p></main>`);
    orchestrator = createOrchestrator({ onEnabledChange });

    await orchestrator.setEnabled(true);
    await vi.waitFor(() => {
      expect(document.querySelector(`.${TRANSLATION_CLASS}`)).not.toBeNull();
    });

    await orchestrator.setEnabled(false);

    expect(orchestrator.isEnabled()).toBe(false);
    expect(document.querySelectorAll(`.${TRANSLATION_CLASS}`)).toHaveLength(0);
    expect(document.querySelectorAll(`[${TRANSLATED_ATTR}]`)).toHaveLength(0);
    expect(onEnabledChange).toHaveBeenLastCalledWith(false);
  });

  it("setEnabled(true) when already enabled re-fires onEnabledChange without re-fetching settings", async () => {
    seedDocument(`<main><p>${SAMPLE_PARAGRAPH}</p></main>`);
    orchestrator = createOrchestrator({ onEnabledChange });

    await orchestrator.setEnabled(true);
    await vi.waitFor(() => {
      expect(sendMessageMock.mock.calls.length).toBeGreaterThan(0);
    });
    const callsBefore = sendMessageMock.mock.calls.length;

    onEnabledChange.mockClear();
    await orchestrator.setEnabled(true);

    expect(onEnabledChange).toHaveBeenCalledWith(true);
    expect(sendMessageMock.mock.calls.length).toBe(callsBefore);
  });
});

describe("createOrchestrator — empty page", () => {
  it("records a debug error when no readable blocks are detected", async () => {
    seedDocument(`<main></main>`);
    orchestrator = createOrchestrator({ onEnabledChange });

    await orchestrator.setEnabled(true);

    const debug = orchestrator.getDebugState();
    expect(debug.detectedBlocks).toBe(0);
    expect(debug.lastError).toMatch(/No readable text blocks/);
  });
});

describe("createOrchestrator — error paths", () => {
  it("records the failure when GET_SETTINGS rejects", async () => {
    sendMessageMock.mockImplementationOnce(() => Promise.reject(new Error("network down")));

    seedDocument(`<main><p>${SAMPLE_PARAGRAPH}</p></main>`);
    orchestrator = createOrchestrator({ onEnabledChange });

    await orchestrator.setEnabled(true);

    const debug = orchestrator.getDebugState();
    expect(debug.lastError).toMatch(/network down/);
  });

  it("inserts error states when TRANSLATE_BATCH responds with ok: false", async () => {
    sendMessageMock.mockImplementation((message: SendMessageRequest) => {
      if (message.type === "GET_SETTINGS") {
        return Promise.resolve({ ok: true, settings: DEFAULT_SETTINGS });
      }
      if (message.type === "TRANSLATE_BATCH") {
        return Promise.resolve({ ok: false, error: "Provider quota exceeded" });
      }
      return Promise.resolve({ ok: false });
    });

    seedDocument(`<main><p>${SAMPLE_PARAGRAPH}</p></main>`);
    orchestrator = createOrchestrator({ onEnabledChange });

    await orchestrator.setEnabled(true);

    await vi.waitFor(() => {
      expect(document.querySelector(`p[${TRANSLATED_ATTR}="error"]`)).not.toBeNull();
    });

    const debug = orchestrator.getDebugState();
    expect(debug.lastError).toBe("Provider quota exceeded");
  });

  it("inserts error states when TRANSLATE_BATCH itself rejects (network failure)", async () => {
    sendMessageMock.mockImplementation((message: SendMessageRequest) => {
      if (message.type === "GET_SETTINGS") {
        return Promise.resolve({ ok: true, settings: DEFAULT_SETTINGS });
      }
      if (message.type === "TRANSLATE_BATCH") {
        return Promise.reject(new Error("connection refused"));
      }
      return Promise.resolve({ ok: false });
    });

    seedDocument(`<main><p>${SAMPLE_PARAGRAPH}</p></main>`);
    orchestrator = createOrchestrator({ onEnabledChange });

    await orchestrator.setEnabled(true);

    await vi.waitFor(() => {
      const debug = orchestrator?.getDebugState();
      expect(debug?.lastError).toBe("connection refused");
    });
  });

  it("flags blocks the provider did not return translations for", async () => {
    const paragraphs = Array.from({ length: 3 }, (_, i) => `${SAMPLE_PARAGRAPH} (paragraph ${i + 1})`);
    seedDocument(`<main>${paragraphs.map((text) => `<p>${text}</p>`).join("")}</main>`);

    sendMessageMock.mockImplementation((message: SendMessageRequest) => {
      if (message.type === "GET_SETTINGS") {
        return Promise.resolve({ ok: true, settings: DEFAULT_SETTINGS });
      }
      if (message.type === "TRANSLATE_BATCH") {
        const segments = message.segments ?? [];
        // Return translation only for the first segment, drop the rest.
        return Promise.resolve({
          ok: true,
          results: segments.slice(0, 1).map((segment) => ({
            id: segment.id,
            text: `[T] ${segment.text}`
          }))
        });
      }
      return Promise.resolve({ ok: false });
    });

    orchestrator = createOrchestrator({ onEnabledChange });
    await orchestrator.setEnabled(true);

    await vi.waitFor(() => {
      expect(document.querySelectorAll(`p[${TRANSLATED_ATTR}="done"]`)).toHaveLength(1);
      expect(document.querySelectorAll(`p[${TRANSLATED_ATTR}="error"]`)).toHaveLength(2);
    });
  });
});

describe("createOrchestrator — provider-specific queue", () => {
  it("uses smaller batch/concurrency for openai-compatible runtimes", async () => {
    sendMessageMock.mockImplementation((message: SendMessageRequest) => {
      if (message.type === "GET_SETTINGS") {
        return Promise.resolve({
          ok: true,
          settings: { ...DEFAULT_SETTINGS, provider: "openai-compatible" }
        });
      }
      return Promise.resolve(defaultRouter(message));
    });

    const paragraphs = Array.from({ length: 5 }, (_, i) => `${SAMPLE_PARAGRAPH} extra ${i}`);
    seedDocument(`<main>${paragraphs.map((text) => `<p>${text}</p>`).join("")}</main>`);
    orchestrator = createOrchestrator({ onEnabledChange });

    await orchestrator.setEnabled(true);
    await vi.waitFor(() => {
      expect(document.querySelectorAll(`p[${TRANSLATED_ATTR}="done"]`).length).toBeGreaterThan(0);
    });

    const batches = sendMessageMock.mock.calls
      .map(([msg]) => msg)
      .filter((msg) => msg.type === "TRANSLATE_BATCH")
      .map((msg) => msg.segments?.length ?? 0);
    // Local LLM batch size is 3, so 5 paragraphs split into batches no
    // larger than 3 each.
    expect(batches.length).toBeGreaterThanOrEqual(2);
    expect(Math.max(...batches)).toBeLessThanOrEqual(3);
  });
});

describe("createOrchestrator — DOM observers", () => {
  it("rescans when DOM mutations add new translatable content", async () => {
    seedDocument(`<main><p>${SAMPLE_PARAGRAPH}</p></main>`);
    orchestrator = createOrchestrator({ onEnabledChange });

    await orchestrator.setEnabled(true);
    await vi.waitFor(() => {
      expect(document.querySelectorAll(`p[${TRANSLATED_ATTR}="done"]`).length).toBe(1);
    });

    // Add a new paragraph dynamically — should trigger MutationObserver
    // → debounced rescan → TRANSLATE_BATCH for the new block.
    const newP = document.createElement("p");
    newP.textContent = `${SAMPLE_PARAGRAPH} added dynamically.`;
    Object.defineProperty(newP, "innerText", {
      configurable: true,
      get(this: HTMLElement) {
        return this.textContent ?? "";
      }
    });
    Object.defineProperty(newP, "offsetParent", {
      configurable: true,
      get() {
        return document.body;
      }
    });
    document.querySelector("main")?.append(newP);

    await vi.waitFor(
      () => {
        expect(document.querySelectorAll(`p[${TRANSLATED_ATTR}="done"]`).length).toBe(2);
      },
      { timeout: 2000 }
    );
  });

  it("ignores mutations caused by Margin's own translation node inserts", async () => {
    seedDocument(`<main><p>${SAMPLE_PARAGRAPH}</p></main>`);
    orchestrator = createOrchestrator({ onEnabledChange });

    await orchestrator.setEnabled(true);
    await vi.waitFor(() => {
      expect(document.querySelectorAll(`.${TRANSLATION_CLASS}`).length).toBe(1);
    });

    const batchCallsBefore = sendMessageMock.mock.calls.filter(([msg]) => msg.type === "TRANSLATE_BATCH").length;

    // Wait through the 600ms debounce window — no extra TRANSLATE_BATCH
    // should fire just because the renderer inserted its own translation
    // nodes.
    await new Promise((resolve) => setTimeout(resolve, 800));

    const batchCallsAfter = sendMessageMock.mock.calls.filter(([msg]) => msg.type === "TRANSLATE_BATCH").length;
    expect(batchCallsAfter).toBe(batchCallsBefore);
  });
});

describe("createOrchestrator — settings fallbacks", () => {
  it("falls back to defaults when settings response omits fields", async () => {
    sendMessageMock.mockImplementation((message: SendMessageRequest) => {
      if (message.type === "GET_SETTINGS") {
        // Settings response with literally no settings keys — every
        // field should fall back to its hardcoded default.
        return Promise.resolve({ ok: true, settings: {} });
      }
      return Promise.resolve(defaultRouter(message));
    });

    seedDocument(`<main><p>${SAMPLE_PARAGRAPH}</p></main>`);
    orchestrator = createOrchestrator({ onEnabledChange });

    await orchestrator.setEnabled(true);

    await vi.waitFor(() => {
      expect(document.querySelectorAll(`p[${TRANSLATED_ATTR}="done"]`)).toHaveLength(1);
    });
  });

  it("falls back to defaults when settings response has no settings property at all", async () => {
    sendMessageMock.mockImplementation((message: SendMessageRequest) => {
      if (message.type === "GET_SETTINGS") {
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve(defaultRouter(message));
    });

    seedDocument(`<main><p>${SAMPLE_PARAGRAPH}</p></main>`);
    orchestrator = createOrchestrator({ onEnabledChange });

    await orchestrator.setEnabled(true);

    await vi.waitFor(() => {
      expect(document.querySelectorAll(`p[${TRANSLATED_ATTR}="done"]`)).toHaveLength(1);
    });
  });
});

describe("createOrchestrator — viewport prioritisation", () => {
  function setRect(element: HTMLElement, rect: Partial<DOMRect>): void {
    Object.defineProperty(element, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        toJSON: () => ({}),
        ...rect
      })
    });
  }

  it("translates blocks across all three viewport priority bands", async () => {
    seedDocument(
      `<main>
        <p id="inview">${SAMPLE_PARAGRAPH}</p>
        <p id="near">${SAMPLE_PARAGRAPH}</p>
        <p id="far">${SAMPLE_PARAGRAPH}</p>
      </main>`
    );

    // viewport = 800px tall (from window.innerHeight stub)
    setRect(document.getElementById("inview") as HTMLElement, { top: 100, bottom: 200 });
    // near band: between 1x and 2.5x viewport away
    setRect(document.getElementById("near") as HTMLElement, { top: 1200, bottom: 1300 });
    // far band: beyond 2.5x viewport
    setRect(document.getElementById("far") as HTMLElement, { top: 5000, bottom: 5100 });

    orchestrator = createOrchestrator({ onEnabledChange });
    await orchestrator.setEnabled(true);

    await vi.waitFor(() => {
      expect(document.querySelectorAll(`p[${TRANSLATED_ATTR}="done"]`).length).toBe(3);
    });
  });
});

describe("createOrchestrator — debug state plumbing", () => {
  it("reflects detected and translated counts after a scan in debug mode", async () => {
    sendMessageMock.mockImplementation((message: SendMessageRequest) => {
      if (message.type === "GET_SETTINGS") {
        return Promise.resolve({
          ok: true,
          settings: { ...DEFAULT_SETTINGS, debugMode: true }
        });
      }
      return Promise.resolve(defaultRouter(message));
    });

    seedDocument(`<main><p>${SAMPLE_PARAGRAPH}</p><p>${SAMPLE_PARAGRAPH} extra</p></main>`);
    orchestrator = createOrchestrator({ onEnabledChange });

    await orchestrator.setEnabled(true);
    await vi.waitFor(() => {
      expect(document.querySelectorAll(`[${TRANSLATED_ATTR}="done"]`).length).toBeGreaterThan(0);
    });

    const debug = orchestrator.getDebugState();
    expect(debug.debugMode).toBe(true);
    expect(debug.detectedBlocks).toBeGreaterThan(0);
    expect(debug.translatedBlocks).toBeGreaterThan(0);
    expect(debug.lastScanAt).toBeGreaterThan(0);
  });
});
