# Changelog

All notable changes to Margin Read are documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.4] - 2026-06-04

### Fixed

- Loose paragraphs that are not wrapped in their own element are now
  translated. On table-based pages (such as Hacker News) a comment's first
  paragraph is a bare text node followed by `<p>` siblings, and
  single-paragraph comments have no `<p>` at all; both were previously skipped.
- Translations rendered inside table cells no longer overlap the source text.
  The nested translation now uses a small positive top gap instead of a
  negative margin that pulled it up over the original line.

## [0.3.3] - 2026-06-04

### Added

- Anthropic Compatible provider support for local or gateway endpoints that
  implement the Anthropic Messages-style `/v1/messages` API, including model
  fetching via `/v1/models`, optional Bearer auth, local-provider concurrency
  limits, and options-page setup.
- omlx (Apple Silicon MLX) local runtime preset for quick setup of a local
  endpoint.

### Fixed

- Short CJK lines are no longer dropped before translation. Length gating is
  now CJK-aware, so a few Chinese, Japanese, or Korean characters count as
  enough text to translate instead of being filtered out by the previous
  character-count threshold tuned for Latin scripts.
- Punctuation-heavy and short quoted CJK dialogue is now translated instead of
  being treated as noise.
- Parent and child blocks no longer produce duplicate translations; overlapping
  residual text is de-duplicated before enqueueing.

## [0.3.2] - 2026-05-31

### Added

- Debug mode now shows sanitized provider diagnostics in the popup: provider,
  model, endpoint without credentials or query strings, structured-output mode,
  extension version, request start/finish timestamps, and provider duration.
- Debug mode now labels the accumulated enqueue count as `Total enqueued`, so
  repeated scans and viewport-triggered batches are easier to distinguish from
  the current detected-block count.

### Fixed

- Google Gemini translations now send Margin's translation shape through
  `responseJsonSchema` instead of the OpenAPI-subset `responseSchema`, fixing
  Gemini 400 responses when the JSON Schema contains `additionalProperties`.
  This restores Gemini structured output compatibility for current Flash models
  such as `gemini-2.5-flash`.

## [0.3.1] - 2026-05-15

### Changed

- Translation markers now follow the selected target language instead
  of the browser UI language. For example, a Traditional Chinese target
  shows `譯`, Japanese shows `翻訳`, and English shows `Translation`,
  making the marker match the language of the inserted translation.

## [0.3.0] - 2026-05-14

### Added

- **Floating page translation button.** Margin can now show a small
  page-level button that starts translation only after the user clicks
  it. The control uses an isolated shadow DOM, keeps its own close and
  enabled states, and stays out of the source page until explicitly
  enabled from options.

- **YouTube caption translation.** YouTube watch pages now get a
  player-level Margin control for bilingual captions. The extension
  translates existing creator-provided or auto-generated caption
  tracks, renders its own caption overlay, and does not require
  YouTube's native caption button to stay enabled after subtitles are
  loaded.

- **Display style preview and translation marker setting.** The
  options page now previews translation visual styles and keeps
  display style separate from the optional localized translation
  marker. This makes it easier to choose a reading style without
  conflating typography, emphasis, and marker visibility.

### Changed

- **Session-only cache is now the privacy-first default.** Persistent
  cache remains available as an explicit option, but new installs now
  keep repeated translations in the current session by default. When
  users switch away from persistent cache, Margin clears persistent
  translation cache entries.

- **Readable-block extraction now uses a layered cascade.** Generic
  semantic detection, content archetypes, and site adapters now run
  through explicit extraction boundaries with fixture-based regression
  tests. This improves docs, article, X, and forum-style pages without
  forcing every website into a one-off adapter.

- **CJK translation typography was tuned for reading.** Translation
  blocks now use stronger CJK-friendly text rendering, more consistent
  line-height behavior, and modern spacing properties such as
  `text-autospace` where supported.

- **Content script split into focused modules.** The 763-line
  `contentScript.ts` is now a 70-line entry that wires three single-
  responsibility modules: `orchestrator.ts` (translation lifecycle,
  queue, observers, debug state), `translationRenderer.ts` (DOM
  insertion of pending / done / error states with retry wiring), and
  `floatingButton.ts` (shadow-DOM toggle UI). User-visible behavior
  is unchanged; the change makes future feature work — per-site
  adapters, additional UI controls, alternative renderers — far less
  prone to introducing regressions in unrelated parts of the page
  pipeline.

- **Site-specific code now lives behind a documented `SiteAdapter`
  interface.** All X (Twitter) tweet and long-form article detection
  moves out of `textBlocks.ts` into
  `src/content/siteAdapters/x.ts`. YouTube subtitle and caption-
  track support moves into `src/content/siteAdapters/youtube/`.
  Adding support for a new site (Medium, Substack, a SaaS app's
  reader view) is now a matter of dropping a new adapter into
  `siteAdapters/` and registering it in `siteAdapters/index.ts` —
  no edits required in the generic text-block detection or the
  service worker. `textBlocks.ts` is reduced to default semantic +
  legacy fallback detection.

- **X adapter flags are now nested under `siteAdapters.x.*`.** The
  four flat top-level keys (`xOptimizedTranslation`,
  `xTranslateArticles`, `xTranslateQuotedPosts`,
  `xSkipNativeTranslatedPosts`) became one structured object so the
  options form, settings type, and future adapters do not balloon
  the top level of `ExtensionSettings`. Settings now carry an
  explicit `version: 1` field, and storage is migrated on read via
  a stepwise, fixture-pinned migration framework
  (`src/shared/migrations/`). Existing user settings are upgraded
  automatically — preferences are preserved, no manual reconfigure.

- **Settings migration now runs eagerly on install / update.** A
  `chrome.runtime.onInstalled` handler in the service worker runs
  the migration chain once per install or update event and writes
  the migrated shape back to storage. Previously migration was
  lazy (in-memory only) and old flat keys lingered in storage
  until the user saved settings; now storage converges to the
  current schema immediately after the upgrade ships. The lazy
  in-memory path remains as a safety net for edge cases where
  the install event was missed.

### Reliability

- Added 22 new unit tests covering the floating button install
  lifecycle and the translation renderer's pending/done/error/retry
  flows. Renderer and floating button modules at ~100% line coverage.

- Site adapter registry has its own coverage scope and tests. Global
  line coverage at 97%.

- Settings migration is gated by frozen JSON fixtures of real
  historical storage shapes plus a parameterised guard test that
  asserts every fixture migrates cleanly to the current version.
  This pattern makes future schema bumps mechanical — drop the new
  fixture, write the new step migrator, the test suite enforces
  the rest.

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

[Unreleased]: https://github.com/withmargin/margin-read/compare/v0.3.2...HEAD
[0.3.2]: https://github.com/withmargin/margin-read/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/withmargin/margin-read/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/withmargin/margin-read/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/withmargin/margin-read/releases/tag/v0.2.0
