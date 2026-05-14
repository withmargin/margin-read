---
layout: ../layouts/LegalLayout.astro
title: Privacy Policy
effective: "2026-05-11"
description: How Margin Works handles your data — and how to verify every claim by reading the source code.
---

## TL;DR

- **Margin Works operates no server in the translation path.** Text from your browser goes directly to the AI provider you choose (OpenAI, Anthropic, Google, or any OpenAI-compatible endpoint you configure). It never passes through us.
- **We collect no usage data, no analytics, no telemetry, no error reports, no identifiers.** None. There is no Margin Works server for the extension to phone home to.
- **Your settings and API keys live in your browser only**, in `chrome.storage.local`. They are never synchronized to Google, never sent to us, never sent anywhere except by Chrome's own browser-profile sync if you have separately turned that on.
- **We bundle no API keys.** You supply your own and have a direct billing relationship with the provider.
- **The extension is open source under the MIT license.** Every statement in this policy can be verified by reading the code in [github.com/withmargin/margin-read](https://github.com/withmargin/margin-read). Concrete `grep` commands are provided at the end of this page.

## Who We Are

**Margin Works** is the project behind **Margin Read**, the browser extension this policy describes, and **marginread.com**, the marketing site you are reading this on.

The extension, the marketing site, and all supporting documentation live in a single public repository: [github.com/withmargin/margin-read](https://github.com/withmargin/margin-read).

You can reach us at **hello@marginread.com**.

## What Margin Read Does With Text From The Pages You Read

When you have the extension active on a webpage, it scans the page for **readable text blocks** — semantic elements such as headings (`h1`–`h3`), paragraphs inside `<article>` or `<main>`, list items, blockquotes, and platform-specific elements like individual tweets. It does **not** transmit the full page HTML.

For each block to be translated, the extension sends:

1. The text content of the block (capped at 4,000 characters per block).
2. Optionally, up to ~280 characters of adjacent context from neighboring elements, when present, to improve translation coherence.
3. Your translation settings — source language, target language, model name, and the system prompt you have configured.

That payload is sent **directly from your browser** to the API endpoint of the provider you have chosen in Settings. The defaults are:

| Provider | Default endpoint |
|---|---|
| OpenAI | `https://api.openai.com/v1/chat/completions` |
| Anthropic | `https://api.anthropic.com/v1/messages` |
| Google Gemini | `https://generativelanguage.googleapis.com/v1beta/models` |
| OpenAI-compatible local | `http://localhost:1234/v1/chat/completions` |

You can change any endpoint in Settings — for instance, to point at a self-hosted Ollama, LM Studio, or another OpenAI-compatible server on your own infrastructure. **No request, default or custom, ever transits a server operated by Margin Works.**

The exact selector list and length thresholds used to identify translatable blocks are in a single file: `apps/extension/src/content/textBlocks.ts`. Anything outside that selector set is never read by the extension.

## What Margin Works Collects

**Nothing.**

There is no Margin Works backend for the extension to contact. The extension does not report installs, crashes, feature usage, language pairs, version numbers, error stacks, or any other event. There is no Margin Read account, no login flow, no anonymous identifier, no installation UUID, no fingerprinting code.

The marketing site (marginread.com) likewise does not collect personal data. The site is served by a Cloudflare Worker; Cloudflare provides standard aggregate visitor analytics (country-level traffic, request counts, edge cache hit rates) that we may use to gauge interest in the project, but no per-visitor data is collected, stored, or processed by us.

We deliberately operate **no email list**. The "Notify me on launch" affordance on the homepage links out to GitHub (where you can `Watch` the repository for releases) and to the GitHub releases RSS/Atom feed. Both are subscription channels operated by **GitHub**, not by us — GitHub handles the delivery, and Margin Works never sees the list of who is subscribed. There is no opt-in email form anywhere on the site.

> **If telemetry or analytics are ever added in the future**, the change will satisfy all of the following before any data is ever collected:
>
> 1. **Opt-in, off by default.** You will see an explicit toggle in Settings with a plain-language description of exactly what is collected.
> 2. **Never** include translated text, page content, your API keys, the URLs you visit, or anything that identifies you. Any new collection is limited to aggregate, non-identifying counters (e.g. "provider chosen", "extension version").
> 3. **Documented in a new version of this policy**, with a visible changelog and a commit in the public repository, before any such code ships.
> 4. **Implemented in the same open source repository**, so every line is auditable before you opt in.

## Storage

The extension persists data in `chrome.storage.local`, which is per-device and per-browser-profile:

- Your preferences (provider, model, target language, display options).
- Your API key for each provider you have configured.
- A session-only translation cache by default, so repeated text in the same browsing session does not need to be re-translated. You can also opt into persistent cache, which stores translated text in this browser profile until you clear it, or disable caching entirely. Persistent cache can be cleared with a single button in Settings.

The extension does **not** use `chrome.storage.sync` — the variant of Chrome storage that synchronizes across the devices where you are signed in to Chrome. Settings and API keys stay on the device they were entered on.

API keys are stored using whatever protection Chrome applies to all `chrome.storage.local` data on your operating system. They are not separately encrypted by the extension. If your device or browser profile is compromised, an attacker with local access could read them — the same threat that applies to any browser-stored credential.

## Third-Party Providers

When you send text to OpenAI, Anthropic, Google, or any other endpoint you configure, the handling of that data **from the moment it leaves your browser** is governed by that provider's privacy policy, not ours:

- OpenAI: [https://openai.com/policies/privacy-policy](https://openai.com/policies/privacy-policy)
- Anthropic: [https://www.anthropic.com/legal/privacy](https://www.anthropic.com/legal/privacy)
- Google AI: [https://policies.google.com/privacy](https://policies.google.com/privacy)

You select the provider. You hold the API key. You have the billing relationship with the provider. Margin Works is not a party to that relationship, has no visibility into the requests, and cannot retrieve, delete, or audit anything sent to those providers on your behalf.

If you want translation that touches no third party at all, point the extension at a local endpoint (Ollama, LM Studio, or any OpenAI-compatible server you run yourself). The extension treats local endpoints exactly the same as remote ones — the difference, from a privacy standpoint, is purely the address you configure.

## Browser Permissions

The extension declares the following permissions in `manifest.json`:

- **`activeTab`** — to read text from the page you are currently viewing.
- **`storage`** — to persist settings and the optional translation cache locally.
- **`host_permissions: ["<all_urls>"]`** — because the websites you read are unpredictable; the extension must be able to operate on any URL.

The `<all_urls>` permission grants the technical ability to read content on every site you visit. The extension uses this ability narrowly: it reads only the semantic text blocks described above, never passwords or form fields, never invisible elements, and it transmits nothing to anywhere except the provider you have configured.

## How To Verify Every Claim On This Page

The entire extension is open source under the MIT license. You can verify each statement above by reading and grepping the code yourself.

```bash
git clone https://github.com/withmargin/margin-read
cd margin-read/apps/extension
```

**Claim: "No analytics or telemetry SDKs are bundled."**

```bash
grep -rEi "(google-analytics|googletagmanager|gtag|sentry|posthog|mixpanel|amplitude|segment|plausible|fathom|heap|datadog|rollbar)" src/ public/
```

Expected: no matches.

**Claim: "All outbound network requests from the extension go to user-configured provider endpoints."**

```bash
grep -rnE "fetch\(" src/background/
```

Read each call site. Every URL should resolve to a value from the settings store — there should be no hardcoded URL pointing at `marginread.com`, `marginworks.dev`, or any other Margin Works infrastructure.

**Claim: "Storage is device-local; nothing is synchronized to Google."**

```bash
grep -rn "chrome.storage" src/
```

Expected: every match is `chrome.storage.local`. No `chrome.storage.sync` anywhere.

**Claim: "No API keys are bundled."**

```bash
grep -rEi "(sk-[a-zA-Z0-9]{20,}|AIza[a-zA-Z0-9]{20,})" src/ public/
```

Expected: no matches outside of UI placeholder strings (e.g. the `placeholder=` attribute on the API key input in `public/options.html`).

**Claim: "Text selection is heuristic and limited to semantic blocks."**

Read `src/content/textBlocks.ts` end-to-end. The CSS selectors, the minimum and maximum length thresholds, and the X-platform-specific overrides are all in that single file.

If your audit turns up anything inconsistent with this policy, please open an issue at [github.com/withmargin/margin-read/issues](https://github.com/withmargin/margin-read/issues). We treat any divergence between policy and code as a bug to fix in the next version.

## Children

Margin Read is not directed at children. We do not knowingly collect anything from anyone, including children. Because we collect nothing from anyone, there is nothing specific to do here beyond stating the obvious.

## Regulatory Notes (GDPR / CCPA / etc.)

Because Margin Works does not collect, store, transmit, or otherwise process personal data, the data-subject rights granted by GDPR, the CCPA, and similar regimes (right to access, right to deletion, right to portability, right to opt out of sale) have no data on our side to act on.

If you believe we hold information about you, or you have a question about how the extension interacts with a specific provider's handling of your data, please contact **hello@marginread.com**. We will respond, in writing, in English.

## Security Disclosures

If you find a security issue — an actual bug in the extension or marketing site that could expose user data or violate a claim in this policy — please email **hello@marginread.com** with the details. Public discussion of a confirmed vulnerability should wait until a patched version has shipped.

## Changes To This Policy

Every change to this policy is committed to the public repository in `apps/website/src/pages/privacy.md`. The commit history of that file is the canonical changelog — including who proposed each change and when.

Material changes (those that affect what is collected, what is sent where, or who has access) will be called out in the project README and announced on the marketing site before they take effect.

## Contact

**hello@marginread.com**

For public discussion, bug reports, and audit findings: [github.com/withmargin/margin-read/issues](https://github.com/withmargin/margin-read/issues).
