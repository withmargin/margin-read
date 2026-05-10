# Toast Translate

Sprachen: [English](README.md) · [繁體中文](README.zh-TW.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md)

Toast Translate ist eine datenschutzorientierte Browser-Erweiterung fuer zweisprachige Webseitenuebersetzung.

Toast ersetzt den Originaltext nicht. Es fuegt die Uebersetzung unter den passenden Quelltextbloecken ein, damit Leser beide Versionen vergleichen koennen, ohne den Seitenkontext zu verlieren.

Repository: https://github.com/linyiru/toast

## Status

Toast ist ein fruehes MVP fuer Chrome und Chromium-Browser mit Manifest V3.

Die Erweiterung ist fuer normale Artikelseiten, alte textlastige Seiten und einige dynamische Seiten nutzbar, befindet sich aber noch in aktiver Entwicklung. Auf sehr interaktiven Web apps, ungewoehnlichen Layoutsystemen oder Websites, die das DOM stark umschreiben, kann es noch raue Kanten geben.

## Funktionen

- Uebersetzt die aktuelle Webseite aus dem Extension-Popup.
- Erhaelt Originaltext und fuegt Uebersetzungen unter den passenden Quellbloecken ein.
- Erkennt lesbare Textbloecke wie Absaetze, Ueberschriften, Listenelemente und Zitate.
- Behandelt alte `table`-, `font`- und `br`-getrennte Seiten.
- Umgeht typische Nicht-Lesebereiche wie Navigation, Formulare, Buttons, Codebloecke, versteckten Text und Seiten-UI.
- Verwendet vom Nutzer konfigurierte provider endpoints und API keys.
- Unterstuetzt OpenAI, Anthropic Claude und Google Gemini provider adapters.
- Unterstuetzt lokale OpenAI-compatible runtimes wie LM Studio, Ollama und llama.cpp server.
- Ruft provider model lists von der Optionsseite ab.
- Bietet integrierte oder hervorgehobene Uebersetzungsanzeige.
- Erlaubt persistenten, sitzungsbasierten oder deaktivierten Uebersetzungs-Cache.
- Zeigt Popup-Diagnosen fuer Texterkennung, Queue-Zustand und provider-Fehler.
- Beobachtet dynamisch eingefuegte Inhalte.
- Optimiert X timeline cards und longform article pages, indem lesbarer Inhalt gezielt uebersetzt und Profilnamen, Zaehler, Medien und Controls vermieden werden.

Toast enthaelt keine PDF-Uebersetzung, EPUB-Uebersetzung, Untertitel-Uebersetzung, OCR, Eingabefeld-Uebersetzung, Cloud-Sync, Accounts, Social Features, Standard-telemetry oder ein offizielles bezahltes Uebersetzungskontingent.

## Aus dem Quellcode installieren

Toast ist noch nicht in einem Browser Extension Store paketiert. Lade es als unpacked extension:

```sh
corepack enable
pnpm install
pnpm build
```

Dann:

1. Oeffne `chrome://extensions`.
2. Aktiviere Developer mode.
3. Waehle Load unpacked.
4. Waehle das erzeugte `dist/` Verzeichnis.
5. Oeffne Toast options.
6. Konfiguriere provider, API key, model, Zielsprache und Cache-Verhalten.
7. Oeffne eine Webseite und klicke im Toast popup auf Translate this page.

## Provider Setup

Toast enthaelt keinen API key. Nutzer geben ihren eigenen rohen provider API key ohne `Bearer` Prefix an.

Eingebaute provider verwenden Standard-endpoints:

```text
OpenAI: https://api.openai.com/v1/chat/completions
Anthropic Claude: https://api.anthropic.com/v1/messages
Google Gemini: https://generativelanguage.googleapis.com/v1beta/models
```

Das Endpoint-Feld wird nur fuer OpenAI Compatible / Local LLM Setups angezeigt, bei denen der Nutzer einen lokalen endpoint waehlen oder eingeben soll.

Fetch models liest verfuegbare Modelle vom gewaehlten provider:

- OpenAI: `GET /v1/models`
- Anthropic Claude: `GET /v1/models`
- Google Gemini: `GET /v1beta/models`

