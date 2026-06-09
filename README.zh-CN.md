# Margin Read

[![CI](https://github.com/withmargin/margin-read/actions/workflows/ci.yml/badge.svg)](https://github.com/withmargin/margin-read/actions/workflows/ci.yml)
[![Release](https://github.com/withmargin/margin-read/actions/workflows/release.yml/badge.svg)](https://github.com/withmargin/margin-read/actions/workflows/release.yml)
[![CodeQL](https://github.com/withmargin/margin-read/actions/workflows/codeql.yml/badge.svg)](https://github.com/withmargin/margin-read/actions/workflows/codeql.yml)
[![GitHub Release](https://img.shields.io/github/v/release/withmargin/margin-read)](https://github.com/withmargin/margin-read/releases)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/clgdnabgpfiffmfdboefecbhggbepjde?label=chrome%20web%20store)](https://chromewebstore.google.com/detail/clgdnabgpfiffmfdboefecbhggbepjde)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

语言：[English](README.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md)

Margin Read 是一款隐私优先的浏览器扩展，用于网页双语翻译。

隐私优先的网页双语翻译：保留原文不动，让你阅读时不会丢失上下文。

Margin 会保留网页原文不动，并在对应的源文本块下方插入译文，让读者在不脱离页面语境的情况下对照两个版本。

仓库地址：https://github.com/withmargin/margin-read

## 项目状态

Margin 是一个面向 Chrome 及 Chromium 浏览器、基于 Manifest V3 的早期 MVP。

该扩展已可用于普通文章页面、以文字为主的传统页面，以及部分动态页面，但仍在积极开发中。在高度交互的 Web 应用、采用特殊布局系统的页面，以及会频繁重写自身 DOM 的网站上，预计会出现一些瑕疵。

## 功能特性

- 在扩展 popup 中翻译当前网页。
- 保留原文，并在对应的源文本块下方插入译文。
- 检测段落、标题、列表项、引用块等可阅读的文本块。
- 处理由 `table`、`font`、`br` 分隔的传统页面。
- 避开导航、表单、按钮、代码块、隐藏文本和页面框架等常见的非阅读区域。
- 使用用户自行配置的 provider endpoint 和 API key。
- 支持 OpenAI、Anthropic Claude、Google Gemini，以及兼容的 provider 适配器。
- 支持本地 OpenAI 兼容运行时，例如 LM Studio、Ollama、llama.cpp server、omlx（Apple Silicon），以及兼容 Anthropic Messages API 的 endpoint。
- 在 options 页面拉取 provider 的模型列表。
- 选择融入式或高亮式的译文展示样式。
- 显示一个悬浮页面按钮（默认开启），仅在用户点击后才开始翻译。该按钮可沿屏幕边缘上下拖动、会记住自己的位置、会根据页面的浅色或深色背景自适应外壳样式，并可通过其关闭（×）控件或 options 页面关闭。
- 默认仅在会话期间缓存译文，另提供持久缓存与禁用缓存选项。
- 在 popup 中显示文本检测、队列状态和 provider 错误的诊断信息。
- 观测动态插入的内容。
- 针对 X 时间线卡片和长文文章页面进行优化，聚焦可阅读内容，避开个人资料名称、互动计数、媒体和控件。

Margin 不包含 PDF 翻译、EPUB 翻译、字幕翻译、OCR、输入框翻译、云同步、账户、社交功能、默认 telemetry，也没有官方付费翻译额度系统。

## Beta 测试

Beta 测试者在受邀后可从 Chrome Web Store 的 beta 列表安装 Margin，也可以从
GitHub Release 的 ZIP 包，或从本地源码构建安装。完整的安装与反馈流程请参阅
[Beta 测试指南](docs/BETA_TESTING.md)。

## 从源码安装

如需本地开发，将 Margin 作为未打包扩展加载：

```sh
corepack enable
pnpm install
pnpm build
```

然后：

1. 打开 `chrome://extensions`。
2. 启用开发者模式。
3. 选择「加载已解压的扩展程序」。
4. 选择生成的 `apps/extension/dist/` 目录。
5. 打开 Margin 的 options。
6. 配置 provider、API key、模型、目标语言和缓存行为。
7. 打开一个网页，并在 Margin 的 popup 中点击「翻译此页面」。

## Provider 配置

Margin 不附带任何 API key。用户需自行提供原始的 provider API key，且不带 `Bearer` 前缀。

内置 provider 使用默认 endpoint：

```text
OpenAI: https://api.openai.com/v1/chat/completions
Anthropic Claude: https://api.anthropic.com/v1/messages
Google Gemini: https://generativelanguage.googleapis.com/v1beta/models
```

endpoint 字段仅在兼容 / 本地 LLM 配置下显示，此时用户需自行选择或输入本地 endpoint。

「拉取模型」操作会从所选 provider 读取可用模型：

- OpenAI：`GET /v1/models`
- Anthropic Claude：`GET /v1/models`
- Google Gemini：`GET /v1beta/models`
- OpenAI Compatible / Anthropic Compatible：`GET /v1/models`

拉取到的模型会出现在模型选择器中。当 provider 的列表未返回某个 provider 默认模型或此前保存的模型时，Margin 会将当前已配置的模型保留为一个选项。

## 隐私

Margin 只会将所选的文本片段发送给已配置的 provider。它默认不发送完整的页面 HTML、不要求登录、不使用云同步，默认也不包含 telemetry。

provider 请求由扩展的 service worker 使用用户配置的 endpoint 和 API key 发起。provider 的隐私状况取决于你所选择的 endpoint 和模型提供方。

API key 存储在浏览器扩展存储中。请将浏览器配置文件视为你受信任环境的一部分。

## X 优化

Margin 内置一个可选的 X 专用检测器，用于时间线卡片和长文文章页面。启用后，它会聚焦推文文章中的 `tweetText` 内容，以及 X 文章视图中的可阅读文本块，而不是扫描每一个可见的文本节点。

引用帖默认关闭，可在 options 中启用。X 已标记为已翻译的帖子默认会被跳过，以避免重复翻译。

## 本地 LLM

Margin 通过兼容 provider 支持本地 LLM 运行时：

- OpenAI Compatible 使用 OpenAI 风格的 `/v1/chat/completions` API。
- Anthropic Compatible 使用 Anthropic Messages 风格的 `/v1/messages` API，并借助工具的 `input_schema` 实现结构化输出。它是面向兼容的本地或网关 endpoint 的一种通信协议选项，而非独立的 Anthropic 托管服务。

两个兼容 provider 都允许使用空的 API key，并对本地推理采用较低的默认翻译并发数。如果某个 Anthropic 兼容网关需要 key，Margin 会以 `Authorization: Bearer ...` 的形式发送。

常见的兼容 endpoint：

```text
LM Studio: http://localhost:1234/v1/chat/completions
Ollama: http://localhost:11434/v1/chat/completions
llama.cpp server: http://localhost:8080/v1/chat/completions
omlx: http://localhost:8000/v1/chat/completions
Generic Anthropic-compatible: http://localhost:8000/v1/messages
Ollama Anthropic compatibility: http://localhost:11434/v1/messages
```

使用本地运行时：

1. 启动本地模型服务器。
2. 打开 Margin 的 options。
3. 为 `/v1/chat/completions` 选择 OpenAI Compatible，或为 `/v1/messages` 选择 Anthropic Compatible。
4. 选择一个 OpenAI 兼容的 endpoint 预设，或输入你的运行时所显示的 endpoint URL。
5. 除非你的本地网关需要，否则将 API key 留空。
6. 点击「拉取模型」，并从模型选择器中选择一个已加载的模型。
7. 对于 OpenAI Compatible，在受支持时请保持「请求 JSON 模式」开启。如果本地运行时拒绝 `response_format` 请求字段，则将其关闭。

运行时说明：

- LM Studio 通常在 `http://localhost:1234/v1/chat/completions` 提供 OpenAI 兼容请求服务。
- Ollama 需要在 `http://localhost:11434/v1/chat/completions` 提供其 OpenAI 兼容 API。
- Ollama 也可以在 `http://localhost:11434/v1/messages` 暴露 Anthropic 兼容请求。Margin 会发送工具以实现结构化输出，但不会为 Anthropic 兼容 endpoint 强制 `tool_choice`，因为有些兼容运行时接受工具，却不支持强制工具选择。
- llama.cpp server 必须在启用 OpenAI 兼容 HTTP 服务器的情况下启动，通常位于 `http://localhost:8080/v1/chat/completions`。
- omlx 是一个 Apple Silicon MLX 推理服务器。使用 `omlx serve`（零配置，模型来自 `~/.omlx/models`）或 `omlx serve --model-dir /path/to/models` 启动；OpenAI 兼容 API 随后会在 `http://localhost:8000/v1/chat/completions` 可用。
- 如果「拉取模型」失败，请确认本地服务器正在运行、endpoint URL 以 `/v1/chat/completions` 或 `/v1/messages` 结尾，且运行时暴露了兼容的 `/v1/models` endpoint。

本地模型的质量、速度、上下文长度和 JSON 可靠性取决于具体的模型和运行时。建议使用多语言能力强的指令模型进行翻译。

## 本地开发

安装依赖：

```sh
corepack enable
pnpm install
```

运行带热重载的开发服务器（Vite + CRXJS）。先将 `apps/extension/dist/`
作为未打包扩展加载一次，之后编辑源码，扩展便会自动重新加载：

```sh
pnpm --filter @margin/extension dev
```

运行类型检查：

```sh
pnpm check
```

运行 lint：

```sh
pnpm lint
```

运行扩展 manifest 和安全检查：

```sh
pnpm check:extension
```

运行带覆盖率的测试：

```sh
pnpm test
```

构建扩展：

```sh
pnpm build
```

构建使用搭配 CRXJS 插件的 Vite（底层为 Rolldown），并将未打包的扩展写入 `apps/extension/dist/`。

## 项目结构

```text
apps/extension/src/background/     Service worker、provider 请求、设置与缓存流程
apps/extension/src/content/        页面文本检测、排队与译文插入
apps/extension/src/options/        扩展 options 页面
apps/extension/src/popup/          Popup UI 与诊断
apps/extension/src/background/providers/      Provider 适配器
apps/extension/src/shared/         共享类型、默认值、存储与消息
apps/extension/public/             静态资源（图标），原样复制进构建
apps/extension/*.html              Popup 与 options 的 HTML 入口
apps/extension/scripts/            构建与扩展校验脚本
docs/                              产品、路线图、原则与威胁模型
```

## 故障排查

当某个页面看起来已启用、却没有插入任何译文时，请在 Margin 的 options 中启用 Debug 模式。popup 会显示当前页面的检测数量、已排队的文本块、运行中的请求、待处理的译文、已完成的译文、错误数、最新错误，以及一个检测到的示例文本块。

利用这些数值来区分主要的故障类型：

- `Detected blocks: 0` 表示 content script 未在页面上找到可阅读文本。
- 检测数为正但没有运行中的请求，通常意味着翻译队列需要关注。
- 错误块或最新错误通常指向 provider 配置、认证、模型、endpoint 或响应格式方面的问题。

## 已知限制

- Firefox 目前还不是主要目标。
- 针对特定站点的 DOM 处理仅限于少数高价值场景。
- 高度动态的 Web 应用可能会移动或移除译文块。
- 大页面会分批翻译，因此译文可能会逐步出现。
- provider 的速率限制、模型可用性和输出质量取决于所配置的 provider。

## 文档

- [产品需求](docs/PRD.md)
- [项目原则](docs/PRINCIPLES.md)
- [威胁模型](docs/THREAT_MODEL.md)
- [路线图](docs/ROADMAP.md)
- [Beta 测试指南](docs/BETA_TESTING.md)
- [发布清单](docs/RELEASE_CHECKLIST.md)

## 许可证

MIT
