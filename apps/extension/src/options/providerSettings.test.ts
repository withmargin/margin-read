import { beforeEach, describe, expect, it, vi } from "vitest";
import { chromeI18nMock } from "../../test/chromeI18n";
import { DEFAULT_SETTINGS, PROVIDER_DEFAULTS } from "../shared/defaults";
import { initializeProviderSettings } from "./providerSettings";
import { readForm } from "./settingsForm";

function setupOptionsDom(): void {
  document.body.innerHTML = `
    <select name="provider">
      <option value="openai">OpenAI</option>
      <option value="openai-compatible">OpenAI Compatible</option>
      <option value="anthropic-compatible">Anthropic Compatible</option>
    </select>
    <fieldset data-provider-section="openai-compatible">
      <select id="local-endpoint-preset">
        <option value=""></option>
        <option value="http://localhost:1234/v1/chat/completions">LM Studio</option>
        <option value="http://localhost:8000/v1/chat/completions">omlx</option>
      </select>
      <input name="openAICompatibleJsonMode" type="checkbox" />
    </fieldset>
    <fieldset data-provider-section="anthropic-compatible"></fieldset>
    <label data-provider-section="openai-compatible anthropic-compatible">
      <input name="providerEndpoint" type="url" />
    </label>
    <input name="apiKey" />
    <select id="model-select" name="model"></select>
    <button id="fetch-models" type="button">Fetch models</button>
  `;
}

describe("provider settings", () => {
  beforeEach(() => {
    setupOptionsDom();
    vi.stubGlobal("chrome", {
      runtime: {
        sendMessage: vi.fn()
      },
      i18n: chromeI18nMock()
    });
  });

  it("keeps provider endpoints scoped to OpenAI Compatible", () => {
    initializeProviderSettings({ readForm, setStatus: vi.fn() });

    expect(document.querySelector<HTMLElement>("[data-provider-section='openai-compatible']")?.hidden).toBe(true);
    expect(document.querySelector<HTMLElement>("[data-provider-section='anthropic-compatible']")?.hidden).toBe(true);
    expect(
      document.querySelector<HTMLElement>("[data-provider-section='openai-compatible anthropic-compatible']")?.hidden
    ).toBe(true);

    const providerInput = document.querySelector<HTMLSelectElement>('[name="provider"]')!;
    providerInput.value = "openai-compatible";
    providerInput.dispatchEvent(new Event("change"));

    expect(document.querySelector<HTMLElement>("[data-provider-section='openai-compatible']")?.hidden).toBe(false);
    expect(document.querySelector<HTMLElement>("[data-provider-section='anthropic-compatible']")?.hidden).toBe(true);
    expect(
      document.querySelector<HTMLElement>("[data-provider-section='openai-compatible anthropic-compatible']")?.hidden
    ).toBe(false);
    expect(document.querySelector<HTMLInputElement>('[name="providerEndpoint"]')?.value).toBe(
      PROVIDER_DEFAULTS["openai-compatible"].providerEndpoint
    );
  });

  it("keeps provider endpoints scoped to Anthropic Compatible", () => {
    initializeProviderSettings({ readForm, setStatus: vi.fn() });

    const providerInput = document.querySelector<HTMLSelectElement>('[name="provider"]')!;
    providerInput.value = "anthropic-compatible";
    providerInput.dispatchEvent(new Event("change"));

    expect(document.querySelector<HTMLElement>("[data-provider-section='openai-compatible']")?.hidden).toBe(true);
    expect(document.querySelector<HTMLElement>("[data-provider-section='anthropic-compatible']")?.hidden).toBe(false);
    expect(
      document.querySelector<HTMLElement>("[data-provider-section='openai-compatible anthropic-compatible']")?.hidden
    ).toBe(false);
    expect(document.querySelector<HTMLInputElement>('[name="providerEndpoint"]')?.value).toBe(
      PROVIDER_DEFAULTS["anthropic-compatible"].providerEndpoint
    );
  });

  it("applies the omlx endpoint preset as OpenAI Compatible", () => {
    initializeProviderSettings({ readForm, setStatus: vi.fn() });

    const localEndpointPreset = document.querySelector<HTMLSelectElement>("#local-endpoint-preset")!;
    localEndpointPreset.value = "http://localhost:8000/v1/chat/completions";
    localEndpointPreset.dispatchEvent(new Event("change"));

    expect(document.querySelector<HTMLSelectElement>('[name="provider"]')?.value).toBe("openai-compatible");
    expect(document.querySelector<HTMLElement>("[data-provider-section='openai-compatible']")?.hidden).toBe(false);
    expect(document.querySelector<HTMLInputElement>('[name="providerEndpoint"]')?.value).toBe(
      "http://localhost:8000/v1/chat/completions"
    );
  });

  it("disables Fetch Models while loading and restores the button after success", async () => {
    const sendMessage = vi.mocked(chrome.runtime.sendMessage);
    sendMessage.mockResolvedValue({
      ok: true,
      models: [
        { id: DEFAULT_SETTINGS.model },
        { id: "gpt-4.1", displayName: "GPT 4.1" }
      ]
    });
    const setStatus = vi.fn();

    initializeProviderSettings({ readForm, setStatus });
    const button = document.querySelector<HTMLButtonElement>("#fetch-models")!;
    button.click();

    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.textContent).toBe("Fetching...");

    await Promise.resolve();
    await Promise.resolve();

    expect(button.disabled).toBe(false);
    expect(button.hasAttribute("aria-busy")).toBe(false);
    expect(button.textContent).toBe("Fetch models");
    expect(
      Array.from(document.querySelectorAll<HTMLOptionElement>("#model-select option"), (option) => option.value)
    ).toEqual(["", DEFAULT_SETTINGS.model, "gpt-4.1"]);
    expect(setStatus).toHaveBeenLastCalledWith("Loaded 2 models.");
  });

  it("restores Fetch Models after provider errors", async () => {
    vi.mocked(chrome.runtime.sendMessage).mockResolvedValue({ ok: false, error: "Unauthorized" });
    const setStatus = vi.fn();

    initializeProviderSettings({ readForm, setStatus });
    const button = document.querySelector<HTMLButtonElement>("#fetch-models")!;
    button.click();

    await Promise.resolve();
    await Promise.resolve();

    expect(button.disabled).toBe(false);
    expect(button.textContent).toBe("Fetch models");
    expect(setStatus).toHaveBeenLastCalledWith("Unauthorized");
  });
});
