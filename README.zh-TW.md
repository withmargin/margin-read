# Toast Translate

語言：[English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md)

Toast Translate 是一個以隱私為優先的雙語網頁翻譯瀏覽器擴充功能。

Toast 不會取代網頁原文，而是把譯文插入在對應的原文區塊下方，讓你可以一邊保留原本的閱讀脈絡，一邊對照譯文。

Repository: https://github.com/linyiru/toast

## 目前狀態

Toast 目前仍是早期 MVP，支援 Chrome 與其他 Chromium 系瀏覽器，並使用 Manifest V3。

它已經可以用在一般文章頁、舊式文字密集頁面，以及部分動態頁面。不過專案仍在開發中，遇到高度互動的 Web app、特殊排版系統，或會頻繁重寫 DOM 的網站時，可能還會有不穩定或體驗不夠細緻的地方。

## 功能特色

- 從擴充功能的 popup 翻譯目前頁面。
- 保留原文，並在對應的原文區塊下方插入譯文。
- 偵測可閱讀的文字區塊，例如段落、標題、列表項目與引用區塊。
- 支援舊式 `table`、`font`，以及以 `br` 分隔文字的頁面。
- 避開常見的非閱讀區域，例如導覽列、表單、按鈕、程式碼區塊、隱藏文字與頁面介面。
- 使用你自行設定的 provider endpoint 與 API key。
- 支援 OpenAI、Anthropic Claude 與 Google Gemini provider adapter。
- 支援本機 OpenAI-compatible runtime，例如 LM Studio、Ollama 與 llama.cpp server。
- 可從 options 頁面取得 provider 的模型列表。
- 可選擇融入原文或醒目提示的譯文顯示樣式。
- 可選擇在頁面顯示浮動翻譯按鈕，且只有使用者點擊後才開始翻譯。
- 可選擇持久快取、僅 session 快取，或停用翻譯快取。
- 在 popup 顯示文字偵測、佇列狀態與 provider 錯誤等診斷資訊。
- 可偵測並處理動態插入的內容。
- 針對 X timeline 卡片與長文頁面最佳化，只翻譯可閱讀內容，並避開個人名稱、互動數字、媒體與操作按鈕。

Toast 不包含 PDF 翻譯、EPUB 翻譯、字幕翻譯、OCR、輸入框翻譯、雲端同步、帳號系統、社交功能、預設 telemetry，或官方付費翻譯額度系統。

## 從原始碼安裝

Toast 目前尚未上架瀏覽器擴充功能商店。請以 unpacked extension 的方式載入：

```sh
corepack enable
pnpm install
pnpm build
```

接著：

1. 開啟 `chrome://extensions`。
2. 啟用 Developer mode。
3. 選擇 Load unpacked。
4. 選擇產生出的 `apps/extension/dist/` 目錄。
5. 開啟 Toast options。
6. 設定 provider、API key、model、目標語言與快取行為。
7. 開啟一個網頁，從 Toast popup 點擊 Translate this page。

## Provider 設定

Toast 不會內建任何 API key。你需要提供自己的原始 provider API key，且不需要加上 `Bearer` 前綴。

內建 provider 會使用預設 endpoint：

```text
OpenAI: https://api.openai.com/v1/chat/completions
Anthropic Claude: https://api.anthropic.com/v1/messages
Google Gemini: https://generativelanguage.googleapis.com/v1beta/models
```

Endpoint 欄位只會在 OpenAI Compatible / Local LLM 設定中顯示，因為這些情境才需要使用者選擇或輸入本機 endpoint。

Fetch models 會從目前選擇的 provider 讀取可用模型：

- OpenAI: `GET /v1/models`
- Anthropic Claude: `GET /v1/models`
- Google Gemini: `GET /v1beta/models`

取得的模型會出現在模型選單中。如果目前設定的 provider 預設模型或已儲存模型沒有出現在 provider 回傳的列表中，Toast 會保留它作為可選項目。

## 隱私

Toast 只會把選取出的文字片段送到你設定的 provider。預設不會送出完整頁面 HTML、不需要登入、不使用雲端同步，也不包含預設 telemetry。

Provider request 由擴充功能的 service worker 發出，並使用你設定的 endpoint 與 API key。Provider 端如何處理資料，取決於你選擇的 endpoint 與模型 provider。

API key 會儲存在瀏覽器的 extension storage。請把你的瀏覽器 profile 視為受信任環境的一部分。

## X 最佳化

