# PRD: Rosetta Bilingual Webpage Translation Extension

## 1. Summary

Rosetta is a truly open-source browser extension for bilingual webpage translation. It preserves the original webpage text and inserts translated text near the corresponding source text block, with the MVP placing translations below the original paragraph or readable block.

The MVP is scoped to Chrome and Chromium browser extension support. It does not attempt to cover every possible translation workflow. It focuses on one core reading experience: translating normal webpages in place while keeping the source text visible and auditable.

## 2. Product Positioning

Rosetta is an open-source, privacy-first alternative for users who want bilingual webpage reading without forced login, cloud sync, proprietary backend lock-in, bundled translation quota, or default telemetry.

The product should be understandable and buildable from source. Core functionality must work with user-configured translation providers, beginning with OpenAI, Anthropic Claude, and Google Gemini adapters.

## 3. Product Principles

- Preserve original context: the source text remains visible and is never replaced by translated text.
- Be truly open source: the extension source, build workflow, and core translation flow are public and reproducible.
- Avoid proprietary lock-in: core translation does not require an official closed backend.
- Respect privacy: only selected text segments are sent to the configured provider.
- Avoid forced identity: no account system is required for MVP use.
- Keep provider choice modular: OpenAI, Anthropic Claude, and Google Gemini are first-class MVP providers, and the architecture should allow DeepL, LibreTranslate, Ollama, local models, and self-hosted endpoints later.
- Keep permissions explainable: permissions should map directly to webpage translation and provider requests.
- Prefer a working reading tool over broad feature coverage.
- Do not include telemetry by default.

## 4. Target Users

- Readers who want bilingual access to foreign-language articles, documentation, essays, and forum posts.
- Developers and researchers who want to inspect the source code and provider data flow.
- Privacy-conscious users who want to choose where webpage text is sent.
- Power users who already have OpenAI, Anthropic Claude, Google Gemini, or compatible gateway access.
- Open-source contributors who want a narrowly scoped extension they can maintain and improve.

## 5. Problems To Solve

- Existing translation extensions often obscure where text is sent.
- Some products claim open-source positioning while relying on closed services for core behavior.
- Full-page replacement translation loses source context and makes mistranslations harder to catch.
- Users may be forced into accounts, quotas, subscriptions, or official backends.
- Many extensions combine too many features, making privacy and maintainability harder to reason about.

## 6. Core Reading Experience

The user opens a regular webpage, clicks the Rosetta extension popup, and selects Translate this page. Rosetta detects readable text blocks, sends those text segments to the configured provider, and inserts translated text below the corresponding original blocks.

The original page remains readable. Translations use a low-disruption visual style and should not require the user to leave the page. Translation can be disabled for the page, which removes Rosetta-inserted translation blocks and leaves the original webpage intact.

The MVP display style is below-source translation. Side-by-side layout is a later feature because it has higher compatibility and responsive design risk.

## 7. MVP Scope

- Chrome and Chromium extension using Manifest V3.
- Popup action to enable or disable translation for the current page.
- Content script that detects readable text blocks.
- Translation inserted below source text blocks.
- OpenAI, Anthropic Claude, and Google Gemini provider adapters.
- Options page for endpoint, API key, model, source language, target language, and cache behavior.
- Options page support for fetching provider model lists.
- Basic persistent, session, or disabled cache modes.
- Basic error state inserted near affected text blocks.
- MutationObserver support for dynamically inserted content.
- Documentation for local install, build, and extension loading.

## 8. Non-Goals

- PDF translation.
- EPUB translation.
- Subtitle translation.
- Image translation, OCR, or manga translation.
- Input box translation.
- Cloud sync.
- Social features.
- Account system.
- Default telemetry.
- Official paid translation quota.
- Perfect compatibility with every website in MVP.
- Side-by-side translation layout in MVP.

## 9. User Stories

