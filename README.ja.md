# Margin Read

[![CI](https://github.com/withmargin/margin-read/actions/workflows/ci.yml/badge.svg)](https://github.com/withmargin/margin-read/actions/workflows/ci.yml)
[![Release](https://github.com/withmargin/margin-read/actions/workflows/release.yml/badge.svg)](https://github.com/withmargin/margin-read/actions/workflows/release.yml)
[![CodeQL](https://github.com/withmargin/margin-read/actions/workflows/codeql.yml/badge.svg)](https://github.com/withmargin/margin-read/actions/workflows/codeql.yml)
[![GitHub Release](https://img.shields.io/github/v/release/withmargin/margin-read)](https://github.com/withmargin/margin-read/releases)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/clgdnabgpfiffmfdboefecbhggbepjde?label=chrome%20web%20store)](https://chromewebstore.google.com/detail/clgdnabgpfiffmfdboefecbhggbepjde)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

言語：[English](README.md) · [繁體中文](README.zh-TW.md) · [简体中文](README.zh-CN.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md)

Margin Read は、プライバシーを最優先する Web ページ対訳翻訳のためのブラウザ拡張機能です。

プライバシーを最優先する Web 対訳翻訳。原文をそのまま残すので、文脈を見失うことがありません。

Margin は Web ページの原文をそのままの位置に残し、対応する原文ブロックの下に翻訳文を挿入します。これにより、読者はページの文脈を失うことなく両方のバージョンを見比べられます。

リポジトリ: https://github.com/withmargin/margin-read

## ステータス

Margin は、Manifest V3 を採用した Chrome および Chromium 系ブラウザ向けの初期 MVP です。

この拡張機能は、通常の記事ページ、テキスト中心のレガシーページ、そして一部の動的ページで利用できますが、現在も活発に開発が進められています。インタラクティブ性の高い Web アプリ、特殊なレイアウト構造を持つページ、DOM を積極的に書き換えるサイトでは、まだ粗さが残る点にご留意ください。

## 機能

- 拡張機能の popup から現在の Web ページを翻訳できます。
- 原文をそのまま残し、対応する原文ブロックの下に翻訳を挿入します。
- 段落、見出し、リスト項目、引用などの読みやすいテキストブロックを検出します。
- レガシーな `table`、`font`、`br` で区切られたページに対応します。
- ナビゲーション、フォーム、ボタン、コードブロック、非表示テキスト、ページ周辺の UI など、読む対象ではない一般的な領域を回避します。
- ユーザーが設定した provider の endpoint と API key を使用します。
- OpenAI、Anthropic Claude、Google Gemini、および互換 provider アダプターをサポートします。
- LM Studio、Ollama、llama.cpp server、omlx（Apple Silicon）などのローカル OpenAI 互換ランタイム、さらに Anthropic Messages API 互換 endpoint をサポートします。
- options ページから provider のモデル一覧を取得します。
- 統合表示またはハイライト表示の翻訳スタイルを選べます。
- フローティングのページボタン（デフォルトで有効）を表示します。このボタンはユーザーがクリックした後にのみ翻訳を開始します。画面の端に沿って上下にドラッグでき、位置を記憶し、ページの明暗の背景に応じて外観を調整します。閉じる（×）コントロールまたは options ページからオフにできます。
- デフォルトでセッション限定の翻訳キャッシュを使用します。永続化キャッシュおよびキャッシュ無効のオプションも選べます。
- テキスト検出、キューの状態、provider エラーに関する popup の診断情報を表示します。
- 動的に挿入されたコンテンツを監視します。
- 読みやすいコンテンツを対象とし、プロフィール名・アクション数・メディア・操作要素を避けることで、X のタイムラインカードや長文記事ページを最適化します。

Margin には、PDF 翻訳、EPUB 翻訳、字幕翻訳、OCR、入力ボックス翻訳、クラウド同期、アカウント、ソーシャル機能、デフォルトの telemetry、公式の有料翻訳クォータシステムは含まれていません。

## ベータテスト

ベータテスターは、招待を受けた際に Chrome Web Store のベータ版リスティングから、GitHub Release の ZIP から、またはローカルのソースビルドから Margin をインストールできます。セットアップとフィードバックの詳しいワークフローについては、[ベータテストガイド](docs/BETA_TESTING.md)をご覧ください。

## ソースからのインストール

ローカル開発では、Margin を展開済み拡張機能として読み込みます。

```sh
corepack enable
pnpm install
pnpm build
```

その後:

1. `chrome://extensions` を開きます。
2. デベロッパーモードを有効にします。
3. 「パッケージ化されていない拡張機能を読み込む」を選びます。
4. 生成された `apps/extension/dist/` ディレクトリを選びます。
5. Margin の options を開きます。
6. provider、API key、モデル、ターゲット言語、キャッシュの動作を設定します。
7. Web ページを開き、Margin の popup から「このページを翻訳」をクリックします。

## Provider のセットアップ

Margin に API key は同梱されていません。ユーザーは自身の生の provider API key を、`Bearer` プレフィックスなしで指定します。

組み込みの provider はデフォルトの endpoint を使用します。

```text
OpenAI: https://api.openai.com/v1/chat/completions
Anthropic Claude: https://api.anthropic.com/v1/messages
Google Gemini: https://generativelanguage.googleapis.com/v1beta/models
```

endpoint フィールドは、互換 / ローカル LLM 構成の場合にのみ表示され、ユーザーはローカルの endpoint を選択または入力することになります。

「Fetch models」アクションは、選択した provider から利用可能なモデルを読み込みます。

- OpenAI: `GET /v1/models`
- Anthropic Claude: `GET /v1/models`
- Google Gemini: `GET /v1beta/models`
- OpenAI Compatible / Anthropic Compatible: `GET /v1/models`

取得したモデルはモデルセレクターに表示されます。provider のデフォルト、または以前に保存したモデルが provider の一覧に返されない場合でも、Margin は現在設定されているモデルを選択肢として保持します。

## プライバシー

Margin は、選択されたテキストセグメントのみを設定済みの provider に送信します。デフォルトではページの完全な HTML を送信せず、ログインを必要とせず、クラウド同期を使用せず、デフォルトで telemetry を含みません。

provider へのリクエストは、ユーザーが設定した endpoint と API key を使って拡張機能の service worker から行われます。provider のプライバシーは、選択した endpoint とモデル provider に依存します。

API key はブラウザ拡張機能のストレージに保存されます。ブラウザのプロファイルは、信頼できる環境の一部として扱ってください。

## X の最適化

Margin には、タイムラインカードと長文記事ページ向けの、X 専用のオプションの検出機能が含まれています。有効にすると、表示されているすべてのテキストノードをスキャンするのではなく、ツイートの article 内の `tweetText` コンテンツと、X の記事ビュー内の読みやすいブロックを対象とします。

引用ポストはデフォルトで無効になっており、options から有効にできます。X がすでに翻訳済みとしてマークしているポストは、重複翻訳を避けるためデフォルトでスキップされます。

## ローカル LLM

Margin は、互換 provider を通じてローカル LLM ランタイムをサポートします。

- OpenAI Compatible は、OpenAI スタイルの `/v1/chat/completions` API を使用します。
- Anthropic Compatible は、ツールの `input_schema` による構造化出力を備えた、Anthropic Messages スタイルの `/v1/messages` API を使用します。これは互換のローカルまたはゲートウェイ endpoint 向けのワイヤープロトコルのオプションであり、Anthropic がホストする別個のサービスではありません。

どちらの互換 provider でも空の API key を許可し、ローカル推論向けに低めのデフォルト翻訳同時実行数を使用します。Anthropic 互換ゲートウェイが key を必要とする場合、Margin はそれを `Authorization: Bearer ...` として送信します。

一般的な互換 endpoint:

```text
LM Studio: http://localhost:1234/v1/chat/completions
Ollama: http://localhost:11434/v1/chat/completions
llama.cpp server: http://localhost:8080/v1/chat/completions
omlx: http://localhost:8000/v1/chat/completions
Generic Anthropic-compatible: http://localhost:8000/v1/messages
Ollama Anthropic compatibility: http://localhost:11434/v1/messages
```

ローカルランタイムを使うには:

1. ローカルのモデルサーバーを起動します。
2. Margin の options を開きます。
3. `/v1/chat/completions` には OpenAI Compatible を、`/v1/messages` には Anthropic Compatible を選びます。
4. OpenAI 互換の endpoint プリセットを選ぶか、ランタイムが表示する endpoint URL を入力します。
5. ローカルゲートウェイが必要としない限り、API key は空のままにします。
6. 「Fetch models」をクリックし、提供されているモデルをモデルセレクターから選びます。
7. OpenAI Compatible の場合は、サポートされているときは「Request JSON mode」を有効のままにします。ローカルランタイムが `response_format` リクエストフィールドを拒否する場合は無効にします。

ランタイムに関する注意:

- LM Studio は通常、`http://localhost:1234/v1/chat/completions` で OpenAI 互換のリクエストを提供します。
- Ollama は、OpenAI 互換 API を `http://localhost:11434/v1/chat/completions` で利用可能にしておく必要があります。
- Ollama は、Anthropic 互換のリクエストを `http://localhost:11434/v1/messages` で公開することもできます。Margin は構造化出力のためにツールを送信しますが、Anthropic 互換 endpoint に対しては `tool_choice` を強制しません。これは、一部の互換ランタイムがツールは受け入れるものの、強制的なツール選択をサポートしないためです。
- llama.cpp server は、OpenAI 互換の HTTP サーバーを有効にして起動する必要があり、通常は `http://localhost:8080/v1/chat/completions` で提供されます。
- omlx は Apple Silicon 向けの MLX 推論サーバーです。`omlx serve`（設定不要、モデルは `~/.omlx/models` から読み込み）または `omlx serve --model-dir /path/to/models` で起動すると、OpenAI 互換 API が `http://localhost:8000/v1/chat/completions` で利用可能になります。
- 「Fetch models」が失敗する場合は、ローカルサーバーが実行中であること、endpoint URL が `/v1/chat/completions` または `/v1/messages` で終わっていること、ランタイムが互換の `/v1/models` endpoint を公開していることを確認してください。

ローカルモデルの品質、速度、コンテキスト長、JSON の信頼性は、モデルとランタイムに依存します。翻訳には、多言語能力の高い instruct モデルをおすすめします。

## ローカル開発

依存関係をインストールします。

```sh
corepack enable
pnpm install
```

ホットリロード対応の開発サーバー（Vite + CRXJS）を実行します。`apps/extension/dist/` を展開済み拡張機能として一度読み込めば、ソースを編集すると拡張機能が自動的にリロードされます。

```sh
pnpm --filter @margin/extension dev
```

型チェックを実行します。

```sh
pnpm check
```

lint を実行します。

```sh
pnpm lint
```

拡張機能の manifest とセキュリティのチェックを実行します。

```sh
pnpm check:extension
```

カバレッジ付きでテストを実行します。

```sh
pnpm test
```

拡張機能をビルドします。

```sh
pnpm build
```

ビルドは CRXJS プラグイン付きの Vite（内部では Rolldown）を使用し、展開済み拡張機能を `apps/extension/dist/` に書き出します。

## プロジェクト構成

```text
apps/extension/src/background/     Service worker、provider リクエスト、設定、キャッシュフロー
apps/extension/src/content/        ページのテキスト検出、キューイング、翻訳の挿入
apps/extension/src/options/        拡張機能の options ページ
apps/extension/src/popup/          Popup の UI と診断
apps/extension/src/background/providers/      Provider アダプター
apps/extension/src/shared/         共有型、デフォルト値、ストレージ、メッセージ
apps/extension/public/             ビルドにそのままコピーされる静的アセット（アイコン）
apps/extension/*.html              Popup と options の HTML エントリーポイント
apps/extension/scripts/            ビルドと拡張機能の検証スクリプト
docs/                              プロダクト、ロードマップ、原則、脅威モデル
```

## トラブルシューティング

ページが有効になっているように見えるのに翻訳が挿入されない場合は、Margin の options で Debug モードを有効にしてください。popup には、現在のページの検出数、キュー内のブロック、実行中のリクエスト、保留中の翻訳、完了した翻訳、エラー数、最新のエラー、検出されたテキストブロックのサンプルが表示されます。

これらの値を使って、主な失敗のパターンを切り分けられます。

- `Detected blocks: 0` は、content script がページ上に読みやすいテキストを見つけられなかったことを意味します。
- 検出数が正の値なのに実行中のリクエストがない場合は、通常、翻訳キューに対処が必要なことを意味します。
- エラーブロックや最新のエラーは、通常、provider の設定、認証、モデル、endpoint、またはレスポンス形式の問題を示しています。

## 既知の制限

- Firefox はまだ主要な対象ではありません。
- サイト固有の DOM 処理は、価値の高い一部のケースに限られています。
- 動的性の高い Web アプリでは、翻訳ブロックが移動または削除されることがあります。
- 大きなページはバッチで翻訳されるため、翻訳が段階的に表示されることがあります。
- provider のレート制限、モデルの可用性、出力品質は、設定した provider に依存します。

## ドキュメント

- [プロダクト要件](docs/PRD.md)
- [プロジェクトの原則](docs/PRINCIPLES.md)
- [脅威モデル](docs/THREAT_MODEL.md)
- [ロードマップ](docs/ROADMAP.md)
- [ベータテストガイド](docs/BETA_TESTING.md)
- [リリースチェックリスト](docs/RELEASE_CHECKLIST.md)

## ライセンス

MIT
