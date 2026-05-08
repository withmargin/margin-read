# Toast Roadmap

## Milestone 1: Working Local MVP

Status: implemented in the initial scaffold.

- Manifest V3 Chrome / Chromium extension.
- Popup page translation toggle.
- Options page for provider settings.
- OpenAI, Anthropic Claude, and Google Gemini provider adapters.
- Readable block detection.
- Below-source translation display.
- Persistent, session, and disabled cache modes.
- Basic provider error states.
- Dynamic content observation.
- Build and local loading instructions.

## Milestone 2: Reading Quality

- Improve article detection beyond simple DOM selectors.
- Add duplicate text block suppression.
- Add per-block retry.
- Add a user action to rescan the page.
- Add inclusion and exclusion rule configuration.
- Improve handling of long articles and very large pages.
- Add tests for text block detection.

## Milestone 3: Provider Ecosystem

- Define a formal provider adapter interface.
- Add documentation for compatible local endpoints and gateways.
- Add LibreTranslate support.
- Add Ollama examples.
- Investigate DeepL support.
- Add provider-specific validation and error messages.

## Milestone 4: Privacy and Release Hardening

- Review extension permissions.
- Evaluate optional host permissions.
- Add a release checklist.
- Add reproducible build notes.
- Add package integrity documentation.
- Decide whether persistent cache should remain the default.

## Milestone 5: Cross-Browser Support

- Review Firefox Manifest V3 compatibility.
- Add browser-specific build output if needed.
- Document Firefox loading instructions.
- Test options, popup, content script, and provider calls in Firefox.

## Explicitly Out of MVP

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
- Side-by-side layout.