- As a reader, I want to translate a webpage while keeping the original text visible, so I can verify meaning and context.
- As a privacy-conscious user, I want to configure my own provider endpoint, so I can control where text is sent.
- As a developer, I want to build the extension from source, so I can inspect and verify the implementation.
- As a researcher, I want paragraph-level translations aligned with source paragraphs, so I can compare terminology.
- As a power user, I want cache controls, so repeated translation requests are reduced or disabled according to my preference.
- As a maintainer, I want a narrow MVP, so scope creep does not dilute the core webpage reading experience.

## 10. Functional Requirements

- The extension must allow users to translate the active webpage from the popup.
- The extension must allow users to disable translation for the current page.
- The extension must preserve the original webpage text.
- The extension must insert translations below matching source text blocks in MVP.
- The extension must send only extracted text segments, not full page HTML, to the provider.
- The extension must show an actionable error when the API key is missing or provider requests fail.
- The extension must support OpenAI chat completions, Anthropic Claude Messages API, and Google Gemini generateContent.
- The extension should let users fetch available models from the selected provider.
- The extension must not hardcode API keys.
- The extension must store settings in browser extension storage.
- The extension must support dynamically inserted readable content.

## 11. Text Block Detection Requirements

The MVP should detect common readable blocks:

- `p`
- `li`
- `blockquote`
- `h1`
- `h2`
- `h3`

Detection should prioritize blocks inside `article` and `main`, but it may fall back to page-wide candidates.

The MVP should exclude:

- `nav`
- `footer`
- `aside`
- `form`
- `button`
- `pre`
- `code`
- `script`
- `style`
- `noscript`
- `svg`
- `canvas`
- `textarea`
- `select`
- Hidden nodes and `aria-hidden` content
- Blocks containing interactive form controls

Text blocks should be normalized by trimming and collapsing whitespace. Very short blocks are skipped unless they are headings.

## 12. Translation Display Requirements

- The original source block remains unchanged.
- The translation is inserted immediately after the source block.
- The translation block has a distinct class name and low-disruption visual style.
- Pending, done, and error states are visually distinguishable.
- Disabling translation removes inserted translation blocks and Rosetta attributes.
- The MVP supports only below-source display style.

## 13. Translation Provider Requirements

The MVP provider targets are OpenAI chat completions, Anthropic Claude Messages API, and Google Gemini generateContent.

Provider settings include:

- Provider
- Provider endpoint
- API key
- Model
- Source language or `auto`
- Target language

The provider adapter should request structured output containing translated segments by ID. Claude uses forced tool use for structured translation results, while other providers may use provider-specific JSON response controls. Model listing should use provider-specific official model APIs where available. Future adapters should be able to implement the same conceptual contract without rewriting content detection or display logic.

## 14. Privacy & Security Requirements

- No forced login.
- No cloud sync in MVP.
- No default telemetry.
- No bundled API key.
- No official backend required for core translation.
- API keys are stored in browser extension storage.
- Only selected text segments are sent to the configured provider.
- Full page HTML is not sent by default.
- The active provider endpoint is user-configured.
- Documentation must clearly explain what data leaves the browser.

## 15. Open Source Requirements

- Source code required to build the MVP must be included in the repository.
- Build instructions must be documented.
- The built extension must be reproducible from repository source and package dependencies.
- Core translation flow must be inspectable.
- Provider logic must be modular enough for community adapters.
- Product scope must remain clear through `PRD.md`, `PRINCIPLES.md`, `THREAT_MODEL.md`, and `ROADMAP.md`.

## 16. Performance Requirements

- Translation should run in small batches to avoid long blocking requests.
- The page should remain interactive while translation is in progress.
- Repeated text should not be resent when cache is enabled.
- Mutation observation should be debounced.
- MVP scanning should cap the number of blocks processed per pass to reduce runaway behavior on large pages.

## 17. Accessibility Requirements

