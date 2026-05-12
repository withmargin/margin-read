# Changelog

All notable changes to Margin Read are documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-05-12

### Changed

- **OpenAI translations now enforce a strict JSON schema at the API
  boundary.** Requests use `response_format: { type: "json_schema",
  strict: true }` with Margin's translation shape, so the OpenAI
  decoder is bound to return exactly `{ translations: [{ id, text }] }`
  instead of trusting the model to follow instructions in the prompt.
  Fewer malformed responses, fewer pending blocks stuck on parse
  errors. Affects the `openai` provider only — the `openai-compatible`
  provider (LM Studio, Ollama, llama.cpp) keeps the existing
  `json_object` toggle because local runtimes vary in `json_schema`
  support.

- **Google Gemini translations now constrain output with
  `responseSchema`.** Previously Gemini was only told to return JSON
  via `responseMimeType` and the model had to follow shape hints in
  the prompt. Setting `responseSchema` binds Gemini's decoder to the
  exact translation shape, sharply reducing unparseable responses on
  the Gemini path.

- **Provider adapters now live behind a documented
  `TranslationProvider` interface** at
  `apps/extension/src/background/providers/`. Adding a new provider
  (DeepL, LibreTranslate, a self-hosted gateway) is now a matter of
  implementing `translate` and `listModels`, then adding one entry to
  the registry. The service worker no longer carries any
  provider-specific code paths. Existing OpenAI, Anthropic, Google,
  and OpenAI-compatible providers continue to work without
  configuration changes.

### Reliability

- Per-provider request and response shapes are validated against the
  official `openai`, `@anthropic-ai/sdk`, and `@google/genai` SDKs at
  compile time. The SDKs are dev-only and type-imported; they
  contribute zero bytes to the shipped extension. API drift (renamed
  field, changed nesting) now surfaces as a TypeScript error in
  development instead of a 400 in production.

- `pnpm check:extension` now fails if any shipped bundle exceeds its
  size budget, guarding against accidental SDK runtime leaks.
  `background.js` budget is 20 KB; current size 14.6 KB.

- Service worker orchestration (cache modes, provider dispatch,
  missing-API-key handling, Bearer prefix stripping) is now covered
  by integration-style tests in addition to the existing per-provider
  unit tests. Test count: 224 (up from 183 at the start of the
  release cycle); per-provider line coverage 100%.

### Fixed

- The README project-structure section pointed at a non-existent
  `apps/extension/src/providers/` path; corrected to
  `apps/extension/src/background/providers/` across all eight
  language variants.

## [0.1.0]

Initial unpublished MVP. Chrome Manifest V3 extension with popup
toggle, options UI, OpenAI / Anthropic / Google Gemini provider
adapters, readable-block detection for article and legacy pages,
below-source translation insertion, persistent / session / disabled
cache modes, X timeline and article optimization, and YouTube
subtitle translation. See the git history for the full scaffold.

[Unreleased]: https://github.com/withmargin/margin-read/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/withmargin/margin-read/releases/tag/v0.2.0
