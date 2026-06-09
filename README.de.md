# Margin Read

[![CI](https://github.com/withmargin/margin-read/actions/workflows/ci.yml/badge.svg)](https://github.com/withmargin/margin-read/actions/workflows/ci.yml)
[![Release](https://github.com/withmargin/margin-read/actions/workflows/release.yml/badge.svg)](https://github.com/withmargin/margin-read/actions/workflows/release.yml)
[![CodeQL](https://github.com/withmargin/margin-read/actions/workflows/codeql.yml/badge.svg)](https://github.com/withmargin/margin-read/actions/workflows/codeql.yml)
[![GitHub Release](https://img.shields.io/github/v/release/withmargin/margin-read)](https://github.com/withmargin/margin-read/releases)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/clgdnabgpfiffmfdboefecbhggbepjde?label=chrome%20web%20store)](https://chromewebstore.google.com/detail/clgdnabgpfiffmfdboefecbhggbepjde)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Sprachen: [English](README.md) · [繁體中文](README.zh-TW.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md)

Margin Read ist eine datenschutzorientierte Browser-Erweiterung für die zweisprachige Übersetzung von Webseiten.

Datenschutzorientierte zweisprachige Web-Übersetzung, die den Originaltext an Ort und Stelle belässt, damit Sie nie den Kontext verlieren.

Margin lässt den Originaltext der Webseite an seinem Platz und fügt den übersetzten Text unterhalb der jeweils passenden Quellblöcke ein, sodass Leser beide Versionen vergleichen können, ohne den Seitenkontext zu verlieren.

Repository: https://github.com/withmargin/margin-read

## Status

Margin ist ein frühes MVP für Chrome- und Chromium-Browser auf Basis von Manifest V3.

Die Erweiterung ist für normale Artikelseiten, ältere textlastige Seiten und ausgewählte dynamische Seiten nutzbar, befindet sich aber noch in aktiver Entwicklung. Rechnen Sie mit Ecken und Kanten bei hochgradig interaktiven Web-Apps, Seiten mit ungewöhnlichen Layout-Systemen und Websites, die ihr DOM aggressiv umschreiben.

## Funktionen

- Übersetzen Sie die aktuelle Webseite direkt aus dem Popup der Erweiterung.
- Bewahren Sie den Originaltext und fügen Sie Übersetzungen unterhalb der passenden Quellblöcke ein.
- Erkennen Sie lesbare Textblöcke wie Absätze, Überschriften, Listenpunkte und Blockzitate.
- Verarbeiten Sie ältere Seiten mit `table`, `font` und `br`-getrennten Inhalten.
- Vermeiden Sie typische Nicht-Lesebereiche wie Navigation, Formulare, Schaltflächen, Code-Blöcke, versteckten Text und Seiten-Chrome.
- Nutzen Sie vom Benutzer konfigurierte Provider-Endpoints und API keys.
- Unterstützen Sie OpenAI, Anthropic Claude, Google Gemini und kompatible Provider-Adapter.
- Unterstützen Sie lokale OpenAI-kompatible Laufzeitumgebungen wie LM Studio, Ollama, llama.cpp server und omlx (Apple Silicon) sowie Anthropic-Messages-API-kompatible Endpoints.
- Rufen Sie Provider-Modelllisten von der Optionsseite ab.
- Wählen Sie zwischen integrierten oder hervorgehobenen Anzeigestilen für die Übersetzung.
- Zeigen Sie eine schwebende Seiten-Schaltfläche (standardmäßig aktiviert), die die Übersetzung erst startet, nachdem der Benutzer darauf geklickt hat. Die Schaltfläche kann vertikal entlang des Bildschirmrands gezogen werden, merkt sich ihre Position, passt ihre Hülle an den hellen oder dunklen Hintergrund der Seite an und kann über ihr Schließen-Steuerelement (×) oder die Optionsseite deaktiviert werden.
- Verwenden Sie standardmäßig ein nur sitzungsbasiertes Übersetzungs-Caching, mit Optionen für persistentes oder deaktiviertes Caching.
- Zeigen Sie im Popup Diagnosedaten zur Texterkennung, zum Warteschlangenstatus und zu Provider-Fehlern an.
- Beobachten Sie dynamisch eingefügte Inhalte.
- Optimieren Sie X-Timeline-Cards und längere Artikelseiten, indem Sie auf lesbare Inhalte abzielen und Profilnamen, Aktionszähler, Medien und Steuerelemente meiden.

Margin enthält keine PDF-Übersetzung, EPUB-Übersetzung, Untertitel-Übersetzung, OCR, Eingabefeld-Übersetzung, Cloud-Synchronisierung, Konten, Social-Funktionen, standardmäßige Telemetrie oder ein offizielles, kostenpflichtiges Übersetzungs-Kontingentsystem.

## Beta-Test

Beta-Tester können Margin nach Einladung über das Beta-Listing im Chrome Web Store,
über ein ZIP eines GitHub Release oder über einen lokalen Build aus dem Quellcode
installieren. Den vollständigen Einrichtungs- und Feedback-Workflow finden Sie im
[Beta-Test-Leitfaden](docs/BETA_TESTING.md).

## Aus dem Quellcode installieren

Für die lokale Entwicklung laden Sie Margin als entpackte Erweiterung:

```sh
corepack enable
pnpm install
pnpm build
```

Anschließend:

1. Öffnen Sie `chrome://extensions`.
2. Aktivieren Sie den Entwicklermodus.
3. Wählen Sie „Entpackte Erweiterung laden“.
4. Wählen Sie das generierte Verzeichnis `apps/extension/dist/`.
5. Öffnen Sie die Margin-Optionen.
6. Konfigurieren Sie einen Provider, einen API key, ein Modell, eine Zielsprache und das Cache-Verhalten.
7. Öffnen Sie eine Webseite und klicken Sie im Margin-Popup auf „Diese Seite übersetzen“.

## Provider-Einrichtung

Margin enthält keinen mitgelieferten API key. Benutzer geben ihren eigenen, rohen Provider-API-key ohne `Bearer`-Präfix an.

Integrierte Provider verwenden Standard-Endpoints:

```text
OpenAI: https://api.openai.com/v1/chat/completions
Anthropic Claude: https://api.anthropic.com/v1/messages
Google Gemini: https://generativelanguage.googleapis.com/v1beta/models
```

Das Endpoint-Feld wird nur bei kompatiblen / Local-LLM-Konfigurationen angezeigt, bei denen der Benutzer einen lokalen Endpoint auswählen oder eingeben soll.

Die Aktion „Modelle abrufen“ liest die verfügbaren Modelle vom ausgewählten Provider:

- OpenAI: `GET /v1/models`
- Anthropic Claude: `GET /v1/models`
- Google Gemini: `GET /v1beta/models`
- OpenAI Compatible / Anthropic Compatible: `GET /v1/models`

Die abgerufenen Modelle erscheinen im Modellauswahlmenü. Margin behält das aktuell konfigurierte Modell als Option bei, wenn ein Provider-Standardmodell oder ein zuvor gespeichertes Modell nicht in der Provider-Liste enthalten ist.

## Datenschutz

Margin sendet nur ausgewählte Textsegmente an den konfigurierten Provider. Es sendet standardmäßig nicht das vollständige HTML der Seite, erfordert keine Anmeldung, nutzt keine Cloud-Synchronisierung und enthält standardmäßig keine Telemetrie.

Provider-Anfragen werden vom service worker der Erweiterung mit dem vom Benutzer konfigurierten Endpoint und API key gestellt. Der Datenschutz beim Provider hängt vom gewählten Endpoint und Modellanbieter ab.

API keys werden im Erweiterungsspeicher des Browsers abgelegt. Behandeln Sie das Browserprofil als Teil Ihrer vertrauenswürdigen Umgebung.

## X-Optimierung

Margin enthält einen optionalen, X-spezifischen Detektor für Timeline-Cards und längere Artikelseiten. Wenn aktiviert, zielt er auf `tweetText`-Inhalte innerhalb von Tweet-Artikeln und auf lesbare Blöcke innerhalb von X-Artikelansichten ab, anstatt jeden sichtbaren Textknoten zu scannen.

Zitierte Beiträge sind standardmäßig deaktiviert und können in den Optionen aktiviert werden. Beiträge, die X bereits als übersetzt markiert hat, werden standardmäßig übersprungen, um doppelte Übersetzungen zu vermeiden.

## Local LLMs

Margin unterstützt lokale LLM-Laufzeitumgebungen über kompatible Provider:

- OpenAI Compatible verwendet die OpenAI-typische `/v1/chat/completions`-API.
- Anthropic Compatible verwendet die Anthropic-Messages-typische `/v1/messages`-API mit strukturierter Ausgabe über tool `input_schema`. Es ist eine Wire-Protokoll-Option für kompatible lokale oder Gateway-Endpoints, kein separater, von Anthropic gehosteter Dienst.

Beide kompatiblen Provider erlauben einen leeren API key und verwenden für lokale Inferenz eine niedrigere standardmäßige Übersetzungs-Parallelität. Wenn ein Anthropic-kompatibles Gateway einen Schlüssel erfordert, sendet Margin ihn als `Authorization: Bearer ...`.

Gängige kompatible Endpoints:

```text
LM Studio: http://localhost:1234/v1/chat/completions
Ollama: http://localhost:11434/v1/chat/completions
llama.cpp server: http://localhost:8080/v1/chat/completions
omlx: http://localhost:8000/v1/chat/completions
Generic Anthropic-compatible: http://localhost:8000/v1/messages
Ollama Anthropic compatibility: http://localhost:11434/v1/messages
```

So verwenden Sie eine lokale Laufzeitumgebung:

1. Starten Sie den lokalen Modellserver.
2. Öffnen Sie die Margin-Optionen.
3. Wählen Sie OpenAI Compatible für `/v1/chat/completions` oder Anthropic Compatible für `/v1/messages`.
4. Wählen Sie eine OpenAI-kompatible Endpoint-Voreinstellung oder geben Sie die von Ihrer Laufzeitumgebung angezeigte Endpoint-URL ein.
5. Lassen Sie den API key leer, sofern Ihr lokales Gateway keinen erfordert.
6. Klicken Sie auf „Modelle abrufen“ und wählen Sie ein bereitgestelltes Modell aus dem Modellauswahlmenü.
7. Lassen Sie bei OpenAI Compatible den Modus „JSON-Modus anfordern“ aktiviert, sofern unterstützt. Deaktivieren Sie ihn, wenn die lokale Laufzeitumgebung das Anfragefeld `response_format` ablehnt.

Hinweise zu Laufzeitumgebungen:

- LM Studio bedient OpenAI-kompatible Anfragen üblicherweise unter `http://localhost:1234/v1/chat/completions`.
- Ollama erfordert, dass seine OpenAI-kompatible API unter `http://localhost:11434/v1/chat/completions` verfügbar ist.
- Ollama kann Anthropic-kompatible Anfragen auch unter `http://localhost:11434/v1/messages` bereitstellen. Margin sendet tools für strukturierte Ausgabe, erzwingt aber kein `tool_choice` für Anthropic-kompatible Endpoints, da einige kompatible Laufzeitumgebungen tools akzeptieren, aber keine erzwungene Tool-Auswahl unterstützen.
- llama.cpp server muss mit aktiviertem OpenAI-kompatiblem HTTP-Server gestartet werden, üblicherweise unter `http://localhost:8080/v1/chat/completions`.
- omlx ist ein Apple-Silicon-MLX-Inferenzserver. Starten Sie ihn mit `omlx serve` (ohne Konfiguration, Modelle aus `~/.omlx/models`) oder `omlx serve --model-dir /path/to/models`; die OpenAI-kompatible API wird dann unter `http://localhost:8000/v1/chat/completions` verfügbar.
- Wenn „Modelle abrufen“ fehlschlägt, prüfen Sie, ob der lokale Server läuft, die Endpoint-URL auf `/v1/chat/completions` oder `/v1/messages` endet und die Laufzeitumgebung einen kompatiblen `/v1/models`-Endpoint bereitstellt.

Die Qualität, Geschwindigkeit, Kontextlänge und JSON-Zuverlässigkeit lokaler Modelle hängen vom Modell und der Laufzeitumgebung ab. Für die Übersetzung werden Instruct-Modelle mit starken mehrsprachigen Fähigkeiten empfohlen.

## Lokale Entwicklung

Abhängigkeiten installieren:

```sh
corepack enable
pnpm install
```

Starten Sie den Dev-Server mit Hot Reloading (Vite + CRXJS). Laden Sie `apps/extension/dist/`
einmal als entpackte Erweiterung, bearbeiten Sie dann den Quellcode, und die Erweiterung
lädt sich automatisch neu:

```sh
pnpm --filter @margin/extension dev
```

Typprüfungen ausführen:

```sh
pnpm check
```

Lint ausführen:

```sh
pnpm lint
```

Manifest- und Sicherheitsprüfungen der Erweiterung ausführen:

```sh
pnpm check:extension
```

Tests mit Coverage ausführen:

```sh
pnpm test
```

Erweiterung bauen:

```sh
pnpm build
```

Der Build verwendet Vite mit dem CRXJS-Plugin (Rolldown im Hintergrund) und schreibt die entpackte Erweiterung nach `apps/extension/dist/`.

## Projektstruktur

```text
apps/extension/src/background/     Service worker, Provider-Anfragen, Einstellungen und Cache-Ablauf
apps/extension/src/content/        Texterkennung der Seite, Warteschlange und Einfügen von Übersetzungen
apps/extension/src/options/        Optionsseite der Erweiterung
apps/extension/src/popup/          Popup-UI und Diagnose
apps/extension/src/background/providers/      Provider-Adapter
apps/extension/src/shared/         Gemeinsame Typen, Standardwerte, Speicher und Nachrichten
apps/extension/public/             Statische Assets (Icons), unverändert in den Build kopiert
apps/extension/*.html              HTML-Einstiegspunkte für Popup und Optionen
apps/extension/scripts/            Build- und Validierungsskripte der Erweiterung
docs/                              Produkt, Roadmap, Prinzipien und Bedrohungsmodell
```

## Fehlerbehebung

Aktivieren Sie den Debug-Modus in den Margin-Optionen, wenn eine Seite als aktiviert erscheint, aber keine Übersetzungen eingefügt werden. Das Popup zeigt dann die aktuelle Anzahl erkannter Seitenelemente, die in der Warteschlange befindlichen Blöcke, laufende Anfragen, ausstehende Übersetzungen, abgeschlossene Übersetzungen, die Fehleranzahl, den letzten Fehler und ein Beispiel eines erkannten Textblocks an.

Verwenden Sie diese Werte, um die Hauptfehlerquellen voneinander zu unterscheiden:

- `Detected blocks: 0` bedeutet, dass das Content-Skript keinen lesbaren Text auf der Seite gefunden hat.
- Eine positive Erkennungszahl ohne laufende Anfragen bedeutet in der Regel, dass die Übersetzungs-Warteschlange Aufmerksamkeit benötigt.
- Fehlerblöcke oder ein letzter Fehler deuten in der Regel auf Probleme mit der Provider-Konfiguration, der Authentifizierung, dem Modell, dem Endpoint oder dem Antwortformat hin.

## Bekannte Einschränkungen

- Firefox ist noch nicht das primäre Ziel.
- Website-spezifische DOM-Behandlung ist auf einige wenige, besonders wertvolle Fälle beschränkt.
- Hochgradig dynamische Web-Apps können Übersetzungsblöcke verschieben oder entfernen.
- Große Seiten werden in Batches übersetzt, sodass Übersetzungen nach und nach erscheinen können.
- Provider-Ratenlimits, Modellverfügbarkeit und Ausgabequalität hängen vom konfigurierten Provider ab.

## Dokumentation

- [Produktanforderungen](docs/PRD.md)
- [Projektprinzipien](docs/PRINCIPLES.md)
- [Bedrohungsmodell](docs/THREAT_MODEL.md)
- [Roadmap](docs/ROADMAP.md)
- [Beta-Test-Leitfaden](docs/BETA_TESTING.md)
- [Release-Checkliste](docs/RELEASE_CHECKLIST.md)

## Lizenz

MIT
