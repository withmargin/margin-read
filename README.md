# Rosetta

Rosetta is a privacy-first, truly open-source browser extension for bilingual webpage translation. It preserves the original webpage text and inserts translated text below matching source paragraphs so readers can compare both versions in the original page context.

## MVP Scope

Rosetta currently targets Chrome and Chromium browsers with Manifest V3. The MVP supports:

- Translating the current webpage from the extension popup.
- Detecting readable text blocks such as paragraphs, headings, list items, and blockquotes.
- Preserving the original text and inserting translations below the matching source block.
- Excluding common non-reading areas such as navigation, forms, buttons, code blocks, hidden text, and page chrome.
- Using a user-configured OpenAI-compatible API endpoint.
- Storing provider settings in browser extension storage.
- Basic persistent, session, or disabled translation cache behavior.
- Basic error states when provider configuration or requests fail.
- Mutation observation for dynamically inserted content.

Rosetta does not include PDF translation, EPUB translation, subtitle translation, OCR, input box translation, cloud sync, accounts, social features, default telemetry, or official paid translation quota features.

## Local Development

Install dependencies:

```sh
npm install
```

Run type checks:

```sh
npm run check
```

Build the extension:

```sh
npm run build
```

The build uses Rolldown and writes the unpacked extension to `dist/`.

## Load in Chrome or Chromium

1. Build the extension with `npm run build`.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Select Load unpacked.
5. Choose the `dist/` directory.
6. Open Rosetta options and configure an OpenAI-compatible endpoint, API key, model, source language, target language, and cache behavior.
7. Open a normal article webpage and click Translate this page from the Rosetta popup.

## OpenAI-Compatible Provider

The MVP expects a `/chat/completions` compatible endpoint. The default endpoint is:

```text
https://api.openai.com/v1/chat/completions
```

No API key is bundled with the extension. Users must provide their own key or self-hosted compatible endpoint.

## Privacy Position

Rosetta sends only selected text segments to the configured provider. It does not send full page HTML by default, does not require login, does not use cloud sync, and does not include telemetry by default. Provider requests are made by the extension service worker using the endpoint and API key configured by the user.

## Documentation

- [Product Requirements](docs/PRD.md)
- [Project Principles](docs/PRINCIPLES.md)
- [Threat Model](docs/THREAT_MODEL.md)
- [Roadmap](docs/ROADMAP.md)