Toast 內建可選的 X-specific detector，適用於 timeline 卡片與長文頁面。啟用後，它會優先翻譯 tweet article 裡的 `tweetText` 內容，以及 X article view 裡的可閱讀區塊，而不是掃描所有可見文字節點。

Quoted posts 預設不會翻譯，可在 options 中啟用。X 已標示為翻譯過的貼文預設會被略過，以避免重複翻譯。

## 本機 LLM

Toast 透過 OpenAI Compatible provider 支援本機 LLM runtime。這個 provider 使用 OpenAI 風格的 `/v1/chat/completions` API，允許 API key 留空，並針對本機推理使用較低的預設翻譯 concurrency。

常見 endpoint preset：

```text
LM Studio: http://localhost:1234/v1/chat/completions
Ollama: http://localhost:11434/v1/chat/completions
llama.cpp server: http://localhost:8080/v1/chat/completions
```

使用本機 runtime：

1. 啟動本機模型 server。
2. 開啟 Toast options。
3. 選擇 OpenAI Compatible 作為 provider。
4. 選擇 endpoint preset，或輸入你的 runtime 顯示的 endpoint URL。
5. 除非你的本機 gateway 需要 API key，否則 API key 可以留空。
6. 點擊 Fetch models，並從模型選單中選擇 server 提供的模型。
7. 如果 runtime 支援，建議保持 Request JSON mode 啟用。若本機 runtime 拒絕 `response_format` request 欄位，請停用此選項。

Runtime 注意事項：

- LM Studio 通常在 `http://localhost:1234/v1/chat/completions` 提供 OpenAI-compatible request。
- Ollama 需要 OpenAI-compatible API 可在 `http://localhost:11434/v1/chat/completions` 使用。
- llama.cpp server 必須啟動 OpenAI-compatible HTTP server，常見位址為 `http://localhost:8080/v1/chat/completions`。
- 如果 Fetch models 失敗，請確認本機 server 已啟動、endpoint URL 以 `/v1/chat/completions` 結尾，且 runtime 有提供 compatible `/v1/models` endpoint。

本機模型的品質、速度、context length 與 JSON 穩定性，取決於模型與 runtime。建議使用具備強多語能力的 instruct model 進行翻譯。

## 本機開發

安裝 dependencies：

```sh
corepack enable
pnpm install
```

執行 type check：

```sh
pnpm check
```

執行 lint：

```sh
pnpm lint
```

執行 extension manifest 與安全性檢查：

```sh
pnpm check:extension
```

執行測試與 coverage：

```sh
pnpm test
```

建置擴充功能：

```sh
pnpm build
```

Build 使用 Rolldown，並會將 unpacked extension 輸出到 `apps/extension/dist/`。

## 專案結構

```text
apps/extension/src/background/     Service worker、provider request、settings 與 cache flow
apps/extension/src/content/        頁面文字偵測、佇列與譯文插入
apps/extension/src/options/        Extension options 頁面
apps/extension/src/popup/          Popup UI 與診斷資訊
apps/extension/src/providers/      Provider adapters
apps/extension/src/shared/         共用 types、defaults、storage 與 messages
apps/extension/public/             靜態 extension UI 與 content CSS
apps/extension/scripts/            Build 與 extension validation scripts
docs/                              Product、roadmap、principles 與 threat model
```

## 疑難排解

如果頁面看起來已啟用，但沒有插入任何譯文，請先在 Toast options 中啟用 Debug mode。Popup 會顯示目前頁面的偵測數量、已排入佇列的區塊、執行中的 request、pending translations、completed translations、錯誤數量、最新錯誤，以及偵測到的文字範例。

你可以用這些資訊判斷主要失敗原因：

- `Detected blocks: 0` 表示 content script 沒有在頁面上找到可閱讀文字。
- 偵測數量大於 0，但沒有 running requests，通常表示翻譯佇列需要進一步檢查。
- Error blocks 或 latest error 通常代表 provider 設定、authentication、model、endpoint 或 response format 有問題。

## 已知限制

- Firefox 目前還不是主要支援目標。
- Site-specific DOM handling 目前只針對少數高價值情境。
- 高度動態的 Web app 可能會移動或移除譯文區塊。
- 大型頁面會分批翻譯，因此譯文可能會逐步出現。
- Provider rate limit、模型可用性與輸出品質取決於你設定的 provider。

## 文件

- [Product Requirements](docs/PRD.md)
- [Project Principles](docs/PRINCIPLES.md)
- [Threat Model](docs/THREAT_MODEL.md)
- [Roadmap](docs/ROADMAP.md)

## License

MIT
