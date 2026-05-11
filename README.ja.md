# Margin Read

言語：[English](README.md) · [繁體中文](README.zh-TW.md) · [简体中文](README.zh-CN.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md)

Margin Read は、プライバシーを優先したバイリンガル Web ページ翻訳ブラウザ拡張機能です。

Margin は元のページ本文を置き換えず、対応する原文ブロックの下に翻訳を挿入します。読者はページの文脈を保ったまま、原文と翻訳を比較できます。

Repository: https://github.com/withmargin/margin-read

## 現在の状態

Margin は Chrome と Chromium 系ブラウザ向けの早期 MVP で、Manifest V3 を使用しています。

通常の記事ページ、古い文字中心のページ、一部の動的ページでは利用できますが、まだ開発中です。高度にインタラクティブな Web app、特殊なレイアウト、DOM を頻繁に書き換えるサイトでは粗さが残る可能性があります。

## 主な機能

- 拡張機能の popup から現在のページを翻訳。
- 原文を保持し、対応する原文ブロックの下に翻訳を挿入。
- 段落、見出し、リスト項目、引用などの読みやすいテキストブロックを検出。
- 古い `table`、`font`、`br` 区切りのページに対応。
- ナビゲーション、フォーム、ボタン、コードブロック、非表示テキスト、ページ UI などの非読書領域を回避。
- ユーザーが設定した provider endpoint と API key を使用。
- OpenAI、Anthropic Claude、Google Gemini の provider adapter に対応。
- LM Studio、Ollama、llama.cpp server などのローカル OpenAI-compatible runtime に対応。
- Options ページから provider のモデル一覧を取得。
- 翻訳表示を本文統合または強調表示から選択。
- 任意でページ上にフローティング翻訳ボタンを表示し、ユーザーがクリックした後だけ翻訳を開始。
- 永続、セッションのみ、無効の翻訳キャッシュを選択。
- Popup にテキスト検出、キュー状態、provider エラーの診断情報を表示。
- 動的に挿入されたコンテンツを検出して処理。
- X timeline card と longform article ページを最適化し、読みやすい本文だけを対象にして、プロフィール名、数値、メディア、操作ボタンを避けます。

Margin には PDF 翻訳、EPUB 翻訳、字幕翻訳、OCR、入力欄翻訳、クラウド同期、アカウント、ソーシャル機能、既定 telemetry、公式の有料翻訳枠は含まれていません。

## ソースからインストール

Margin はまだブラウザ拡張ストアで配布されていません。Unpacked extension として読み込んでください。

```sh
corepack enable
pnpm install
pnpm build
```

次に：

1. `chrome://extensions` を開きます。
2. Developer mode を有効にします。
3. Load unpacked を選択します。
4. 生成された `apps/extension/dist/` ディレクトリを選択します。
5. Margin options を開きます。
6. provider、API key、model、翻訳先言語、キャッシュ設定を構成します。
7. Web ページを開き、Margin popup から Translate this page をクリックします。

## Provider 設定

Margin には API key は同梱されていません。`Bearer` プレフィックスなしで、自分の provider API key を入力します。

組み込み provider は既定 endpoint を使用します。

```text
OpenAI: https://api.openai.com/v1/chat/completions
Anthropic Claude: https://api.anthropic.com/v1/messages
Google Gemini: https://generativelanguage.googleapis.com/v1beta/models
```

Endpoint フィールドは OpenAI Compatible / Local LLM の設定時だけ表示されます。この場合、ユーザーがローカル endpoint を選択または入力する必要があります。

Fetch models は選択中の provider から利用可能なモデルを取得します。

- OpenAI: `GET /v1/models`
- Anthropic Claude: `GET /v1/models`
- Google Gemini: `GET /v1beta/models`

取得したモデルは model selector に表示されます。Provider default や保存済みモデルが一覧に含まれない場合でも、Margin はその値を選択肢として保持します。

## プライバシー

Margin は選択されたテキスト片だけを設定済み provider に送信します。既定ではページ全体の HTML を送らず、ログインも不要で、クラウド同期や既定 telemetry も含みません。

Provider request は拡張機能の service worker から送信され、ユーザーが設定した endpoint と API key を使用します。Provider 側のデータ処理は、選択した endpoint とモデル provider に依存します。

API key はブラウザの extension storage に保存されます。ブラウザ profile は信頼できる環境の一部として扱ってください。

## X 最適化

Margin には X timeline card と longform article ページ向けの任意の X-specific detector があります。有効にすると、表示中のすべてのテキストノードではなく、tweet article 内の `tweetText` と X article view 内の読みやすいブロックを優先して翻訳します。

Quoted posts は既定では翻訳されませんが、options で有効にできます。X がすでに翻訳済みとして示す投稿は、重複翻訳を避けるため既定でスキップされます。

## ローカル LLM

Margin は OpenAI Compatible provider を通じてローカル LLM runtime に対応します。この provider は OpenAI 形式の `/v1/chat/completions` API を使い、API key を空にでき、ローカル推論向けに低めの既定 translation concurrency を使用します。

よく使う endpoint preset：

```text
LM Studio: http://localhost:1234/v1/chat/completions
Ollama: http://localhost:11434/v1/chat/completions
llama.cpp server: http://localhost:8080/v1/chat/completions
```

ローカル runtime を使うには：

1. ローカル model server を起動します。
2. Margin options を開きます。
3. Provider として OpenAI Compatible を選択します。
4. Endpoint preset を選ぶか、runtime が表示する endpoint URL を入力します。
5. ローカル gateway が必要としない限り、API key は空にできます。
6. Fetch models をクリックし、model selector から提供されたモデルを選びます。
7. Runtime が対応している場合は Request JSON mode を有効のままにします。`response_format` request field が拒否される場合は無効にしてください。

## ローカル開発

```sh
corepack enable
pnpm install
pnpm check
pnpm lint
pnpm check:extension
pnpm test
pnpm build
```

Build は Rolldown を使用し、unpacked extension を `apps/extension/dist/` に出力します。

## プロジェクト構成

```text
apps/extension/src/background/     Service worker、provider request、settings、cache flow
apps/extension/src/content/        ページのテキスト検出、キュー、翻訳挿入
apps/extension/src/options/        Extension options ページ
apps/extension/src/popup/          Popup UI と診断情報
apps/extension/src/providers/      Provider adapters
apps/extension/src/shared/         共通 types、defaults、storage、messages
apps/extension/public/             静的 extension UI と content CSS
apps/extension/scripts/            Build と extension validation scripts
docs/                              Product、roadmap、principles、threat model
```

## トラブルシューティング

ページが有効に見えるのに翻訳が挿入されない場合は、Margin options で Debug mode を有効にしてください。Popup に検出数、キュー、実行中 request、pending translations、completed translations、エラー数、最新エラー、検出サンプルが表示されます。

## 既知の制限

- Firefox はまだ主要なサポート対象ではありません。
- Site-specific DOM handling は少数の重要なケースに限られます。
- 高度に動的な Web app は翻訳ブロックを移動または削除する可能性があります。
- 大きなページはバッチ翻訳されるため、翻訳は段階的に表示されます。
- Provider rate limit、モデル可用性、出力品質は設定した provider に依存します。

## ドキュメント

- [Product Requirements](docs/PRD.md)
- [Project Principles](docs/PRINCIPLES.md)
- [Threat Model](docs/THREAT_MODEL.md)
- [Roadmap](docs/ROADMAP.md)

## License

MIT
