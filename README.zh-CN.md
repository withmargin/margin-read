# Toast Translate

语言：[English](README.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md)

Toast Translate 是一个以隐私为优先的双语网页翻译浏览器扩展。

Toast 不会替换网页原文，而是把译文插入在对应的原文区块下方，让读者可以保留页面上下文，并同时对照原文与译文。

Repository: https://github.com/linyiru/toast

## 当前状态

Toast 目前仍是早期 MVP，支持 Chrome 与其他 Chromium 浏览器，并使用 Manifest V3。

它已经可以用于一般文章页、旧式文字密集页面，以及部分动态页面。不过项目仍在积极开发中，遇到高度互动的 Web app、特殊排版系统，或会频繁重写 DOM 的网站时，仍可能有不稳定或体验不够细致的地方。

## 功能特色

- 从扩展 popup 翻译当前网页。
- 保留原文，并在对应的原文区块下方插入译文。
- 检测可阅读的文字区块，例如段落、标题、列表项与引用区块。
- 支持旧式 `table`、`font`，以及以 `br` 分隔文字的页面。
- 避开常见非阅读区域，例如导航、表单、按钮、代码区块、隐藏文字与页面界面。
- 使用用户自行设置的 provider endpoint 与 API key。
- 支持 OpenAI、Anthropic Claude 与 Google Gemini provider adapter。
- 支持本地 OpenAI-compatible runtime，例如 LM Studio、Ollama 与 llama.cpp server。
- 可从 options 页面获取 provider 模型列表。
- 可选择融入原文或醒目提示的译文显示样式。
- 可选择在页面显示浮动翻译按钮，且只有用户点击后才开始翻译。
- 可选择持久缓存、仅 session 缓存，或停用翻译缓存。
- 在 popup 显示文字检测、队列状态与 provider 错误等诊断信息。
- 可检测并处理动态插入的内容。
- 针对 X timeline 卡片与长文页面优化，只翻译可阅读内容，并避开个人名称、互动数字、媒体与操作按钮。

Toast 不包含 PDF 翻译、EPUB 翻译、字幕翻译、OCR、输入框翻译、云端同步、账号系统、社交功能、默认 telemetry，或官方付费翻译额度系统。

## 从源代码安装

Toast 目前尚未上架浏览器扩展商店。请以 unpacked extension 的方式载入：

```sh
corepack enable
pnpm install
pnpm build
```

接着：

1. 打开 `chrome://extensions`。
2. 启用 Developer mode。
3. 选择 Load unpacked。
4. 选择生成的 `dist/` 目录。
5. 打开 Toast options。
6. 设置 provider、API key、model、目标语言与缓存行为。
7. 打开一个网页，并从 Toast popup 点击 Translate this page。

## Provider 设置

Toast 不会内置任何 API key。你需要提供自己的原始 provider API key，且不需要加上 `Bearer` 前缀。

内置 provider 会使用默认 endpoint：

```text
OpenAI: https://api.openai.com/v1/chat/completions
Anthropic Claude: https://api.anthropic.com/v1/messages
Google Gemini: https://generativelanguage.googleapis.com/v1beta/models
```

Endpoint 字段只会在 OpenAI Compatible / Local LLM 设置中显示，因为这些情境才需要用户选择或输入本地 endpoint。

Fetch models 会从当前选择的 provider 读取可用模型：

- OpenAI: `GET /v1/models`
- Anthropic Claude: `GET /v1/models`
- Google Gemini: `GET /v1beta/models`

取得的模型会出现在模型菜单中。如果当前设置的 provider 默认模型或已保存模型没有出现在 provider 返回的列表中，Toast 会保留它作为可选项。

## 隐私

Toast 只会把选取出的文字片段送到你设置的 provider。默认不会送出完整页面 HTML、不需要登录、不使用云端同步，也不包含默认 telemetry。

Provider request 由扩展的 service worker 发出，并使用你设置的 endpoint 与 API key。Provider 端如何处理数据，取决于你选择的 endpoint 与模型 provider。

API key 会储存在浏览器的 extension storage。请把你的浏览器 profile 视为受信任环境的一部分。

## X 优化

Toast 内置可选的 X-specific detector，适用于 timeline 卡片与长文页面。启用后，它会优先翻译 tweet article 里的 `tweetText` 内容，以及 X article view 里的可阅读区块，而不是扫描所有可见文字节点。

Quoted posts 默认不会翻译，可在 options 中启用。X 已标示为翻译过的帖文默认会被跳过，以避免重复翻译。

## 本地 LLM

Toast 通过 OpenAI Compatible provider 支持本地 LLM runtime。这个 provider 使用 OpenAI 风格的 `/v1/chat/completions` API，允许 API key 留空，并针对本地推理使用较低的默认翻译 concurrency。

常见 endpoint preset：

```text
LM Studio: http://localhost:1234/v1/chat/completions
Ollama: http://localhost:11434/v1/chat/completions
llama.cpp server: http://localhost:8080/v1/chat/completions
```

使用本地 runtime：

1. 启动本地模型 server。
2. 打开 Toast options。
3. 选择 OpenAI Compatible 作为 provider。
4. 选择 endpoint preset，或输入你的 runtime 显示的 endpoint URL。
5. 除非你的本地 gateway 需要 API key，否则 API key 可以留空。
6. 点击 Fetch models，并从模型菜单中选择 server 提供的模型。
7. 如果 runtime 支持，建议保持 Request JSON mode 启用。若本地 runtime 拒绝 `response_format` request 字段，请停用此选项。

## 本地开发

```sh
corepack enable
pnpm install
pnpm check
pnpm lint
pnpm check:extension
pnpm test
pnpm build
```

Build 使用 Rolldown，并会将 unpacked extension 输出到 `dist/`。

## 项目结构

```text
src/background/     Service worker、provider request、settings 与 cache flow
src/content/        页面文字检测、队列与译文插入
src/options/        Extension options 页面
src/popup/          Popup UI 与诊断信息
src/providers/      Provider adapters
src/shared/         共用 types、defaults、storage 与 messages
public/             静态 extension UI 与 content CSS
scripts/            Build 与 extension validation scripts
docs/               Product、roadmap、principles 与 threat model
```

## 疑难排解

如果页面看起来已启用，但没有插入任何译文，请先在 Toast options 中启用 Debug mode。Popup 会显示当前页面的检测数量、已排入队列的区块、执行中的 request、pending translations、completed translations、错误数量、最新错误，以及检测到的文字示例。

## 已知限制

- Firefox 目前还不是主要支持目标。
- Site-specific DOM handling 目前只针对少数高价值情境。
- 高度动态的 Web app 可能会移动或移除译文区块。
- 大型页面会分批翻译，因此译文可能会逐步出现。
- Provider rate limit、模型可用性与输出质量取决于你设置的 provider。

## 文档

- [Product Requirements](docs/PRD.md)
- [Project Principles](docs/PRINCIPLES.md)
- [Threat Model](docs/THREAT_MODEL.md)
- [Roadmap](docs/ROADMAP.md)

## License

MIT
