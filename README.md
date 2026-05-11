# Margin Read

Translations: [繁體中文](README.zh-TW.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md)

Margin Read is a privacy-first browser extension for bilingual webpage translation.

Translation and notes, placed where reading happens.

Margin keeps the original webpage text in place and inserts translated text below the matching source blocks, so readers can compare both versions without losing page context.

Repository: https://github.com/linyiru/margin

## Status

Margin is an early MVP for Chrome and Chromium browsers using Manifest V3.

The extension is usable for normal article pages, legacy text-heavy pages, and selected dynamic pages, but it is still under active development. Expect rough edges on highly interactive web apps, pages with unusual layout systems, and sites that aggressively rewrite their DOM.

## Features

- Translate the current webpage from the extension popup.
- Preserve original text and insert translations below matching source blocks.
- Detect readable text blocks such as paragraphs, headings, list items, and blockquotes.
- Handle legacy `table`, `font`, and `br`-separated pages.
- Avoid common non-reading areas such as navigation, forms, buttons, code blocks, hidden text, and page chrome.
- Use user-configured provider endpoints and API keys.
- Support OpenAI, Anthropic Claude, and Google Gemini provider adapters.
- Support local OpenAI-compatible runtimes such as LM Studio, Ollama, and llama.cpp server.
- Fetch provider model lists from the options page.
- Choose integrated or highlighted translation display styles.
- Optionally show a floating page button that starts translation only after the user clicks it.
- Use persistent, session, or disabled translation cache behavior.
- Show popup diagnostics for text detection, queue state, and provider errors.
- Observe dynamically inserted content.
- Optimize X timeline cards and longform article pages by targeting readable content and avoiding profile names, action counts, media, and controls.

Margin does not include PDF translation, EPUB translation, subtitle translation, OCR, input box translation, cloud sync, accounts, social features, default telemetry, or an official paid translation quota system.

## Install From Source

Margin is not packaged in a browser extension store yet. Load it as an unpacked extension:

```sh
corepack enable
pnpm install
pnpm build
```

Then:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Select Load unpacked.
4. Choose the generated `apps/extension/dist/` directory.
5. Open Margin options.
6. Configure a provider, API key, model, target language, and cache behavior.
7. Open a webpage and click Translate this page from the Margin popup.

## Provider Setup

No API key is bundled with Margin. Users provide their own raw provider API key without a `Bearer` prefix.

Built-in providers use default endpoints:

```text
OpenAI: https://api.openai.com/v1/chat/completions
Anthropic Claude: https://api.anthropic.com/v1/messages
Google Gemini: https://generativelanguage.googleapis.com/v1beta/models
```

The endpoint field is shown only for OpenAI Compatible / Local LLM setups, where the user is expected to choose or enter a local endpoint.

The Fetch models action reads available models from the selected provider:

- OpenAI: `GET /v1/models`
- Anthropic Claude: `GET /v1/models`
- Google Gemini: `GET /v1beta/models`

Fetched models appear in the model selector. Margin keeps the currently configured model as an option when a provider default or previously saved model is not returned by the provider list.

## Privacy

Margin sends only selected text segments to the configured provider. It does not send full page HTML by default, does not require login, does not use cloud sync, and does not include telemetry by default.

Provider requests are made by the extension service worker using the endpoint and API key configured by the user. Provider privacy depends on the endpoint and model provider you choose.

API keys are stored in browser extension storage. Treat the browser profile as part of your trusted environment.

## X Optimization

Margin includes an optional X-specific detector for timeline cards and longform article pages. When enabled, it targets `tweetText` content inside tweet articles and readable blocks inside X article views instead of scanning every visible text node.

Quoted posts are disabled by default and can be enabled from options. Posts that X already marks as translated are skipped by default to avoid duplicate translation.

## Local LLMs

Margin supports local LLM runtimes through the OpenAI Compatible provider. This provider uses the OpenAI-style `/v1/chat/completions` API, allows an empty API key, and uses a lower default translation concurrency for local inference.

Common endpoint presets:

```text
LM Studio: http://localhost:1234/v1/chat/completions
Ollama: http://localhost:11434/v1/chat/completions
llama.cpp server: http://localhost:8080/v1/chat/completions
```

To use a local runtime:

1. Start the local model server.
2. Open Margin options.
3. Select OpenAI Compatible as the provider.
4. Select an endpoint preset, or enter the endpoint URL shown by your runtime.
5. Leave API key empty unless your local gateway requires one.
6. Click Fetch models and choose a served model from the model selector.
7. Keep Request JSON mode enabled when supported. Disable it if the local runtime rejects the `response_format` request field.

Runtime notes:

- LM Studio commonly serves OpenAI-compatible requests at `http://localhost:1234/v1/chat/completions`.
- Ollama requires its OpenAI-compatible API to be available at `http://localhost:11434/v1/chat/completions`.
- llama.cpp server must be started with an OpenAI-compatible HTTP server enabled, commonly at `http://localhost:8080/v1/chat/completions`.
- If Fetch models fails, confirm the local server is running, the endpoint URL ends with `/v1/chat/completions`, and the runtime exposes a compatible `/v1/models` endpoint.

Local model quality, speed, context length, and JSON reliability depend on the model and runtime. Instruct models with strong multilingual ability are recommended for translation.

## Local Development

Install dependencies:

```sh
corepack enable
pnpm install
```

Run type checks:

```sh
pnpm check
```

Run lint:

```sh
pnpm lint
```

Run extension manifest and security checks:

```sh
pnpm check:extension
```

Run tests with coverage:

```sh
pnpm test
```

Build the extension:

```sh
pnpm build
```

The build uses Rolldown and writes the unpacked extension to `apps/extension/dist/`.

## Project Structure

```text
apps/extension/src/background/     Service worker, provider requests, settings, and cache flow
apps/extension/src/content/        Page text detection, queueing, and translation insertion
apps/extension/src/options/        Extension options page
apps/extension/src/popup/          Popup UI and diagnostics
apps/extension/src/providers/      Provider adapters
apps/extension/src/shared/         Shared types, defaults, storage, and messages
apps/extension/public/             Static extension UI and content CSS
apps/extension/scripts/            Build and extension validation scripts
docs/                              Product, roadmap, principles, and threat model
```

## Troubleshooting

Enable Debug mode in Margin options when a page appears enabled but no translations are inserted. The popup will show the current page detection count, queued blocks, running requests, pending translations, completed translations, error count, the latest error, and a sample detected text block.

Use those values to separate the main failure modes:

- `Detected blocks: 0` means the content script did not find readable text on the page.
- A positive detected count with no running requests usually means the translation queue needs attention.
- Error blocks or a latest error usually point to provider configuration, authentication, model, endpoint, or response format problems.

## Known Limitations

- Firefox is not the primary target yet.
- Site-specific DOM handling is limited to a few high-value cases.
- Highly dynamic web apps may move or remove translation blocks.
- Large pages are translated in batches, so translations may appear progressively.
- Provider rate limits, model availability, and output quality depend on the configured provider.

## Documentation

- [Product Requirements](docs/PRD.md)
- [Project Principles](docs/PRINCIPLES.md)
- [Threat Model](docs/THREAT_MODEL.md)
- [Roadmap](docs/ROADMAP.md)

## License

MIT
