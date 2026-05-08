# Toast Project Principles

## Purpose

Toast exists to provide a trustworthy, open-source bilingual webpage translation experience. The project is intentionally scoped to webpage reading so the privacy model, source code, and product behavior remain understandable.

## Principles

### Preserve Source Context

Toast must keep the original webpage text visible. Translations are assistive context, not replacements for the source.

### Be Truly Open Source

The source code, build process, and core translation flow must be inspectable. A contributor should be able to build the extension locally and understand how text moves through the system.

### Avoid Backend Lock-In

Core functionality must not require a proprietary official backend. Users configure their own provider endpoint and API key.

### Put Privacy First

Toast sends only selected text segments to the configured provider. It does not send full page HTML by default, does not require accounts, and does not include telemetry by default.

### Keep the MVP Narrow

The MVP is only bilingual webpage translation. PDF, EPUB, subtitles, OCR, input box translation, cloud sync, and social features are outside the MVP.

### Keep Provider Choice Modular

OpenAI, Anthropic Claude, and Google Gemini are first-class MVP provider targets. The architecture should remain open to DeepL, LibreTranslate, Ollama, local models, and self-hosted endpoints.

### Make Scope Creep Visible

New features should be evaluated against the PRD and roadmap. Features listed as non-goals should not enter the MVP without an explicit documentation update.

### Prefer Explainable Permissions

Extension permissions should be documented and tied to user-facing behavior. Broad permissions require clear justification.

### No Dark Patterns

Toast should not force login, hide provider behavior, enable telemetry by default, or steer users into an official quota system.
