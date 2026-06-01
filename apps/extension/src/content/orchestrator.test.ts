import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../shared/defaults";
import type { LocalTranslationProviderId } from "../shared/localProviders";
import type { ExtensionSettings, RuntimeMessage, TextSegment, TranslationResult } from "../shared/types";
import { createOrchestrator, type ContentOrchestrator } from "./orchestrator";
import { TRANSLATION_CLASS, TRANSLATED_ATTR } from "./translationRenderer";

type SendMessageImpl = (message: RuntimeMessage) => Promise<unknown>;

const SAMPLE_PARAGRAPH =
  "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna.";

const TRANSLATION_PREFIX = "[T] ";
const VIEWPORT_HEIGHT = 800;
const NEAR_VIEWPORT_TOP = 1200;
const FAR_VIEWPORT_TOP = 5000;
// Slightly longer than orchestrator.ts's 600ms debounce so a spurious
// rescan would have fired by the time we sample.
const DEBOUNCE_QUIESCE_MS = 700;

let sendMessageMock: ReturnType<typeof vi.fn<SendMessageImpl>>;
let onEnabledChange: ReturnType<typeof vi.fn<(enabled: boolean) => void>>;
let activeOrchestrator: ContentOrchestrator | undefined;

function makeElementVisible(element: HTMLElement): void {
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

function seedDocument(html: string): void {
  document.body.innerHTML = html;
  for (const element of Array.from(document.querySelectorAll<HTMLElement>("*"))) {
    makeElementVisible(element);
  }
}

function stubComputedStyle(): CSSStyleDeclaration {
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

interface RouterOverrides {
  settings?: Partial<ExtensionSettings> | null;
  translateBatch?: (segments: TextSegment[]) => unknown;
}

function makeRouter(overrides: RouterOverrides = {}): SendMessageImpl {
  return (message) => {
    if (message.type === "GET_SETTINGS") {
      if (overrides.settings === null) {
        return Promise.resolve({ ok: true });
      }
      const settings = overrides.settings ?? DEFAULT_SETTINGS;
      return Promise.resolve({ ok: true, settings });
    }
    if (message.type === "TRANSLATE_BATCH") {
      if (overrides.translateBatch) {
        return Promise.resolve(overrides.translateBatch(message.segments));
      }
      const results: TranslationResult[] = message.segments.map((segment) => ({
        id: segment.id,
        text: `${TRANSLATION_PREFIX}${segment.text}`
      }));
      return Promise.resolve({ ok: true, results });
    }
    return Promise.resolve({ ok: false, error: `Unexpected message type ${message.type}` });
  };
}

function useRouter(overrides: RouterOverrides = {}): void {
  sendMessageMock.mockImplementation(makeRouter(overrides));
}

function createTestOrchestrator(): ContentOrchestrator {
  const orchestrator = createOrchestrator({ onEnabledChange });
  activeOrchestrator = orchestrator;
  return orchestrator;
}

beforeEach(() => {
  document.documentElement.innerHTML = "<head></head><body></body>";
  onEnabledChange = vi.fn<(enabled: boolean) => void>();
  sendMessageMock = vi.fn<SendMessageImpl>(makeRouter());

  vi.stubGlobal("chrome", { runtime: { sendMessage: sendMessageMock, getManifest: () => ({ version: "0.3.2" }) } });
  vi.stubGlobal("window", {
    getComputedStyle: stubComputedStyle,
    innerHeight: VIEWPORT_HEIGHT,
    setTimeout: globalThis.setTimeout.bind(globalThis)
  });
});

afterEach(async () => {
  if (activeOrchestrator && activeOrchestrator.isEnabled()) {
    await activeOrchestrator.setEnabled(false);
  }
  activeOrchestrator = undefined;
  vi.unstubAllGlobals();
});

describe("createOrchestrator — initial state", () => {
  it("starts disabled and exposes empty debug state", () => {
    const orchestrator = createTestOrchestrator();

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
    const orchestrator = createTestOrchestrator();

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
    expect(translation?.textContent).toBe(`${TRANSLATION_PREFIX}${SAMPLE_PARAGRAPH}`);
  });

  it("tags source paragraphs with the translated attribute after translation", async () => {
    seedDocument(`<main><p>${SAMPLE_PARAGRAPH}</p></main>`);
    const orchestrator = createTestOrchestrator();

    await orchestrator.setEnabled(true);

    await vi.waitFor(() => {
      expect(document.querySelector(`p[${TRANSLATED_ATTR}="done"]`)).not.toBeNull();
    });
  });
});

describe("createOrchestrator — toggle lifecycle", () => {
  it("setEnabled(false) clears translation nodes and the translated attribute", async () => {
    seedDocument(`<main><p>${SAMPLE_PARAGRAPH}</p></main>`);
    const orchestrator = createTestOrchestrator();

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
    const orchestrator = createTestOrchestrator();

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
    const orchestrator = createTestOrchestrator();

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
    const orchestrator = createTestOrchestrator();

    await orchestrator.setEnabled(true);

    expect(orchestrator.getDebugState().lastError).toMatch(/network down/);
  });

  it("inserts error states when TRANSLATE_BATCH responds with ok: false", async () => {
    useRouter({ translateBatch: () => ({ ok: false, error: "Provider quota exceeded" }) });

    seedDocument(`<main><p>${SAMPLE_PARAGRAPH}</p></main>`);
    const orchestrator = createTestOrchestrator();

    await orchestrator.setEnabled(true);

    await vi.waitFor(() => {
      expect(document.querySelector(`p[${TRANSLATED_ATTR}="error"]`)).not.toBeNull();
    });

    expect(orchestrator.getDebugState().lastError).toBe("Provider quota exceeded");
  });

  it("inserts error states when TRANSLATE_BATCH itself rejects (network failure)", async () => {
    sendMessageMock.mockImplementation((message) => {
      if (message.type === "GET_SETTINGS") {
        return Promise.resolve({ ok: true, settings: DEFAULT_SETTINGS });
      }
      if (message.type === "TRANSLATE_BATCH") {
        return Promise.reject(new Error("connection refused"));
      }
      return Promise.resolve({ ok: false });
    });

    seedDocument(`<main><p>${SAMPLE_PARAGRAPH}</p></main>`);
    const orchestrator = createTestOrchestrator();

    await orchestrator.setEnabled(true);

    await vi.waitFor(() => {
      expect(orchestrator.getDebugState().lastError).toBe("connection refused");
    });
  });

  it("flags blocks the provider did not return translations for", async () => {
    const paragraphs = Array.from({ length: 3 }, (_, i) => `${SAMPLE_PARAGRAPH} (paragraph ${i + 1})`);
    seedDocument(`<main>${paragraphs.map((text) => `<p>${text}</p>`).join("")}</main>`);

    useRouter({
      translateBatch: (segments) => ({
        ok: true,
        results: segments.slice(0, 1).map((segment) => ({
          id: segment.id,
          text: `${TRANSLATION_PREFIX}${segment.text}`
        }))
      })
    });

    const orchestrator = createTestOrchestrator();
    await orchestrator.setEnabled(true);

    await vi.waitFor(() => {
      expect(document.querySelectorAll(`p[${TRANSLATED_ATTR}="done"]`)).toHaveLength(1);
      expect(document.querySelectorAll(`p[${TRANSLATED_ATTR}="error"]`)).toHaveLength(2);
    });
  });
});

describe("createOrchestrator — provider-specific queue", () => {
  it.each<LocalTranslationProviderId>(["openai-compatible", "anthropic-compatible"])(
    "uses smaller batch/concurrency for %s runtimes",
    async (provider) => {
      useRouter({ settings: { ...DEFAULT_SETTINGS, provider } });

      const paragraphs = Array.from({ length: 5 }, (_, i) => `${SAMPLE_PARAGRAPH} extra ${i}`);
      seedDocument(`<main>${paragraphs.map((text) => `<p>${text}</p>`).join("")}</main>`);
      const orchestrator = createTestOrchestrator();

      await orchestrator.setEnabled(true);
      await vi.waitFor(() => {
        expect(document.querySelectorAll(`p[${TRANSLATED_ATTR}="done"]`).length).toBeGreaterThan(0);
      });

      const batches = sendMessageMock.mock.calls
        .map(([msg]) => msg)
        .filter((msg): msg is Extract<RuntimeMessage, { type: "TRANSLATE_BATCH" }> => msg.type === "TRANSLATE_BATCH")
        .map((msg) => msg.segments.length);
      expect(batches.length).toBeGreaterThanOrEqual(2);
      expect(Math.max(...batches)).toBeLessThanOrEqual(3);
    }
  );
});

describe("createOrchestrator — DOM observers", () => {
  it("rescans when DOM mutations add new translatable content", async () => {
    seedDocument(`<main><p>${SAMPLE_PARAGRAPH}</p></main>`);
    const orchestrator = createTestOrchestrator();

    await orchestrator.setEnabled(true);
    await vi.waitFor(() => {
      expect(document.querySelectorAll(`p[${TRANSLATED_ATTR}="done"]`).length).toBe(1);
    });

    const newP = document.createElement("p");
    newP.textContent = `${SAMPLE_PARAGRAPH} added dynamically.`;
    makeElementVisible(newP);
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
    const orchestrator = createTestOrchestrator();

    await orchestrator.setEnabled(true);
    await vi.waitFor(() => {
      expect(document.querySelectorAll(`.${TRANSLATION_CLASS}`).length).toBe(1);
    });

    const isTranslateBatch = ([msg]: [RuntimeMessage]): boolean => msg.type === "TRANSLATE_BATCH";
    const batchCallsBefore = sendMessageMock.mock.calls.filter(isTranslateBatch).length;

    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_QUIESCE_MS));

    const batchCallsAfter = sendMessageMock.mock.calls.filter(isTranslateBatch).length;
    expect(batchCallsAfter).toBe(batchCallsBefore);
  });
});

