import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SETTINGS_KEY } from "../shared/defaults";
import { initializeYouTubeControls, resetYouTubeControlsForTests } from "./youtubeControls";

const sendMessage = vi.fn();
const addStorageListener = vi.fn();
const openOptionsPage = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = "";
  sendMessage.mockImplementation((message: { type?: string }) => {
    if (message.type === "TRANSLATE_BATCH") {
      return Promise.resolve({
        ok: true,
        results: [{ id: "youtube-caption", text: "翻譯字幕" }]
      });
    }
    return Promise.resolve({ ok: true, settings: { targetLanguage: "Japanese" } });
  });
  addStorageListener.mockReset();
  openOptionsPage.mockReset();
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("No fetch mock configured.")));
  vi.stubGlobal("chrome", {
    runtime: {
      sendMessage,
      openOptionsPage
    },
    storage: {
      onChanged: {
        addListener: addStorageListener
      }
    }
  });
});

afterEach(() => {
  resetYouTubeControlsForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("initializeYouTubeControls", () => {
  it("injects a scoped control into YouTube watch player controls", async () => {
    setPageUrl("https://www.youtube.com/watch?v=abc");
    document.body.innerHTML = `
      <div class="html5-video-player">
        <div class="ytp-right-controls">
          <button class="ytp-subtitles-button"></button>
          <div class="ytp-right-controls-left"></div>
        </div>
      </div>
    `;

    initializeYouTubeControls();
    await Promise.resolve();
    vi.advanceTimersByTime(250);

    const host = document.querySelector<HTMLElement>("#margin-youtube-subtitle-control");
    expect(host).toBeInstanceOf(HTMLElement);
    expect(host?.parentElement?.className).toBe("ytp-right-controls");

    const button = host?.shadowRoot?.querySelector<HTMLButtonElement>(".margin-youtube__button");
    expect(button?.getAttribute("aria-label")).toBe("Margin captions into Japanese");
    expect(button?.getAttribute("aria-pressed")).toBe("false");
  });

  it("does not inject outside YouTube watch pages", () => {
    setPageUrl("https://www.youtube.com/feed/subscriptions");
    document.body.innerHTML = `<div class="ytp-right-controls"></div>`;

    initializeYouTubeControls();
    vi.advanceTimersByTime(250);

    expect(document.querySelector("#margin-youtube-subtitle-control")).toBeNull();
  });

  it("does nothing outside YouTube entirely", () => {
    setPageUrl("https://example.com/watch?v=abc");
    document.body.innerHTML = `<div class="ytp-right-controls"></div>`;

    initializeYouTubeControls();
    vi.advanceTimersByTime(250);

    expect(addStorageListener).not.toHaveBeenCalled();
    expect(document.querySelector("#margin-youtube-subtitle-control")).toBeNull();
  });

  it("waits when YouTube watch controls are not mounted yet", () => {
    setPageUrl("https://www.youtube.com/watch?v=abc");
    document.body.innerHTML = `<main></main>`;

    initializeYouTubeControls();
    vi.advanceTimersByTime(250);

    expect(document.querySelector("#margin-youtube-subtitle-control")).toBeNull();
  });

  it("explains unavailable caption actions when YouTube has no subtitle control", async () => {
    setPageUrl("https://www.youtube.com/watch?v=abc");
    document.body.innerHTML = `
      <div class="html5-video-player">
        <div class="ytp-right-controls"></div>
      </div>
    `;

    initializeYouTubeControls();
    await Promise.resolve();
    vi.advanceTimersByTime(250);

    const host = document.querySelector<HTMLElement>("#margin-youtube-subtitle-control");
    const captionItems = host?.shadowRoot?.querySelectorAll<HTMLButtonElement>(
      '.margin-youtube__menu-item[data-action="bilingual"], .margin-youtube__menu-item[data-action="translated"]'
    );

    expect(Array.from(captionItems ?? [], (item) => item.disabled)).toEqual([false, false]);
    expect(
      Array.from(captionItems ?? [], (item) => item.querySelector(".margin-youtube__menu-detail")?.textContent)
    ).toEqual([
      "No YouTube captions detected. AI subtitles will need speech-to-text support.",
      "No YouTube captions detected. AI subtitles will need speech-to-text support."
    ]);
  });

  it("treats disabled YouTube subtitle controls as unavailable", async () => {
    setPageUrl("https://www.youtube.com/watch?v=abc");
    document.body.innerHTML = `
      <div class="html5-video-player">
        <div class="ytp-right-controls">
          <button class="ytp-subtitles-button" aria-disabled="true"></button>
        </div>
      </div>
    `;

    initializeYouTubeControls();
    await Promise.resolve();
    vi.advanceTimersByTime(250);

    const host = document.querySelector<HTMLElement>("#margin-youtube-subtitle-control");
    expect(host?.shadowRoot?.querySelector(".margin-youtube")?.getAttribute("data-has-captions")).toBe("false");
  });

  it("shows why captions cannot be translated when no YouTube caption track exists", async () => {
    const host = await mountYouTubeControl();

    host.shadowRoot?.querySelector<HTMLButtonElement>('.margin-youtube__menu-item[data-action="bilingual"]')?.click();
    await flushPromises();

    expect(
      document
        .querySelector<HTMLElement>("#margin-youtube-caption-overlay")
        ?.shadowRoot?.querySelector(".margin-youtube-caption")?.textContent
    ).toBe(
      "This video does not expose YouTube captions. AI subtitles will require speech-to-text support, which is not configured yet."
    );
  });

  it("opens the menu and toggles caption modes", async () => {
    const host = await mountYouTubeControl();
    const root = host.shadowRoot?.querySelector<HTMLElement>(".margin-youtube");
    const button = host.shadowRoot?.querySelector<HTMLButtonElement>(".margin-youtube__button");
    const bilingualItem = host.shadowRoot?.querySelector<HTMLButtonElement>(
      '.margin-youtube__menu-item[data-action="bilingual"]'
    );
    const translatedItem = host.shadowRoot?.querySelector<HTMLButtonElement>(
      '.margin-youtube__menu-item[data-action="translated"]'
    );

    expect(bilingualItem?.querySelector(".margin-youtube__menu-detail")?.textContent).toBe(
      "Show original captions with Margin translation."
    );
    expect(translatedItem?.querySelector(".margin-youtube__menu-detail")?.textContent).toBe(
      "Show only translated captions."
    );

    button?.click();
    expect(root?.dataset.open).toBe("true");

    bilingualItem?.click();
    expect(root?.dataset.mode).toBe("bilingual");
    expect(root?.dataset.open).toBe("false");
    expect(button?.getAttribute("aria-pressed")).toBe("true");
    expect(button?.getAttribute("aria-label")).toBe("Margin captions are on for Japanese");

    translatedItem?.click();
    expect(root?.dataset.mode).toBe("translated");
    expect(root?.dataset.open).toBe("false");
    expect(button?.getAttribute("aria-pressed")).toBe("true");
  });

  it("translates visible YouTube captions into a player overlay", async () => {
    const host = await mountYouTubeControl();
    document.querySelector(".html5-video-player")?.insertAdjacentHTML(
      "beforeend",
      `
        <div class="ytp-caption-window-container">
          <span class="ytp-caption-segment">Hello</span>
          <span class="ytp-caption-segment">world</span>
        </div>
      `
    );

    host.shadowRoot?.querySelector<HTMLButtonElement>('.margin-youtube__menu-item[data-action="bilingual"]')?.click();
    await Promise.resolve();
    await Promise.resolve();

    const overlayHost = document.querySelector<HTMLElement>("#margin-youtube-caption-overlay");
    const overlay = overlayHost?.shadowRoot?.querySelector<HTMLElement>(".margin-youtube-caption");

    expect(overlayHost).toBeInstanceOf(HTMLElement);
    expect(sendMessage).toHaveBeenLastCalledWith({
      type: "TRANSLATE_BATCH",
      segments: [{ id: "youtube-caption", text: "Hello world" }]
    });
    expect(overlay?.textContent).toBe("翻譯字幕");
    expect(overlay?.hidden).toBe(false);
  });

  it("keeps the caption overlay hidden while a DOM caption translation is pending", async () => {
    let resolveTranslation: (value: unknown) => void = () => undefined;
    sendMessage.mockImplementation((message: { type?: string }) => {
      if (message.type === "TRANSLATE_BATCH") {
        return new Promise((resolve) => {
          resolveTranslation = resolve;
        });
      }
      return Promise.resolve({ ok: true, settings: { targetLanguage: "Japanese" } });
    });
    const host = await mountYouTubeControl();
    document.querySelector(".html5-video-player")?.insertAdjacentHTML(
      "beforeend",
      `<div class="ytp-caption-window-container"><span class="ytp-caption-segment">Hello world</span></div>`
    );

    host.shadowRoot?.querySelector<HTMLButtonElement>('.margin-youtube__menu-item[data-action="bilingual"]')?.click();
    await Promise.resolve();
    await Promise.resolve();

    const overlay = document
      .querySelector<HTMLElement>("#margin-youtube-caption-overlay")
      ?.shadowRoot?.querySelector<HTMLElement>(".margin-youtube-caption");
    expect(overlay?.textContent).toBe("");
    expect(overlay?.hidden).toBe(true);

    resolveTranslation({ ok: true, results: [{ id: "youtube-caption", text: "翻譯字幕" }] });
    await Promise.resolve();
    expect(overlay?.textContent).toBe("翻譯字幕");
    expect(overlay?.hidden).toBe(false);
  });

  it("translates caption tracks in batches and renders by video time", async () => {
    sendMessage.mockImplementation((message: { type?: string; segments?: Array<{ id: string; text: string }> }) => {
      if (message.type === "TRANSLATE_BATCH") {
        return Promise.resolve({
          ok: true,
          results: (message.segments ?? []).map((segment) => ({ id: segment.id, text: `zh: ${segment.text}` }))
        });
      }
      return Promise.resolve({ ok: true, settings: { targetLanguage: "Japanese" } });
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        text: () =>
          Promise.resolve(
            JSON.stringify({
              events: [
                { tStartMs: 1000, dDurationMs: 2000, segs: [{ utf8: "Track one" }] },
                { tStartMs: 4000, dDurationMs: 2000, segs: [{ utf8: "Track two" }] }
              ]
            })
          )
      })
    );
    const host = await mountYouTubeControlWithTrack();
    setVideoTime(1.2);

    host.shadowRoot?.querySelector<HTMLButtonElement>('.margin-youtube__menu-item[data-action="bilingual"]')?.click();
    await flushPromises();

    const overlay = document
      .querySelector<HTMLElement>("#margin-youtube-caption-overlay")
      ?.shadowRoot?.querySelector<HTMLElement>(".margin-youtube-caption");
    expect(sendMessage).toHaveBeenLastCalledWith({
      type: "TRANSLATE_BATCH",
      segments: [
        { id: "cue-0", text: "Track one" },
        { id: "cue-1", text: "Track two" }
      ]
    });
    expect(overlay?.textContent).toBe("zh: Track one");

    setVideoTime(4.2);
    vi.advanceTimersByTime(100);
    expect(overlay?.textContent).toBe("zh: Track two");
  });

  it("prioritizes caption track translation from the current playback time", async () => {
    sendMessage.mockImplementation((message: { type?: string; segments?: Array<{ id: string; text: string }> }) => {
      if (message.type === "TRANSLATE_BATCH") {
        return Promise.resolve({
          ok: true,
          results: (message.segments ?? []).map((segment) => ({ id: segment.id, text: segment.text }))
        });
      }
      return Promise.resolve({ ok: true, settings: { targetLanguage: "Japanese" } });
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        text: () =>
          Promise.resolve(
            JSON.stringify({
              events: [
                { tStartMs: 1000, dDurationMs: 2000, segs: [{ utf8: "Early" }] },
                { tStartMs: 4000, dDurationMs: 2000, segs: [{ utf8: "Current" }] },
                { tStartMs: 7000, dDurationMs: 2000, segs: [{ utf8: "Later" }] }
              ]
            })
          )
      })
    );
    const host = await mountYouTubeControlWithTrack();
    setVideoTime(4.2);

    host.shadowRoot?.querySelector<HTMLButtonElement>('.margin-youtube__menu-item[data-action="bilingual"]')?.click();
    await flushPromises();

    expect(sendMessage).toHaveBeenLastCalledWith({
      type: "TRANSLATE_BATCH",
      segments: [
        { id: "cue-1", text: "Current" },
        { id: "cue-2", text: "Later" },
        { id: "cue-0", text: "Early" }
      ]
    });
  });

  it("hides the track overlay when playback is outside active cues", async () => {
    sendMessage.mockImplementation((message: { type?: string; segments?: Array<{ id: string; text: string }> }) => {
      if (message.type === "TRANSLATE_BATCH") {
        return Promise.resolve({
          ok: true,
          results: (message.segments ?? []).map((segment) => ({ id: segment.id, text: segment.text }))
        });
      }
      return Promise.resolve({ ok: true, settings: { targetLanguage: "Japanese" } });
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        text: () =>
          Promise.resolve(
            JSON.stringify({
              events: [{ tStartMs: 1000, dDurationMs: 1000, segs: [{ utf8: "Only cue" }] }]
            })
          )
      })
    );
    const host = await mountYouTubeControlWithTrack();
    setVideoTime(1.2);

    host.shadowRoot?.querySelector<HTMLButtonElement>('.margin-youtube__menu-item[data-action="bilingual"]')?.click();
    await flushPromises();
    setVideoTime(3);
    vi.advanceTimersByTime(100);

    const overlay = document
      .querySelector<HTMLElement>("#margin-youtube-caption-overlay")
      ?.shadowRoot?.querySelector<HTMLElement>(".margin-youtube-caption");
    expect(overlay?.hidden).toBe(true);
  });

  it("does not fall back to DOM caption requests after a caption track is active", async () => {
    sendMessage.mockImplementation((message: { type?: string; segments?: Array<{ id: string; text: string }> }) => {
      if (message.type === "TRANSLATE_BATCH") {
        return Promise.resolve({
          ok: true,
          results: (message.segments ?? []).map((segment) => ({ id: segment.id, text: segment.text }))
        });
      }
      return Promise.resolve({ ok: true, settings: { targetLanguage: "Japanese" } });
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        text: () =>
          Promise.resolve(
            JSON.stringify({
              events: [{ tStartMs: 1000, dDurationMs: 1000, segs: [{ utf8: "Track cue" }] }]
            })
          )
      })
    );
    const host = await mountYouTubeControlWithTrack();
    setVideoTime(1.2);

    host.shadowRoot?.querySelector<HTMLButtonElement>('.margin-youtube__menu-item[data-action="bilingual"]')?.click();
    await flushPromises();
    const callsAfterTrack = getTranslationCallCount();
    document.querySelector(".html5-video-player")?.insertAdjacentHTML(
      "beforeend",
      `<div class="ytp-caption-window-container"><span class="ytp-caption-segment">DOM caption</span></div>`
    );
    await Promise.resolve();
    vi.advanceTimersByTime(20);

    expect(getTranslationCallCount()).toBe(callsAfterTrack);
  });

  it("renders the first caption track cue when no video element is mounted", async () => {
    sendMessage.mockImplementation((message: { type?: string; segments?: Array<{ id: string; text: string }> }) => {
      if (message.type === "TRANSLATE_BATCH") {
        return Promise.resolve({
          ok: true,
          results: (message.segments ?? []).map((segment) => ({ id: segment.id, text: `zh: ${segment.text}` }))
        });
      }
      return Promise.resolve({ ok: true, settings: { targetLanguage: "Japanese" } });
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        text: () =>
          Promise.resolve(
            JSON.stringify({
              events: [{ tStartMs: 0, dDurationMs: 1000, segs: [{ utf8: "Opening cue" }] }]
            })
          )
      })
    );
    const host = await mountYouTubeControlWithTrack({ withVideo: false });

    host.shadowRoot?.querySelector<HTMLButtonElement>('.margin-youtube__menu-item[data-action="bilingual"]')?.click();
    await flushPromises();

    expect(
      document
        .querySelector<HTMLElement>("#margin-youtube-caption-overlay")
        ?.shadowRoot?.querySelector(".margin-youtube-caption")?.textContent
    ).toBe("zh: Opening cue");
  });

  it("ignores delayed caption track fetches after the mode is turned off", async () => {
    const callsBeforeToggle = getTranslationCallCount();
    let resolveTrack: (value: Response) => void = () => undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise((resolve) => {
            resolveTrack = resolve;
          })
      )
    );
    const host = await mountYouTubeControlWithTrack();
    const bilingualItem = host.shadowRoot?.querySelector<HTMLButtonElement>(
      '.margin-youtube__menu-item[data-action="bilingual"]'
    );

    bilingualItem?.click();
    bilingualItem?.click();
    resolveTrack(
      new Response(
        JSON.stringify({
          events: [{ tStartMs: 0, dDurationMs: 1000, segs: [{ utf8: "Late cue" }] }]
        }),
        { headers: { "content-type": "application/json" } }
      )
    );
    await flushPromises();

    expect(getTranslationCallCount()).toBe(callsBeforeToggle);
    expect(document.querySelector("#margin-youtube-caption-overlay")).toBeNull();
  });

  it("falls back to DOM captions when caption track fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers(),
        text: () => Promise.resolve("")
      })
    );
    const host = await mountYouTubeControlWithTrack();
    document.querySelector(".html5-video-player")?.insertAdjacentHTML(
      "beforeend",
      `<div class="ytp-caption-window-container"><span class="ytp-caption-segment">DOM caption</span></div>`
    );

    host.shadowRoot?.querySelector<HTMLButtonElement>('.margin-youtube__menu-item[data-action="bilingual"]')?.click();
    await flushPromises();

    expect(sendMessage).toHaveBeenLastCalledWith({
      type: "TRANSLATE_BATCH",
      segments: [{ id: "youtube-caption", text: "DOM caption" }]
    });
  });

  it("uses a loaded YouTube timedtext resource when the direct caption track is empty", async () => {
    sendMessage.mockImplementation((message: { type?: string; segments?: Array<{ id: string; text: string }> }) => {
      if (message.type === "TRANSLATE_BATCH") {
        return Promise.resolve({
          ok: true,
          results: (message.segments ?? []).map((segment) => ({ id: segment.id, text: `zh: ${segment.text}` }))
        });
      }
      return Promise.resolve({ ok: true, settings: { targetLanguage: "Japanese" } });
    });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ "content-type": "text/html" }),
          text: () => Promise.resolve("")
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          text: () =>
            Promise.resolve(
              JSON.stringify({
                events: [{ tStartMs: 1000, dDurationMs: 1000, segs: [{ utf8: "Primed cue" }] }]
              })
            )
        })
    );
    const performanceSpy = vi.spyOn(performance, "getEntriesByType").mockReturnValue([
      {
        name: "https://www.youtube.com/api/timedtext?v=abc&fmt=json3&pot=token",
        decodedBodySize: 1200
      } as PerformanceResourceTiming
    ]);
    const host = await mountYouTubeControlWithTrack();
    setVideoTime(1.2);

    host.shadowRoot?.querySelector<HTMLButtonElement>('.margin-youtube__menu-item[data-action="bilingual"]')?.click();
    await flushPromises();

    expect(fetch).toHaveBeenLastCalledWith("https://www.youtube.com/api/timedtext?v=abc&fmt=json3&pot=token");
    expect(
      document
        .querySelector<HTMLElement>("#margin-youtube-caption-overlay")
        ?.shadowRoot?.querySelector(".margin-youtube-caption")?.textContent
    ).toBe("zh: Primed cue");
    performanceSpy.mockRestore();
  });

  it("primes YouTube timedtext while keeping native captions hidden", async () => {
    sendMessage.mockImplementation((message: { type?: string; segments?: Array<{ id: string; text: string }> }) => {
      if (message.type === "TRANSLATE_BATCH") {
        return Promise.resolve({
          ok: true,
          results: (message.segments ?? []).map((segment) => ({ id: segment.id, text: `zh: ${segment.text}` }))
        });
      }
      return Promise.resolve({ ok: true, settings: { targetLanguage: "Japanese" } });
    });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ "content-type": "text/html" }),
          text: () => Promise.resolve("")
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          text: () =>
            Promise.resolve(
              JSON.stringify({
                events: [{ tStartMs: 1000, dDurationMs: 1000, segs: [{ utf8: "Hidden native cue" }] }]
              })
            )
        })
    );
    let timedTextEntries: PerformanceEntry[] = [];
    const performanceSpy = vi.spyOn(performance, "getEntriesByType").mockImplementation(() => timedTextEntries);
    const host = await mountYouTubeControlWithTrack();
    const subtitlesButton = document.querySelector<HTMLButtonElement>(".ytp-subtitles-button")!;
    let subtitlesButtonClicks = 0;
    subtitlesButton.setAttribute("aria-pressed", "false");
    subtitlesButton.addEventListener("click", () => {
      subtitlesButtonClicks += 1;
      subtitlesButton.setAttribute("aria-pressed", subtitlesButtonClicks % 2 === 1 ? "true" : "false");
      if (subtitlesButtonClicks === 1) {
        timedTextEntries = [
          {
            name: "https://www.youtube.com/api/timedtext?v=abc&fmt=json3&pot=token",
            decodedBodySize: 1200
          } as PerformanceResourceTiming
        ];
      }
    });
    setVideoTime(1.2);
    const bilingualItem = host.shadowRoot?.querySelector<HTMLButtonElement>(
      '.margin-youtube__menu-item[data-action="bilingual"]'
    );

    bilingualItem?.click();
    await flushPromises();

    expect(subtitlesButtonClicks).toBe(2);
    expect(document.getElementById("margin-youtube-native-caption-style")).toBeInstanceOf(HTMLStyleElement);
    expect(
      document
        .querySelector<HTMLElement>("#margin-youtube-caption-overlay")
        ?.shadowRoot?.querySelector(".margin-youtube-caption")?.textContent
    ).toBe("zh: Hidden native cue");

    bilingualItem?.click();
    expect(document.getElementById("margin-youtube-native-caption-style")).toBeNull();
    performanceSpy.mockRestore();
  });

  it("does not toggle YouTube captions when they are already enabled for priming", async () => {
    sendMessage.mockImplementation((message: { type?: string; segments?: Array<{ id: string; text: string }> }) => {
      if (message.type === "TRANSLATE_BATCH") {
        return Promise.resolve({
          ok: true,
          results: (message.segments ?? []).map((segment) => ({ id: segment.id, text: segment.text }))
        });
      }
      return Promise.resolve({ ok: true, settings: { targetLanguage: "Japanese" } });
    });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ "content-type": "text/html" }),
          text: () => Promise.resolve("")
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          text: () =>
            Promise.resolve(
              JSON.stringify({
                events: [{ tStartMs: 1000, dDurationMs: 1000, segs: [{ utf8: "Already enabled cue" }] }]
              })
            )
        })
    );
    let performanceCalls = 0;
    const performanceSpy = vi.spyOn(performance, "getEntriesByType").mockImplementation(() => {
      performanceCalls += 1;
      return performanceCalls === 1
        ? []
        : [
            {
              name: "https://www.youtube.com/api/timedtext?v=abc&fmt=json3&pot=token",
              decodedBodySize: 1200
            } as PerformanceResourceTiming
          ];
    });
    const host = await mountYouTubeControlWithTrack();
    const subtitlesButton = document.querySelector<HTMLButtonElement>(".ytp-subtitles-button")!;
    const clickSpy = vi.spyOn(subtitlesButton, "click");
    subtitlesButton.setAttribute("aria-pressed", "true");
    setVideoTime(1.2);

    host.shadowRoot?.querySelector<HTMLButtonElement>('.margin-youtube__menu-item[data-action="bilingual"]')?.click();
    await flushPromises();

    expect(clickSpy).not.toHaveBeenCalled();
    expect(
      document
        .querySelector<HTMLElement>("#margin-youtube-caption-overlay")
        ?.shadowRoot?.querySelector(".margin-youtube-caption")?.textContent
    ).toBe("Already enabled cue");
    performanceSpy.mockRestore();
  });

  it("stops caption track batching when the provider rejects a batch", async () => {
    sendMessage.mockImplementation((message: { type?: string }) => {
      if (message.type === "TRANSLATE_BATCH") {
        return Promise.resolve({ ok: false });
      }
      return Promise.resolve({ ok: true, settings: { targetLanguage: "Japanese" } });
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        text: () =>
          Promise.resolve(
            JSON.stringify({
              events: [{ tStartMs: 1000, dDurationMs: 1000, segs: [{ utf8: "Only cue" }] }]
            })
          )
      })
    );
    const host = await mountYouTubeControlWithTrack();

    host.shadowRoot?.querySelector<HTMLButtonElement>('.margin-youtube__menu-item[data-action="bilingual"]')?.click();
    await flushPromises();

    expect(
      document
        .querySelector<HTMLElement>("#margin-youtube-caption-overlay")
        ?.shadowRoot?.querySelector(".margin-youtube-caption")?.textContent
    ).toBe("");
  });

  it("translates long caption tracks in multiple batches", async () => {
    const callsBeforeTrack = getTranslationCallCount();
    sendMessage.mockImplementation((message: { type?: string; segments?: Array<{ id: string; text: string }> }) => {
      if (message.type === "TRANSLATE_BATCH") {
        return Promise.resolve({
          ok: true,
          results: (message.segments ?? []).map((segment) => ({ id: segment.id, text: segment.text }))
        });
      }
      return Promise.resolve({ ok: true, settings: { targetLanguage: "Japanese" } });
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        text: () =>
          Promise.resolve(
            JSON.stringify({
              events: Array.from({ length: 33 }, (_, index) => ({
                tStartMs: index * 1000,
                dDurationMs: 1000,
                segs: [{ utf8: `Cue ${index}` }]
              }))
            })
          )
      })
    );
    const host = await mountYouTubeControlWithTrack();

    host.shadowRoot?.querySelector<HTMLButtonElement>('.margin-youtube__menu-item[data-action="bilingual"]')?.click();
    await flushPromises();

    const captionCalls = sendMessage.mock.calls.filter(
      ([message]) => (message as { type?: string } | undefined)?.type === "TRANSLATE_BATCH"
    ).slice(callsBeforeTrack);
    expect(captionCalls).toHaveLength(2);
    expect((captionCalls[0]?.[0] as { segments: unknown[] }).segments).toHaveLength(32);
    expect((captionCalls[1]?.[0] as { segments: unknown[] }).segments).toHaveLength(1);
  });

  it("hides the caption overlay when captions disappear", async () => {
    const host = await mountYouTubeControl();
    document.querySelector(".html5-video-player")?.insertAdjacentHTML(
      "beforeend",
      `
        <div class="ytp-caption-window-container">
          <span class="ytp-caption-segment">Hello world</span>
        </div>
      `
    );

    host.shadowRoot?.querySelector<HTMLButtonElement>('.margin-youtube__menu-item[data-action="bilingual"]')?.click();
    await Promise.resolve();
    await Promise.resolve();

    document.querySelector(".ytp-caption-window-container")?.remove();
    await Promise.resolve();
    vi.advanceTimersByTime(20);

    const overlayHost = document.querySelector<HTMLElement>("#margin-youtube-caption-overlay");
    const overlay = overlayHost?.shadowRoot?.querySelector<HTMLElement>(".margin-youtube-caption");
    expect(overlayHost).toBeInstanceOf(HTMLElement);
    expect(overlay?.hidden).toBe(true);
  });

  it("turns caption translation off when the active mode is selected again", async () => {
    const host = await mountYouTubeControl();
    document.querySelector(".html5-video-player")?.insertAdjacentHTML(
      "beforeend",
      `<div class="ytp-caption-window-container"><span class="ytp-caption-segment">Hello world</span></div>`
    );
    const bilingualItem = host.shadowRoot?.querySelector<HTMLButtonElement>(
      '.margin-youtube__menu-item[data-action="bilingual"]'
    );

    bilingualItem?.click();
    await Promise.resolve();
    bilingualItem?.click();

    expect(document.querySelector("#margin-youtube-caption-overlay")).toBeNull();
    expect(host.shadowRoot?.querySelector(".margin-youtube")?.getAttribute("data-mode")).toBe("idle");
    expect(host.shadowRoot?.querySelector(".margin-youtube__button")?.getAttribute("aria-pressed")).toBe("false");
  });

  it("marks translated caption overlay mode separately", async () => {
    const host = await mountYouTubeControl();
    document.querySelector(".html5-video-player")?.insertAdjacentHTML(
      "beforeend",
      `<div class="ytp-caption-window-container"><span class="ytp-caption-segment">Hello world</span></div>`
    );

    host.shadowRoot?.querySelector<HTMLButtonElement>('.margin-youtube__menu-item[data-action="translated"]')?.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(
      document
        .querySelector<HTMLElement>("#margin-youtube-caption-overlay")
        ?.shadowRoot?.querySelector(".margin-youtube-caption")
        ?.getAttribute("data-mode")
    ).toBe("translated");
  });

  it("does not translate the same caption text twice", async () => {
    const host = await mountYouTubeControl();
    document.querySelector(".html5-video-player")?.insertAdjacentHTML(
      "beforeend",
      `<div class="ytp-caption-window-container"><span class="ytp-caption-segment">Hello world</span></div>`
    );

    host.shadowRoot?.querySelector<HTMLButtonElement>('.margin-youtube__menu-item[data-action="bilingual"]')?.click();
    await Promise.resolve();
    await Promise.resolve();
    const callsAfterFirstCaption = sendMessage.mock.calls.length;

    document.querySelector(".ytp-caption-window-container")?.append(document.createElement("span"));
    await Promise.resolve();
    vi.advanceTimersByTime(20);
    await Promise.resolve();

    expect(sendMessage).toHaveBeenCalledTimes(callsAfterFirstCaption);
  });

  it("debounces rapid caption mutations before refreshing", async () => {
    const host = await mountYouTubeControl();
    document.querySelector(".html5-video-player")?.insertAdjacentHTML(
      "beforeend",
      `<div class="ytp-caption-window-container"><span class="ytp-caption-segment">Hello</span></div>`
    );

    host.shadowRoot?.querySelector<HTMLButtonElement>('.margin-youtube__menu-item[data-action="bilingual"]')?.click();
    await Promise.resolve();
    await Promise.resolve();
    const callsAfterFirstCaption = sendMessage.mock.calls.length;

    document.querySelector(".ytp-caption-window-container")?.append(document.createElement("span"));
    await Promise.resolve();
    document.querySelector(".ytp-caption-window-container")?.append(document.createElement("span"));
    await Promise.resolve();
    vi.advanceTimersByTime(19);
    expect(sendMessage).toHaveBeenCalledTimes(callsAfterFirstCaption);

    vi.advanceTimersByTime(1);
    expect(sendMessage).toHaveBeenCalledTimes(callsAfterFirstCaption);
  });

  it("renders provider errors in the caption overlay", async () => {
    sendMessage.mockImplementation((message: { type?: string }) => {
      if (message.type === "TRANSLATE_BATCH") {
        return Promise.resolve({ ok: false, error: "Provider unavailable" });
      }
      return Promise.resolve({ ok: true, settings: { targetLanguage: "Japanese" } });
    });
    const host = await mountYouTubeControl();
    document.querySelector(".html5-video-player")?.insertAdjacentHTML(
      "beforeend",
      `<div class="ytp-caption-window-container"><span class="ytp-caption-segment">Hello world</span></div>`
    );

    host.shadowRoot?.querySelector<HTMLButtonElement>('.margin-youtube__menu-item[data-action="bilingual"]')?.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(
      document
        .querySelector<HTMLElement>("#margin-youtube-caption-overlay")
        ?.shadowRoot?.querySelector(".margin-youtube-caption")?.textContent
    ).toBe("Provider unavailable");
  });

  it("renders request failures in the caption overlay", async () => {
    sendMessage.mockImplementation((message: { type?: string }) => {
      if (message.type === "TRANSLATE_BATCH") {
        return Promise.reject(new Error("Network failed"));
      }
      return Promise.resolve({ ok: true, settings: { targetLanguage: "Japanese" } });
    });
    const host = await mountYouTubeControl();
    document.querySelector(".html5-video-player")?.insertAdjacentHTML(
      "beforeend",
      `<div class="ytp-caption-window-container"><span class="ytp-caption-segment">Hello world</span></div>`
    );

    host.shadowRoot?.querySelector<HTMLButtonElement>('.margin-youtube__menu-item[data-action="bilingual"]')?.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(
      document
        .querySelector<HTMLElement>("#margin-youtube-caption-overlay")
        ?.shadowRoot?.querySelector(".margin-youtube-caption")?.textContent
    ).toBe("Network failed");
  });

  it("falls back when the provider returns no caption translation", async () => {
    sendMessage.mockImplementation((message: { type?: string }) => {
      if (message.type === "TRANSLATE_BATCH") {
        return Promise.resolve({ ok: true, results: [] });
      }
      return Promise.resolve({ ok: true, settings: { targetLanguage: "Japanese" } });
    });
    const host = await mountYouTubeControl();
    document.querySelector(".html5-video-player")?.insertAdjacentHTML(
      "beforeend",
      `<div class="ytp-caption-window-container"><span class="ytp-caption-segment">Hello world</span></div>`
    );

    host.shadowRoot?.querySelector<HTMLButtonElement>('.margin-youtube__menu-item[data-action="bilingual"]')?.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(
      document
        .querySelector<HTMLElement>("#margin-youtube-caption-overlay")
        ?.shadowRoot?.querySelector(".margin-youtube-caption")?.textContent
    ).toBe("Caption translation failed.");
  });

  it("does not fail when the caption overlay node has been removed", async () => {
    const host = await mountYouTubeControl();
    const player = document.querySelector(".html5-video-player");
    player?.insertAdjacentHTML(
      "beforeend",
      `<div class="ytp-caption-window-container"><span class="ytp-caption-segment">Hello world</span></div>`
    );

    host.shadowRoot?.querySelector<HTMLButtonElement>('.margin-youtube__menu-item[data-action="bilingual"]')?.click();
    await Promise.resolve();
    await Promise.resolve();
    document
      .querySelector<HTMLElement>("#margin-youtube-caption-overlay")
      ?.shadowRoot?.querySelector(".margin-youtube-caption")
      ?.remove();

    document.querySelector(".ytp-caption-window-container")?.remove();
    player?.insertAdjacentHTML(
      "beforeend",
      `<div class="ytp-caption-window-container"><span class="ytp-caption-segment">Next caption</span></div>`
    );
    await Promise.resolve();
    vi.advanceTimersByTime(20);
    await Promise.resolve();

    expect(document.querySelector<HTMLElement>("#margin-youtube-caption-overlay")?.shadowRoot?.children.length).toBe(1);
  });

  it("ignores caption responses after the mode is turned off", async () => {
    let resolveTranslation: (value: unknown) => void = () => undefined;
    sendMessage.mockImplementation((message: { type?: string }) => {
      if (message.type === "TRANSLATE_BATCH") {
        return new Promise((resolve) => {
          resolveTranslation = resolve;
        });
      }
      return Promise.resolve({ ok: true, settings: { targetLanguage: "Japanese" } });
    });
    const host = await mountYouTubeControl();
    const bilingualItem = host.shadowRoot?.querySelector<HTMLButtonElement>(
      '.margin-youtube__menu-item[data-action="bilingual"]'
    );
    document.querySelector(".html5-video-player")?.insertAdjacentHTML(
      "beforeend",
      `<div class="ytp-caption-window-container"><span class="ytp-caption-segment">Hello world</span></div>`
    );

    bilingualItem?.click();
    bilingualItem?.click();
    resolveTranslation({ ok: true, results: [{ id: "youtube-caption", text: "late result" }] });
    await Promise.resolve();

    expect(document.querySelector("#margin-youtube-caption-overlay")).toBeNull();
  });

  it("ignores caption responses after captions disappear", async () => {
    let resolveTranslation: (value: unknown) => void = () => undefined;
    sendMessage.mockImplementation((message: { type?: string }) => {
      if (message.type === "TRANSLATE_BATCH") {
        return new Promise((resolve) => {
          resolveTranslation = resolve;
        });
      }
      return Promise.resolve({ ok: true, settings: { targetLanguage: "Japanese" } });
    });
    const host = await mountYouTubeControl();
    document.querySelector(".html5-video-player")?.insertAdjacentHTML(
      "beforeend",
      `<div class="ytp-caption-window-container"><span class="ytp-caption-segment">Hello world</span></div>`
    );

    host.shadowRoot?.querySelector<HTMLButtonElement>('.margin-youtube__menu-item[data-action="bilingual"]')?.click();
    await Promise.resolve();
    document.querySelector(".ytp-caption-window-container")?.remove();
    await Promise.resolve();
    vi.advanceTimersByTime(20);
    resolveTranslation({ ok: true, results: [{ id: "youtube-caption", text: "late result" }] });
    await Promise.resolve();

    const overlay = document
      .querySelector<HTMLElement>("#margin-youtube-caption-overlay")
      ?.shadowRoot?.querySelector<HTMLElement>(".margin-youtube-caption");
    expect(overlay?.hidden).toBe(true);
  });

  it("uses cached caption translations immediately when the text repeats", async () => {
    const host = await mountYouTubeControl();
    const player = document.querySelector(".html5-video-player");
    player?.insertAdjacentHTML(
      "beforeend",
      `<div class="ytp-caption-window-container"><span class="ytp-caption-segment">Hello world</span></div>`
    );

    host.shadowRoot?.querySelector<HTMLButtonElement>('.margin-youtube__menu-item[data-action="bilingual"]')?.click();
    await Promise.resolve();
    await Promise.resolve();
    const callsAfterFirstCaption = sendMessage.mock.calls.length;

    document.querySelector(".ytp-caption-window-container")?.remove();
    await Promise.resolve();
    vi.advanceTimersByTime(20);
    player?.insertAdjacentHTML(
      "beforeend",
      `<div class="ytp-caption-window-container"><span class="ytp-caption-segment">Hello world</span></div>`
    );
    await Promise.resolve();
    vi.advanceTimersByTime(20);

    const overlay = document
      .querySelector<HTMLElement>("#margin-youtube-caption-overlay")
      ?.shadowRoot?.querySelector<HTMLElement>(".margin-youtube-caption");
    expect(sendMessage).toHaveBeenCalledTimes(callsAfterFirstCaption);
    expect(overlay?.textContent).toBe("翻譯字幕");
  });

  it("evicts old caption translations from the in-memory cache", async () => {
    const host = await mountYouTubeControl();
    const player = document.querySelector(".html5-video-player");
    player?.insertAdjacentHTML(
      "beforeend",
      `<div class="ytp-caption-window-container"><span class="ytp-caption-segment">caption 0</span></div>`
    );

    host.shadowRoot?.querySelector<HTMLButtonElement>('.margin-youtube__menu-item[data-action="bilingual"]')?.click();
    await Promise.resolve();
    await Promise.resolve();

    for (let index = 1; index <= 121; index += 1) {
      document.querySelector(".ytp-caption-window-container")?.remove();
      player?.insertAdjacentHTML(
        "beforeend",
        `<div class="ytp-caption-window-container"><span class="ytp-caption-segment">caption ${index}</span></div>`
      );
      await Promise.resolve();
      vi.advanceTimersByTime(20);
      await Promise.resolve();
    }

    const translationCallsBeforeRepeat = getTranslationCallCount();
    document.querySelector(".ytp-caption-window-container")?.remove();
    player?.insertAdjacentHTML(
      "beforeend",
      `<div class="ytp-caption-window-container"><span class="ytp-caption-segment">caption 0</span></div>`
    );
    await Promise.resolve();
    vi.advanceTimersByTime(20);
    await Promise.resolve();

    expect(getTranslationCallCount()).toBe(translationCallsBeforeRepeat + 1);
  });

  it("does not create an overlay when YouTube controls exist without the video player", async () => {
    setPageUrl("https://www.youtube.com/watch?v=abc");
    document.body.innerHTML = `
      <div class="ytp-right-controls">
        <button class="ytp-subtitles-button"></button>
      </div>
      <div class="ytp-caption-window-container"><span class="ytp-caption-segment">Hello world</span></div>
    `;

    initializeYouTubeControls();
    await Promise.resolve();
    vi.advanceTimersByTime(250);
    document
      .querySelector<HTMLElement>("#margin-youtube-subtitle-control")
      ?.shadowRoot?.querySelector<HTMLButtonElement>('.margin-youtube__menu-item[data-action="bilingual"]')
      ?.click();

    expect(document.querySelector("#margin-youtube-caption-overlay")).toBeNull();
  });

  it("removes caption overlay when leaving the watch page", async () => {
    const host = await mountYouTubeControl();
    document.querySelector(".html5-video-player")?.insertAdjacentHTML(
      "beforeend",
      `<div class="ytp-caption-window-container"><span class="ytp-caption-segment">Hello world</span></div>`
    );
    host.shadowRoot?.querySelector<HTMLButtonElement>('.margin-youtube__menu-item[data-action="bilingual"]')?.click();
    await Promise.resolve();

    setPageUrl("https://www.youtube.com/feed/subscriptions");
    window.dispatchEvent(new Event("yt-navigate-finish"));
    vi.advanceTimersByTime(250);

    expect(document.querySelector("#margin-youtube-caption-overlay")).toBeNull();
    expect(document.querySelector("#margin-youtube-subtitle-control")).toBeNull();
  });

  it("opens extension settings from the menu", async () => {
    const host = await mountYouTubeControl();
    const settingsItem = host.shadowRoot?.querySelectorAll<HTMLButtonElement>(".margin-youtube__menu-item")[2];

    settingsItem?.click();

    expect(openOptionsPage).toHaveBeenCalledOnce();
  });

  it("updates the button label when target language settings change", async () => {
    const host = await mountYouTubeControl();
    const storageListener = addStorageListener.mock.calls[0]?.[0] as
      | ((changes: Record<string, { newValue: unknown }>, areaName: string) => void)
      | undefined;

    storageListener?.({ [SETTINGS_KEY]: { newValue: { targetLanguage: "French" } } }, "local");

    const button = host.shadowRoot?.querySelector(".margin-youtube__button");
    expect(button?.getAttribute("aria-label")).toBe("Margin captions into French");
    expect(button?.getAttribute("aria-pressed")).toBe("false");
  });

  it("keeps the default language when settings cannot be loaded", async () => {
    sendMessage.mockRejectedValue(new Error("settings unavailable"));
    const host = await mountYouTubeControl();
    await Promise.resolve();

    expect(host.shadowRoot?.querySelector(".margin-youtube__button")?.getAttribute("aria-label")).toBe(
      "Margin captions into English"
    );
  });

  it("rescans when YouTube changes player DOM", async () => {
    const host = await mountYouTubeControl();
    host.remove();

    document.querySelector(".ytp-right-controls")?.append(document.createElement("span"));
    await Promise.resolve();
    vi.advanceTimersByTime(250);

    expect(document.querySelector("#margin-youtube-subtitle-control")).toBeInstanceOf(HTMLElement);
  });

  it("ignores storage changes outside local settings", async () => {
    const host = await mountYouTubeControl();
    const storageListener = addStorageListener.mock.calls[0]?.[0] as
      | ((changes: Record<string, { newValue: unknown }>, areaName: string) => void)
      | undefined;

    storageListener?.({ [SETTINGS_KEY]: { newValue: { targetLanguage: "French" } } }, "sync");
    storageListener?.({ [SETTINGS_KEY]: { newValue: { debugMode: true } } }, "local");

    expect(host.shadowRoot?.querySelector(".margin-youtube__button")?.getAttribute("aria-label")).toBe(
      "Margin captions into Japanese"
    );
  });

  it("debounces repeated YouTube navigation signals", () => {
    setPageUrl("https://www.youtube.com/watch?v=abc");
    document.body.innerHTML = `
      <div class="html5-video-player">
        <div class="ytp-right-controls">
          <button class="ytp-subtitles-button"></button>
        </div>
      </div>
    `;

    initializeYouTubeControls();
    window.dispatchEvent(new Event("yt-navigate-finish"));
    vi.advanceTimersByTime(249);
    expect(document.querySelector("#margin-youtube-subtitle-control")).toBeNull();

    vi.advanceTimersByTime(1);
    expect(document.querySelector("#margin-youtube-subtitle-control")).toBeInstanceOf(HTMLElement);
  });

  it("clears a pending scan when reset before the timer runs", () => {
    setPageUrl("https://www.youtube.com/watch?v=abc");
    document.body.innerHTML = `<div class="ytp-right-controls"></div>`;

    initializeYouTubeControls();
    resetYouTubeControlsForTests();
    vi.advanceTimersByTime(250);

    expect(document.querySelector("#margin-youtube-subtitle-control")).toBeNull();
  });
});

