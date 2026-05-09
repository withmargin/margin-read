import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, PROVIDER_DEFAULTS } from "./defaults";

describe("provider defaults", () => {
  it("defines defaults for every supported provider", () => {
    expect(Object.keys(PROVIDER_DEFAULTS).sort()).toEqual(["anthropic", "google", "openai", "openai-compatible"]);
  });

  it("uses the OpenAI provider as the initial default", () => {
    expect(DEFAULT_SETTINGS.provider).toBe("openai");
    expect(DEFAULT_SETTINGS.providerEndpoint).toBe(PROVIDER_DEFAULTS.openai.providerEndpoint);
    expect(DEFAULT_SETTINGS.model).toBe(PROVIDER_DEFAULTS.openai.model);
  });

  it("keeps provider endpoints editable but initialized to official APIs", () => {
    expect(PROVIDER_DEFAULTS.openai.providerEndpoint).toBe("https://api.openai.com/v1/chat/completions");
    expect(PROVIDER_DEFAULTS.anthropic.providerEndpoint).toBe("https://api.anthropic.com/v1/messages");
    expect(PROVIDER_DEFAULTS.google.providerEndpoint).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models"
    );
    expect(PROVIDER_DEFAULTS["openai-compatible"].providerEndpoint).toBe(
      "http://localhost:1234/v1/chat/completions"
    );
  });
});
