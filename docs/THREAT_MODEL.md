# Rosetta Threat Model

## Scope

This threat model covers the MVP browser extension for bilingual webpage translation. The MVP includes a popup, content script, service worker, options page, local settings, local cache, and OpenAI, Anthropic Claude, and Google Gemini provider adapters.

Out of scope:

- PDF translation.
- EPUB translation.
- Subtitle translation.
- OCR or image translation.
- Cloud sync.
- Account systems.
- Official hosted translation quota.

## Assets

- Webpage text selected for translation.
- Provider API key.
- Provider endpoint URL.
- Source and target language preferences.
- Translation cache entries.
- User trust in the extension's data flow.

## Trust Boundaries

- Webpage DOM to content script.
- Content script to service worker.
- Service worker to configured provider endpoint.
- Options page to browser extension storage.
- Browser extension storage to local browser profile.

## Data Flow

1. The content script detects readable text blocks from the webpage DOM.
2. The content script sends normalized text segments to the service worker.
3. The service worker checks cache according to user settings.
4. The service worker sends uncached segments to the configured provider endpoint.
5. The provider returns translated text.
6. The content script inserts translated text below the matching source block.
7. When the user fetches models, the service worker sends a provider-specific model list request using the configured API key.

## Threats and Mitigations

### Unintended Text Disclosure

Risk: The extension could send more webpage content than users expect.

Mitigations:

- Send text segments only, not full HTML.
- Exclude navigation, forms, buttons, code blocks, hidden text, and page chrome by default.
- Document the data flow clearly.
- Keep translation disabled until the user activates it for a page.

### API Key Exposure

Risk: The provider API key is stored in browser extension storage and used by the service worker.

Mitigations:

- Never hardcode API keys.
- Use password input on the options page.
- Keep provider requests in the extension service worker.
- Document that local browser profile compromise can expose stored secrets.

### Malicious or Unexpected Provider Endpoint

Risk: A configured endpoint receives translated text and may log or misuse it.

Mitigations:

- Make the endpoint user-configured and visible in options.
- Do not silently redirect requests through an official backend.
- Document that provider privacy depends on the configured endpoint.

### Model List Requests

Risk: Fetching models sends the configured API key to the selected provider endpoint.

Mitigations:

- Only fetch models when the user clicks Fetch models.
- Use the selected provider's documented model list endpoint.
- Keep manual model entry available as a fallback.

### Overbroad Permissions

Risk: `<all_urls>` host access is broad and may reduce user trust.

Mitigations:

- Use broad access only because the MVP must translate arbitrary webpages and call arbitrary configured provider endpoints.
- Document the reason for broad host permissions.
- Revisit optional host permissions before store release.

### Malformed Provider Responses

Risk: Provider output may not match the expected JSON schema.

Mitigations:

- Request JSON output.
- Validate returned translation IDs and text.
- Surface errors near affected text blocks.

### DOM Compatibility and Page Breakage

Risk: Inserted translation nodes may disrupt page layout.

Mitigations:

- Insert simple `div` translation nodes after source blocks.
- Use a namespaced CSS class.
- Remove Rosetta nodes and attributes when disabled.
- Avoid translating interactive controls and code blocks.

### Cache Privacy

Risk: Persistent cache stores translated text in the browser profile.

Mitigations:

- Provide cache mode options: persistent, session only, disabled.
- Provide a clear cache action.
- Consider disabling persistent cache by default in a later privacy review.

## Residual Risks

- A malicious webpage could observe DOM changes after translations are inserted.
- Provider endpoints may log text according to their own policies.
- Browser extension storage is not a secure vault.
- Some webpage structures may cause accidental translation of non-reading text.

## Security Review Checklist

- Confirm no bundled API key exists.
- Confirm no telemetry endpoint exists.
- Confirm no account or cloud sync code exists.
- Confirm provider endpoint is user-configured.
- Confirm content script does not send full HTML.
- Confirm disabling translation removes inserted nodes.
