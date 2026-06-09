# Margin Read

[![CI](https://github.com/withmargin/margin-read/actions/workflows/ci.yml/badge.svg)](https://github.com/withmargin/margin-read/actions/workflows/ci.yml)
[![Release](https://github.com/withmargin/margin-read/actions/workflows/release.yml/badge.svg)](https://github.com/withmargin/margin-read/actions/workflows/release.yml)
[![CodeQL](https://github.com/withmargin/margin-read/actions/workflows/codeql.yml/badge.svg)](https://github.com/withmargin/margin-read/actions/workflows/codeql.yml)
[![GitHub Release](https://img.shields.io/github/v/release/withmargin/margin-read)](https://github.com/withmargin/margin-read/releases)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/clgdnabgpfiffmfdboefecbhggbepjde?label=chrome%20web%20store)](https://chromewebstore.google.com/detail/clgdnabgpfiffmfdboefecbhggbepjde)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

語言：[English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md)

Margin Read 是一款以隱私為優先的瀏覽器擴充功能，提供雙語網頁翻譯。

以隱私為優先的雙語網頁翻譯，原文保持在原位，讓你閱讀時不會失去脈絡。

Margin 會將網頁原文保留在原位，並把譯文插入對應原文區塊的下方，讓讀者能對照兩種版本，又不會失去頁面的閱讀脈絡。

儲存庫：https://github.com/withmargin/margin-read

## 狀態

Margin 是一款處於早期 MVP 階段的擴充功能，採用 Manifest V3，適用於 Chrome 與 Chromium 系列瀏覽器。

此擴充功能已可用於一般文章頁面、文字量大的傳統頁面，以及部分動態頁面，但仍在積極開發中。在高度互動的網頁應用程式、版面結構特殊的頁面，以及會大幅重寫 DOM 的網站上，可能會遇到一些不完善之處。

## 功能特色

- 從擴充功能的 popup 直接翻譯目前的網頁。
- 保留原文，並將譯文插入對應原文區塊的下方。
- 偵測可閱讀的文字區塊，例如段落、標題、清單項目與引言。
- 處理傳統的 `table`、`font` 以及以 `br` 分隔的頁面。
- 避開常見的非閱讀區域，例如導覽列、表單、按鈕、程式碼區塊、隱藏文字與頁面框架元素。
- 使用使用者自行設定的 provider endpoint 與 API key。
- 支援 OpenAI、Anthropic Claude、Google Gemini，以及相容的 provider 轉接器。
- 支援本機的 OpenAI 相容執行環境，例如 LM Studio、Ollama、llama.cpp server 與 omlx（Apple Silicon），以及 Anthropic Messages API 相容的 endpoint。
- 從 options 頁面取得 provider 的模型清單。
- 選擇整合式或醒目標示的譯文顯示樣式。
- 顯示一個浮動的頁面按鈕（預設啟用），只有在使用者點擊後才開始翻譯。此按鈕可沿著螢幕邊緣垂直拖曳、會記住位置、會依頁面的淺色或深色背景調整外觀，並可透過其關閉（×）控制項或 options 頁面關閉。
- 預設僅在工作階段（session）內快取譯文，另提供持久化與停用快取的選項。
- 在 popup 中顯示文字偵測、佇列狀態與 provider 錯誤的診斷資訊。
- 觀察動態插入的內容。
- 針對 X 的時間軸卡片與長篇文章頁面進行最佳化，鎖定可閱讀的內容，並避開個人檔案名稱、互動數字、媒體與控制項。

Margin 不包含 PDF 翻譯、EPUB 翻譯、字幕翻譯、OCR、輸入框翻譯、雲端同步、帳號、社群功能、預設 telemetry，也沒有官方的付費翻譯額度系統。

## Beta 測試

Beta 測試者在受邀後，可以從 Chrome Web Store 的 beta 上架頁面安裝 Margin，也可以從 GitHub Release 的 ZIP 檔，或從本機原始碼建置版本安裝。完整的設定與意見回饋流程，請參閱 [Beta 測試指南](docs/BETA_TESTING.md)。

## 從原始碼安裝

進行本機開發時，請以未封裝（unpacked）擴充功能的方式載入 Margin：

```sh
corepack enable
pnpm install
pnpm build
```

接著：

1. 開啟 `chrome://extensions`。
2. 啟用開發人員模式。
3. 選擇「載入未封裝項目」。
4. 選擇產生的 `apps/extension/dist/` 目錄。
5. 開啟 Margin 的 options。
6. 設定 provider、API key、模型、目標語言與快取行為。
7. 開啟一個網頁，並從 Margin 的 popup 點擊「翻譯此頁面」。

## Provider 設定

Margin 不內建任何 API key。使用者需自行提供未加上 `Bearer` 前綴的原始 provider API key。

內建的 provider 使用預設 endpoint：

```text
OpenAI: https://api.openai.com/v1/chat/completions
Anthropic Claude: https://api.anthropic.com/v1/messages
Google Gemini: https://generativelanguage.googleapis.com/v1beta/models
```

endpoint 欄位僅在相容 / 本機 LLM 設定中顯示，此時使用者需自行選擇或輸入本機 endpoint。

「取得模型」動作會從所選 provider 讀取可用的模型：

- OpenAI：`GET /v1/models`
- Anthropic Claude：`GET /v1/models`
- Google Gemini：`GET /v1beta/models`
- OpenAI Compatible / Anthropic Compatible：`GET /v1/models`

取得的模型會出現在模型選擇器中。當 provider 的清單未回傳 provider 預設或先前儲存的模型時，Margin 會將目前設定的模型保留為一個選項。

## 隱私

Margin 只會將選取的文字片段傳送給設定好的 provider。預設不會傳送完整的頁面 HTML、不需要登入、不使用雲端同步，預設也不包含 telemetry。

Provider 請求是由擴充功能的 service worker 使用使用者設定的 endpoint 與 API key 發出。provider 的隱私性取決於你選擇的 endpoint 與模型 provider。

API key 會儲存在瀏覽器的擴充功能儲存空間中。請將你的瀏覽器設定檔視為信任環境的一部分。

## X 最佳化

Margin 內建一個可選的 X 專屬偵測器，用於時間軸卡片與長篇文章頁面。啟用後，它會鎖定推文（tweet article）中的 `tweetText` 內容，以及 X 文章檢視中的可閱讀區塊，而非掃描每一個可見的文字節點。

引用貼文（Quoted posts）預設停用，可從 options 啟用。X 已標記為已翻譯的貼文預設會略過，以避免重複翻譯。

## 本機 LLM

Margin 透過相容的 provider 支援本機 LLM 執行環境：

- OpenAI Compatible 使用 OpenAI 風格的 `/v1/chat/completions` API。
- Anthropic Compatible 使用 Anthropic Messages 風格的 `/v1/messages` API，並以工具的 `input_schema` 來輸出結構化結果。這是給相容的本機或 gateway endpoint 使用的傳輸協定選項，而非 Anthropic 另外託管的服務。

這兩個相容的 provider 都允許空白的 API key，並針對本機推論使用較低的預設翻譯併發數。若某個 Anthropic 相容的 gateway 需要金鑰，Margin 會以 `Authorization: Bearer ...` 的形式傳送。

常見的相容 endpoint：

```text
LM Studio: http://localhost:1234/v1/chat/completions
Ollama: http://localhost:11434/v1/chat/completions
llama.cpp server: http://localhost:8080/v1/chat/completions
omlx: http://localhost:8000/v1/chat/completions
Generic Anthropic-compatible: http://localhost:8000/v1/messages
Ollama Anthropic compatibility: http://localhost:11434/v1/messages
```

要使用本機執行環境：

1. 啟動本機的模型伺服器。
2. 開啟 Margin 的 options。
3. 針對 `/v1/chat/completions` 選擇 OpenAI Compatible，或針對 `/v1/messages` 選擇 Anthropic Compatible。
4. 選擇一個 OpenAI 相容的 endpoint 預設值，或輸入你的執行環境所顯示的 endpoint URL。
5. 除非你的本機 gateway 需要金鑰，否則 API key 留空。
6. 點擊「取得模型」，並從模型選擇器中選擇一個已提供服務的模型。
7. 使用 OpenAI Compatible 時，在支援的情況下請保持啟用「Request JSON mode」。若本機執行環境拒絕 `response_format` 請求欄位，則停用此項。

執行環境注意事項：

- LM Studio 通常在 `http://localhost:1234/v1/chat/completions` 提供 OpenAI 相容的請求服務。
- Ollama 需要在 `http://localhost:11434/v1/chat/completions` 提供其 OpenAI 相容的 API。
- Ollama 也可以在 `http://localhost:11434/v1/messages` 提供 Anthropic 相容的請求。Margin 會傳送工具以取得結構化輸出，但不會對 Anthropic 相容的 endpoint 強制使用 `tool_choice`，因為部分相容的執行環境雖然接受工具，卻不支援強制選擇工具。
- llama.cpp server 必須在啟動時啟用 OpenAI 相容的 HTTP 伺服器，通常位於 `http://localhost:8080/v1/chat/completions`。
- omlx 是一個 Apple Silicon 的 MLX 推論伺服器。以 `omlx serve`（零設定，模型來自 `~/.omlx/models`）或 `omlx serve --model-dir /path/to/models` 啟動；OpenAI 相容的 API 會在 `http://localhost:8000/v1/chat/completions` 提供。
- 若「取得模型」失敗，請確認本機伺服器正在執行、endpoint URL 以 `/v1/chat/completions` 或 `/v1/messages` 結尾，且該執行環境有提供相容的 `/v1/models` endpoint。

本機模型的品質、速度、context 長度與 JSON 可靠度，取決於模型與執行環境。建議使用多語言能力強的 instruct 模型來進行翻譯。

## 本機開發

安裝相依套件：

```sh
corepack enable
pnpm install
```

執行具熱重載的開發伺服器（Vite + CRXJS）。先將 `apps/extension/dist/` 以未封裝擴充功能的方式載入一次，之後編輯原始碼時擴充功能就會自動重新載入：

```sh
pnpm --filter @margin/extension dev
```

執行型別檢查：

```sh
pnpm check
```

執行 lint：

```sh
pnpm lint
```

執行擴充功能 manifest 與安全性檢查：

```sh
pnpm check:extension
```

執行測試並產生覆蓋率報告：

```sh
pnpm test
```

建置擴充功能：

```sh
pnpm build
```

建置流程使用搭配 CRXJS 外掛的 Vite（底層採用 Rolldown），並將未封裝的擴充功能輸出至 `apps/extension/dist/`。

## 專案結構

```text
apps/extension/src/background/     Service worker、provider 請求、設定與快取流程
apps/extension/src/content/        頁面文字偵測、佇列處理與譯文插入
apps/extension/src/options/        擴充功能的 options 頁面
apps/extension/src/popup/          Popup UI 與診斷
apps/extension/src/background/providers/      Provider 轉接器
apps/extension/src/shared/         共用的型別、預設值、儲存與訊息
apps/extension/public/             靜態資源（圖示），會原封不動複製到建置中
apps/extension/*.html              Popup 與 options 的 HTML 進入點
apps/extension/scripts/            建置與擴充功能驗證指令稿
docs/                              產品、藍圖、原則與威脅模型
```

## 疑難排解

當頁面看似已啟用卻沒有插入任何譯文時，請在 Margin 的 options 中啟用 Debug 模式。popup 將顯示目前頁面的偵測數量、佇列中的區塊、執行中的請求、待處理的譯文、已完成的譯文、錯誤數量、最新的錯誤，以及一個偵測到的文字區塊範例。

利用這些數值來區分主要的失敗模式：

- `Detected blocks: 0` 表示 content script 在頁面上找不到可閱讀的文字。
- 偵測數量為正、卻沒有執行中的請求，通常表示翻譯佇列需要處理。
- 出現錯誤區塊或最新錯誤，通常指向 provider 設定、認證、模型、endpoint 或回應格式的問題。

## 已知限制

- Firefox 尚非主要目標。
- 站點專屬的 DOM 處理僅限於少數高價值的情境。
- 高度動態的網頁應用程式可能會移動或移除譯文區塊。
- 大型頁面會分批翻譯，因此譯文可能會逐步出現。
- Provider 的速率限制、模型可用性與輸出品質，取決於所設定的 provider。

## 文件

- [產品需求文件](docs/PRD.md)
- [專案原則](docs/PRINCIPLES.md)
- [威脅模型](docs/THREAT_MODEL.md)
- [產品藍圖](docs/ROADMAP.md)
- [Beta 測試指南](docs/BETA_TESTING.md)
- [發布檢查清單](docs/RELEASE_CHECKLIST.md)

## 授權

MIT