describe("createOrchestrator — settings fallbacks", () => {
  it("falls back to defaults when settings response omits fields", async () => {
    useRouter({ settings: {} });

    seedDocument(`<main><p>${SAMPLE_PARAGRAPH}</p></main>`);
    const orchestrator = createTestOrchestrator();

    await orchestrator.setEnabled(true);

    await vi.waitFor(() => {
      expect(document.querySelectorAll(`p[${TRANSLATED_ATTR}="done"]`)).toHaveLength(1);
    });
  });

  it("falls back to defaults when settings response has no settings property at all", async () => {
    useRouter({ settings: null });

    seedDocument(`<main><p>${SAMPLE_PARAGRAPH}</p></main>`);
    const orchestrator = createTestOrchestrator();

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

    setRect(document.getElementById("inview") as HTMLElement, { top: 100, bottom: 200 });
    setRect(document.getElementById("near") as HTMLElement, { top: NEAR_VIEWPORT_TOP, bottom: NEAR_VIEWPORT_TOP + 100 });
    setRect(document.getElementById("far") as HTMLElement, { top: FAR_VIEWPORT_TOP, bottom: FAR_VIEWPORT_TOP + 100 });

    const orchestrator = createTestOrchestrator();
    await orchestrator.setEnabled(true);

    await vi.waitFor(() => {
      expect(document.querySelectorAll(`p[${TRANSLATED_ATTR}="done"]`).length).toBe(3);
    });
  });
});

