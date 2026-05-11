# Margin Read

언어: [English](README.md) · [繁體中文](README.zh-TW.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md)

Margin Read 는 개인정보 보호를 우선하는 이중 언어 웹페이지 번역 브라우저 확장 프로그램입니다.

Margin 는 원문을 대체하지 않고, 대응하는 원문 블록 아래에 번역문을 삽입합니다. 사용자는 페이지의 문맥을 유지하면서 원문과 번역문을 함께 비교할 수 있습니다.

Repository: https://github.com/withmargin/margin-read

## 현재 상태

Margin 는 Chrome 및 Chromium 브라우저용 초기 MVP 이며 Manifest V3 를 사용합니다.

일반 기사 페이지, 오래된 텍스트 중심 페이지, 일부 동적 페이지에서 사용할 수 있지만 아직 개발 중입니다. 상호작용이 많은 Web app, 특수 레이아웃, DOM 을 공격적으로 다시 쓰는 사이트에서는 거친 부분이 있을 수 있습니다.

## 주요 기능

- 확장 프로그램 popup 에서 현재 웹페이지 번역.
- 원문을 보존하고 대응하는 원문 블록 아래에 번역문 삽입.
- 문단, 제목, 목록 항목, 인용문 같은 읽을 수 있는 텍스트 블록 감지.
- 오래된 `table`, `font`, `br` 구분 페이지 처리.
- 내비게이션, 폼, 버튼, 코드 블록, 숨겨진 텍스트, 페이지 UI 같은 비독서 영역 회피.
- 사용자가 설정한 provider endpoint 와 API key 사용.
- OpenAI, Anthropic Claude, Google Gemini provider adapter 지원.
- LM Studio, Ollama, llama.cpp server 같은 로컬 OpenAI-compatible runtime 지원.
- Options 페이지에서 provider 모델 목록 가져오기.
- 본문 통합 또는 강조 표시 번역 스타일 선택.
- 선택적으로 페이지에 플로팅 번역 버튼을 표시하고 사용자가 클릭한 뒤에만 번역 시작.
- 영구, 세션, 비활성 번역 캐시 동작 선택.
- Popup 에 텍스트 감지, 큐 상태, provider 오류 진단 표시.
- 동적으로 삽입된 콘텐츠 감지 및 처리.
- X timeline card 와 longform article 페이지를 최적화하여 읽을 수 있는 콘텐츠만 번역하고 프로필 이름, 수치, 미디어, 컨트롤을 피합니다.

Margin 는 PDF 번역, EPUB 번역, 자막 번역, OCR, 입력창 번역, 클라우드 동기화, 계정, 소셜 기능, 기본 telemetry, 공식 유료 번역 quota 시스템을 포함하지 않습니다.

## 소스에서 설치

Margin 는 아직 브라우저 확장 스토어에 배포되어 있지 않습니다. Unpacked extension 으로 로드하세요.

```sh
corepack enable
pnpm install
pnpm build
```

그다음:

1. `chrome://extensions` 를 엽니다.
2. Developer mode 를 켭니다.
3. Load unpacked 를 선택합니다.
4. 생성된 `apps/extension/dist/` 디렉터리를 선택합니다.
5. Margin options 를 엽니다.
6. provider, API key, model, 대상 언어, 캐시 동작을 설정합니다.
7. 웹페이지를 열고 Margin popup 에서 Translate this page 를 클릭합니다.

## Provider 설정

Margin 는 API key 를 내장하지 않습니다. `Bearer` 접두사 없이 사용자의 원본 provider API key 를 입력합니다.

내장 provider 는 기본 endpoint 를 사용합니다.

```text
OpenAI: https://api.openai.com/v1/chat/completions
Anthropic Claude: https://api.anthropic.com/v1/messages
Google Gemini: https://generativelanguage.googleapis.com/v1beta/models
```

Endpoint 필드는 OpenAI Compatible / Local LLM 설정에서만 표시됩니다. 이 경우 사용자가 로컬 endpoint 를 선택하거나 입력해야 합니다.

Fetch models 는 선택한 provider 에서 사용 가능한 모델을 읽습니다.

- OpenAI: `GET /v1/models`
- Anthropic Claude: `GET /v1/models`
- Google Gemini: `GET /v1beta/models`

가져온 모델은 model selector 에 표시됩니다. 현재 설정된 provider default 또는 저장된 모델이 provider 목록에 없더라도 Margin 는 이를 선택 항목으로 유지합니다.

