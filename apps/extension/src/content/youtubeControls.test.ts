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

  it("disables caption actions when YouTube has no subtitle control", async () => {
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

    expect(Array.from(captionItems ?? [], (item) => item.disabled)).toEqual([true, true]);
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

    button?.click();
    expect(root?.dataset.open).toBe("true");

    bilingualItem?.click();
    expect(root?.dataset.mode).toBe("bilingual");
    expect(root?.dataset.open).toBe("false");

    translatedItem?.click();
    expect(root?.dataset.mode).toBe("translated");
    expect(root?.dataset.open).toBe("false");
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
    vi.advanceTimersByTime(80);

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
    vi.advanceTimersByTime(80);
    await Promise.resolve();

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

    expect(host.shadowRoot?.querySelector(".margin-youtube__button")?.getAttribute("aria-label")).toBe(
      "Margin captions into French"
    );
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

function setPageUrl(url: string): void {
  const windowWithHappyDom = window as Window & { happyDOM?: { setURL: (nextUrl: string) => void } };
  windowWithHappyDom.happyDOM?.setURL(url);
}
