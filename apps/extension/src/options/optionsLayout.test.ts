import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const optionsHtml = readFileSync(join(process.cwd(), "public/options.html"), "utf8");

describe("options layout", () => {
  it("places Fetch Models next to the model selector", () => {
    const document = createDocument(optionsHtml);
    const modelSelect = document.querySelector("#model-select");
    const fetchButton = document.querySelector("#fetch-models");

    expect(modelSelect).not.toBeNull();
    expect(fetchButton).not.toBeNull();
    expect(fetchButton?.closest("label")).toBe(modelSelect?.closest("label"));
  });

  it("scopes the provider endpoint to the OpenAI Compatible section", () => {
    const document = createDocument(optionsHtml);
    const endpointInput = document.querySelector<HTMLInputElement>('[name="providerEndpoint"]');

    expect(endpointInput).not.toBeNull();
    expect(endpointInput?.closest("[data-provider-section]")?.getAttribute("data-provider-section")).toBe(
      "openai-compatible"
    );
  });

  it("marks the provider and API key fields for row alignment", () => {
    const document = createDocument(optionsHtml);

    expect(document.querySelector('[data-field="provider"] select[name="provider"]')).not.toBeNull();
    expect(document.querySelector('[data-field="api-key"] input[name="apiKey"]')).not.toBeNull();
  });

  it("hides the specific source language picker until the user opts in", () => {
    const document = createDocument(optionsHtml);

    expect(document.querySelector("#source-language-mode")).not.toBeNull();
    expect(document.querySelector("#source-language-specific")?.hasAttribute("hidden")).toBe(true);
    expect(document.querySelector<HTMLInputElement>('[name="sourceLanguage"]')?.type).toBe("hidden");
  });

  it("explains YouTube caption requirements before display settings", () => {
    const document = createDocument(optionsHtml);
    const youtubeHeading = document.querySelector('[data-i18n="youtubeCaptions"]');
    const displayHeading = document.querySelector('[data-i18n="displayStyle"]');

    expect(youtubeHeading).not.toBeNull();
    expect(displayHeading).not.toBeNull();
    expect(document.querySelector('[data-i18n="youtubeSpeechToTextHint"]')).not.toBeNull();
    expect(youtubeHeading!.compareDocumentPosition(displayHeading!) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  });
});

function createDocument(html: string): Document {
  const document = globalThis.document.implementation.createHTMLDocument("options");
  document.body.innerHTML = html
    .replace(/<link\b[^>]*>/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  return document;
}