## 개인정보 보호

Margin 는 선택된 텍스트 조각만 설정한 provider 로 보냅니다. 기본적으로 전체 페이지 HTML 을 보내지 않고, 로그인을 요구하지 않으며, 클라우드 동기화나 기본 telemetry 를 포함하지 않습니다.

Provider request 는 확장 프로그램 service worker 가 사용자가 설정한 endpoint 와 API key 로 보냅니다. Provider 가 데이터를 처리하는 방식은 선택한 endpoint 와 모델 provider 에 따라 달라집니다.

API key 는 브라우저 extension storage 에 저장됩니다. 브라우저 profile 을 신뢰 환경의 일부로 취급하세요.

## X 최적화

Margin 는 X timeline card 와 longform article 페이지용 선택적 X-specific detector 를 포함합니다. 활성화하면 모든 보이는 텍스트 노드를 스캔하는 대신 tweet article 안의 `tweetText` 와 X article view 안의 읽을 수 있는 블록을 우선 번역합니다.

Quoted posts 는 기본적으로 번역하지 않으며 options 에서 켤 수 있습니다. X 가 이미 번역됨으로 표시한 게시글은 중복 번역을 피하기 위해 기본적으로 건너뜁니다.

## 로컬 LLM

Margin 는 OpenAI Compatible provider 를 통해 로컬 LLM runtime 을 지원합니다. 이 provider 는 OpenAI 스타일 `/v1/chat/completions` API 를 사용하고, API key 를 비울 수 있으며, 로컬 추론을 위해 낮은 기본 translation concurrency 를 사용합니다.

일반 endpoint preset:

```text
LM Studio: http://localhost:1234/v1/chat/completions
Ollama: http://localhost:11434/v1/chat/completions
llama.cpp server: http://localhost:8080/v1/chat/completions
```

로컬 runtime 사용 방법:

1. 로컬 model server 를 시작합니다.
2. Margin options 를 엽니다.
3. provider 로 OpenAI Compatible 을 선택합니다.
4. endpoint preset 을 선택하거나 runtime 이 표시하는 endpoint URL 을 입력합니다.
5. 로컬 gateway 가 요구하지 않는 한 API key 는 비워 둡니다.
6. Fetch models 를 클릭하고 model selector 에서 제공된 모델을 선택합니다.
7. runtime 이 지원하면 Request JSON mode 를 켜 둡니다. `response_format` request field 를 거부하면 끄세요.

## 로컬 개발

```sh
corepack enable
pnpm install
pnpm check
pnpm lint
pnpm check:extension
pnpm test
pnpm build
```

Build 는 Rolldown 을 사용하며 unpacked extension 을 `apps/extension/dist/` 에 출력합니다.

## 프로젝트 구조

```text
apps/extension/src/background/     Service worker, provider request, settings, cache flow
apps/extension/src/content/        페이지 텍스트 감지, 큐, 번역 삽입
apps/extension/src/options/        Extension options 페이지
apps/extension/src/popup/          Popup UI 와 진단
apps/extension/src/providers/      Provider adapters
apps/extension/src/shared/         공통 types, defaults, storage, messages
apps/extension/public/             정적 extension UI 와 content CSS
apps/extension/scripts/            Build 와 extension validation scripts
docs/                              Product, roadmap, principles, threat model
```

## 문제 해결

페이지가 활성화된 것처럼 보이지만 번역이 삽입되지 않으면 Margin options 에서 Debug mode 를 켜세요. Popup 에 감지 수, 큐, 실행 중 request, pending translations, completed translations, 오류 수, 최신 오류, 감지된 텍스트 샘플이 표시됩니다.

## 알려진 제한

- Firefox 는 아직 주요 지원 대상이 아닙니다.
- Site-specific DOM handling 은 소수의 고가치 상황으로 제한됩니다.
- 매우 동적인 Web app 은 번역 블록을 이동하거나 제거할 수 있습니다.
- 큰 페이지는 배치로 번역되므로 번역이 점진적으로 표시될 수 있습니다.
- Provider rate limit, 모델 가용성, 출력 품질은 설정한 provider 에 따라 달라집니다.

## 문서

- [Product Requirements](docs/PRD.md)
- [Project Principles](docs/PRINCIPLES.md)
- [Threat Model](docs/THREAT_MODEL.md)
- [Roadmap](docs/ROADMAP.md)

## License

MIT