describe("createOrchestrator — debug state plumbing", () => {
  it("reflects detected and translated counts after a scan in debug mode", async () => {
    useRouter({ settings: { ...DEFAULT_SETTINGS, debugMode: true } });

    seedDocument(`<main><p>${SAMPLE_PARAGRAPH}</p><p>${SAMPLE_PARAGRAPH} extra</p></main>`);
    const orchestrator = createTestOrchestrator();

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

  it("records provider request timing after a translated batch completes", async () => {
    useRouter({ settings: { ...DEFAULT_SETTINGS, debugMode: true } });

    seedDocument(`<main><p>${SAMPLE_PARAGRAPH}</p></main>`);
    const orchestrator = createTestOrchestrator();

    await orchestrator.setEnabled(true);
    await vi.waitFor(() => {
      expect(document.querySelectorAll(`[${TRANSLATED_ATTR}="done"]`)).toHaveLength(1);
    });

    const debug = orchestrator.getDebugState();
    expect(debug.lastProviderRequestStartedAt).toBeGreaterThan(0);
    expect(debug.lastProviderRequestFinishedAt).toBeGreaterThanOrEqual(debug.lastProviderRequestStartedAt ?? 0);
    expect(debug.lastProviderDurationMs).toBe(
      (debug.lastProviderRequestFinishedAt ?? 0) - (debug.lastProviderRequestStartedAt ?? 0)
    );
  });

  it("exposes sanitized provider settings for Gemini debug sessions", async () => {
    useRouter({
      settings: {
        ...DEFAULT_SETTINGS,
        debugMode: true,
        provider: "google",
        model: "gemini-1.5-flash",
        providerEndpoint: "https://user:pass@generativelanguage.googleapis.com/v1beta/models?key=secret#fragment"
      }
    });

    seedDocument(`<main><p>${SAMPLE_PARAGRAPH}</p></main>`);
    const orchestrator = createTestOrchestrator();

    await orchestrator.setEnabled(true);

    expect(orchestrator.getDebugState().providerConfig).toEqual({
      provider: "google",
      providerName: "Google Gemini",
      model: "gemini-1.5-flash",
      endpoint: "https://generativelanguage.googleapis.com/v1beta/models",
      structuredOutput: "responseJsonSchema",
      extensionVersion: "0.3.2"
    });
  });

  it("labels Anthropic-compatible debug sessions as tool schema requests", async () => {
    useRouter({
      settings: {
        ...DEFAULT_SETTINGS,
        debugMode: true,
        provider: "anthropic-compatible",
        model: "local-claude",
        providerEndpoint: "http://user:pass@localhost:8000/v1/messages?token=secret#fragment"
      }
    });

    seedDocument(`<main><p>${SAMPLE_PARAGRAPH}</p></main>`);
    const orchestrator = createTestOrchestrator();

    await orchestrator.setEnabled(true);

    expect(orchestrator.getDebugState().providerConfig).toEqual({
      provider: "anthropic-compatible",
      providerName: "Anthropic Compatible",
      model: "local-claude",
      endpoint: "http://localhost:8000/v1/messages",
      structuredOutput: "tool input_schema",
      extensionVersion: "0.3.2"
    });
  });
});