async function mountYouTubeControl(): Promise<HTMLElement> {
  setPageUrl("https://www.youtube.com/watch?v=abc");
  document.body.innerHTML = `
    <div class="html5-video-player">
      <div class="ytp-right-controls">
        <button class="ytp-subtitles-button"></button>
        <div class="ytp-right-controls-left"></div>
      </div>
    </div>
  `;
  initializeYouTubeControls();
  await Promise.resolve();
  vi.advanceTimersByTime(250);
  return document.querySelector<HTMLElement>("#margin-youtube-subtitle-control")!;
}

async function mountYouTubeControlWithTrack({ withVideo = true }: { withVideo?: boolean } = {}): Promise<HTMLElement> {
  setPageUrl("https://www.youtube.com/watch?v=abc");
  document.body.innerHTML = `
    <script>
      var ytInitialPlayerResponse = {
        "captions": {
          "playerCaptionsTracklistRenderer": {
            "captionTracks": [
              { "baseUrl": "https://www.youtube.com/api/timedtext?v=abc&lang=en", "languageCode": "en" }
            ]
          }
        }
      };
    </script>
    <div class="html5-video-player">
      ${withVideo ? "<video></video>" : ""}
      <div class="ytp-right-controls">
        <button class="ytp-subtitles-button"></button>
        <div class="ytp-right-controls-left"></div>
      </div>
    </div>
  `;
  initializeYouTubeControls();
  await Promise.resolve();
  vi.advanceTimersByTime(250);
  return document.querySelector<HTMLElement>("#margin-youtube-subtitle-control")!;
}

async function flushPromises(): Promise<void> {
  for (let index = 0; index < 16; index += 1) {
    await Promise.resolve();
  }
}

function setVideoTime(currentTime: number): void {
  const video = document.querySelector("video")!;
  Object.defineProperty(video, "currentTime", {
    value: currentTime,
    configurable: true
  });
}

function getTranslationCallCount(): number {
  return sendMessage.mock.calls.filter(([message]) => (message as { type?: string } | undefined)?.type === "TRANSLATE_BATCH")
    .length;
}

function setPageUrl(url: string): void {
  const windowWithHappyDom = window as Window & { happyDOM?: { setURL: (nextUrl: string) => void } };
  windowWithHappyDom.happyDOM?.setURL(url);
}
