# Rosetta

Rosetta is a privacy-first, truly open-source browser extension for bilingual webpage translation. It preserves the original webpage text and inserts translated text below matching source paragraphs so readers can compare both versions in the original page context.

## MVP Scope

Rosetta currently targets Chrome and Chromium browsers with Manifest V3. The MVP supports:

- Translating the current webpage from the extension popup.
- Detecting readable text blocks such as paragraphs, headings, list items, and blockquotes.
- Preserving the original text and inserting translations below the matching source block.
- Excluding common non-reading areas such as navigation, forms, buttons, code blocks, hidden text, and page chrome.
- Supporting user-configured OpenAI, Anthropic Claude, and Google Gemini providers.
- Storing provider settings in browser extension storage.
- Fetching official provider model lists from the options page.
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

Run extension manifest and security checks:

```sh
npm run check:extension
```

Run tests with coverage:

```sh
npm test
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
6. Open Rosetta options and configure a provider, endpoint, API key, model, source language, target language, and cache behavior.
7. Open a normal article webpage and click Translate this page from the Rosetta popup.

## Translation Providers

The MVP supports three provider adapters:

- OpenAI chat completions
- Anthropic Claude Messages API
- Google Gemini generateContent API

Default endpoints:

```text
OpenAI: https://api.openai.com/v1/chat/completions
Anthropic Claude: https://api.anthropic.com/v1/messages
Google Gemini: https://generativelanguage.googleapis.com/v1beta/models
```

No API key is bundled with the extension. Users must provide their own raw provider API key without a `Bearer` prefix. The endpoint field remains editable for compatible gateways and self-hosted routing.

The Fetch models action reads available models from the selected provider:

- OpenAI: `GET /v1/models`
- Anthropic Claude: `GET /v1/models`
- Google Gemini: `GET /v1beta/models`

Fetched models appear in the model selector. The custom model input remains available for unreleased models, compatible gateways, and self-hosted routes.

Anthropic Claude translations use forced tool use to return structured translation data instead of free-form text. This avoids markdown-wrapped JSON responses and keeps parsing reliable.

## Privacy Position

Rosetta sends only selected text segments to the configured provider. It does not send full page HTML by default, does not require login, does not use cloud sync, and does not include telemetry by default. Provider requests are made by the extension service worker using the endpoint and API key configured by the user.

## Documentation

- [Product Requirements](docs/PRD.md)
- [Project Principles](docs/PRINCIPLES.md)
- [Threat Model](docs/THREAT_MODEL.md)
- [Roadmap](docs/ROADMAP.md)