- Popup and options controls must use native HTML controls.
- Status text should be available through normal text content or `role="status"` where appropriate.
- Translation styling should preserve readable contrast.
- The extension should not trap keyboard focus.
- Inserted translation text should remain selectable and readable by assistive technology.

## 18. Browser Support

MVP:

- Chrome stable.
- Chromium-based browsers that support Manifest V3.

Later:

- Firefox support after the Chrome MVP is stable.
- Additional browser-specific packaging if required.

## 19. Technical Architecture Overview

- Popup: sends page-level enable or disable messages to the active tab.
- Content script: detects readable text blocks, manages page state, inserts translation blocks, observes dynamic content.
- Service worker: owns provider requests, settings reads, persistent cache reads and writes, and runtime message handling.
- Options page: manages provider and cache settings.
- Shared modules: define settings, storage helpers, hashing, and runtime message types.

## 20. Data Flow

1. User configures provider settings in the options page.
2. User may fetch available models from the selected provider through the service worker.
3. User opens a webpage and clicks Translate this page.
4. Popup sends `TOGGLE_TRANSLATION` to the active tab.
5. Content script detects readable text blocks.
6. Content script sends text segments to the service worker.
7. Service worker checks cache.
8. Service worker sends uncached text segments to the configured provider.
9. Service worker returns translated segments to the content script.
10. Content script inserts translations below matching source blocks.

## 21. Settings & Configuration

MVP settings:

- `providerEndpoint`
- `provider`
- `apiKey`
- `model`
- `sourceLanguage`
- `targetLanguage`
- `displayStyle`
- `cacheMode`

`displayStyle` supports `integrated` and `highlighted`. Integrated is the default because it inherits typography from the source page and minimizes visual disruption. Highlighted keeps a more explicit translation block for review-heavy reading.

## 22. Error Handling

- Missing API key returns an error before provider requests are attempted.
- Provider HTTP failures are surfaced as translation block errors.
- Invalid provider responses are surfaced as translation block errors.
- Individual batch failures should not permanently damage the page.
- Disabling translation should remove pending or failed translation blocks.

## 23. Success Metrics

- A developer can install dependencies, build the extension, load `dist/` in Chrome, configure a provider, and translate a normal article webpage.
- Original text remains visible after translation.
- Translations appear below matching source text blocks.
- No account, cloud sync, telemetry, or proprietary backend is required.
- Documentation matches MVP behavior.
- Common non-reading elements are skipped by default.

## 24. Milestones / Roadmap

Milestone 1: Working MVP

- Manifest V3 extension scaffold.
- Popup translation toggle.
- Options page.
- OpenAI, Anthropic Claude, and Google Gemini provider adapters.
- Basic text block detection.
- Below-source translation insertion.
- Basic cache and error states.

Milestone 2: Reading Quality

- Better article extraction heuristics.
- Better deduplication.
- Per-site compatibility fixes.
- User-controlled inclusion and exclusion rules.
- Retry failed blocks individually.

Milestone 3: Provider Ecosystem

- Provider adapter interface documentation.
- LibreTranslate adapter.
- Ollama or local OpenAI-compatible examples.
- DeepL adapter investigation.

Milestone 4: Browser Expansion

- Firefox compatibility review.
- Cross-browser packaging.
- Extension store release checklist.

## 25. Risks

- Broad `host_permissions` may concern users even though arbitrary webpages and endpoints require broad access in MVP.
- Some webpages may have unusual DOM structures that produce poor block detection.
- Provider JSON responses may be malformed.
- API costs depend on the user's configured provider.
- Storing API keys in extension storage is convenient but still carries local browser compromise risk.
- Mutation observation can reprocess dynamic pages if heuristics are insufficient.

## 26. Open Questions

- Which open-source license should govern the project?
- Should persistent cache be encrypted or disabled by default?
- Should the extension eventually support per-site provider settings?
- What is the minimum acceptable permission set for store distribution?
- How should reproducible release artifacts be verified?
- Should Firefox be supported before or after provider adapter expansion?