Abgerufene Modelle erscheinen im model selector. Toast behaelt das aktuell konfigurierte Modell als Option, wenn ein provider default oder zuvor gespeichertes Modell nicht in der provider-Liste vorkommt.

## Datenschutz

Toast sendet nur ausgewaehlte Textsegmente an den konfigurierten provider. Standardmaessig wird kein vollstaendiges Seiten-HTML gesendet, kein Login benoetigt, kein Cloud-Sync genutzt und keine telemetry eingebaut.

Provider requests werden vom Extension service worker mit dem vom Nutzer konfigurierten endpoint und API key ausgefuehrt. Der Datenschutz beim provider haengt vom gewaehlten endpoint und Modell-provider ab.

API keys werden im browser extension storage gespeichert. Behandle das Browserprofil als Teil deiner vertrauenswuerdigen Umgebung.

## X Optimierung

Toast enthaelt einen optionalen X-specific detector fuer timeline cards und longform article pages. Wenn aktiviert, zielt er auf `tweetText` in tweet articles und lesbare Bloecke in X article views, statt alle sichtbaren Textnodes zu scannen.

Quoted posts sind standardmaessig deaktiviert und koennen in options aktiviert werden. Posts, die X bereits als uebersetzt markiert, werden standardmaessig uebersprungen, um doppelte Uebersetzung zu vermeiden.

## Lokale LLMs

Toast unterstuetzt lokale LLM runtimes ueber den OpenAI Compatible provider. Dieser provider verwendet die OpenAI-artige `/v1/chat/completions` API, erlaubt einen leeren API key und nutzt eine niedrigere Standard-concurrency fuer lokale Inferenz.

Haeufige endpoint presets:

```text
LM Studio: http://localhost:1234/v1/chat/completions
Ollama: http://localhost:11434/v1/chat/completions
llama.cpp server: http://localhost:8080/v1/chat/completions
```

Lokalen runtime verwenden:

1. Starte den lokalen model server.
2. Oeffne Toast options.
3. Waehle OpenAI Compatible als provider.
4. Waehle ein endpoint preset oder gib die URL ein, die dein runtime anzeigt.
5. Lasse API key leer, sofern dein lokales gateway keinen benoetigt.
6. Klicke Fetch models und waehle ein bereitgestelltes Modell im model selector.
7. Lasse Request JSON mode aktiviert, wenn unterstuetzt. Deaktiviere ihn, falls der lokale runtime das Feld `response_format` ablehnt.

## Lokale Entwicklung

```sh
corepack enable
pnpm install
pnpm check
pnpm lint
pnpm check:extension
pnpm test
pnpm build
```

Der Build verwendet Rolldown und schreibt die unpacked extension nach `dist/`.

## Projektstruktur

```text
src/background/     Service worker, provider requests, settings und cache flow
src/content/        Seitentexterkennung, Queue und Uebersetzungseinfuegung
src/options/        Extension options page
src/popup/          Popup UI und Diagnosen
src/providers/      Provider adapters
src/shared/         Gemeinsame types, defaults, storage und messages
public/             Statische extension UI und content CSS
scripts/            Build und extension validation scripts
docs/               Product, roadmap, principles und threat model
```

## Fehlerbehebung

Aktiviere Debug mode in Toast options, wenn eine Seite aktiv wirkt, aber keine Uebersetzungen eingefuegt werden. Das Popup zeigt Erkennungsanzahl, Queue, laufende requests, pending translations, completed translations, Fehleranzahl, letzten Fehler und ein Beispiel des erkannten Texts.

## Bekannte Einschraenkungen

- Firefox ist noch nicht das Hauptziel.
- Site-specific DOM handling ist auf wenige hochwertige Faelle beschraenkt.
- Sehr dynamische Web apps koennen Uebersetzungsbloecke verschieben oder entfernen.
- Grosse Seiten werden in Batches uebersetzt, daher erscheinen Uebersetzungen schrittweise.
- Provider rate limits, Modellverfuegbarkeit und Ausgabequalitaet haengen vom konfigurierten provider ab.

## Dokumentation

- [Product Requirements](docs/PRD.md)
- [Project Principles](docs/PRINCIPLES.md)
- [Threat Model](docs/THREAT_MODEL.md)
- [Roadmap](docs/ROADMAP.md)

## License

MIT
