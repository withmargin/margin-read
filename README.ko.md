# Margin Read

[![CI](https://github.com/withmargin/margin-read/actions/workflows/ci.yml/badge.svg)](https://github.com/withmargin/margin-read/actions/workflows/ci.yml)
[![Release](https://github.com/withmargin/margin-read/actions/workflows/release.yml/badge.svg)](https://github.com/withmargin/margin-read/actions/workflows/release.yml)
[![CodeQL](https://github.com/withmargin/margin-read/actions/workflows/codeql.yml/badge.svg)](https://github.com/withmargin/margin-read/actions/workflows/codeql.yml)
[![GitHub Release](https://img.shields.io/github/v/release/withmargin/margin-read)](https://github.com/withmargin/margin-read/releases)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/clgdnabgpfiffmfdboefecbhggbepjde?label=chrome%20web%20store)](https://chromewebstore.google.com/detail/clgdnabgpfiffmfdboefecbhggbepjde)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

언어: [English](README.md) · [繁體中文](README.zh-TW.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md)

Margin Read는 웹페이지를 이중 언어로 번역하는 프라이버시 우선 브라우저 확장 프로그램입니다.

프라이버시를 최우선으로 하는 이중 언어 웹 번역으로, 원문을 그대로 유지하여 맥락을 잃지 않습니다.

Margin은 웹페이지의 원문을 그대로 유지하고, 대응하는 원본 블록 아래에 번역문을 삽입합니다. 따라서 독자는 페이지 맥락을 잃지 않고 두 버전을 나란히 비교할 수 있습니다.

저장소: https://github.com/withmargin/margin-read

## 상태

Margin은 Manifest V3를 사용하는 Chrome 및 Chromium 브라우저용 초기 MVP입니다.

이 확장 프로그램은 일반적인 기사 페이지, 텍스트 위주의 레거시 페이지, 그리고 일부 동적 페이지에서 사용할 수 있지만, 여전히 활발히 개발 중입니다. 상호작용이 많은 웹 앱, 특이한 레이아웃 시스템을 사용하는 페이지, DOM을 적극적으로 다시 쓰는 사이트에서는 미흡한 부분이 있을 수 있습니다.

## 기능

- 확장 프로그램 popup에서 현재 웹페이지를 번역합니다.
- 원문을 보존하고 대응하는 원본 블록 아래에 번역문을 삽입합니다.
- 단락, 제목, 목록 항목, 인용구 등 읽을 수 있는 텍스트 블록을 감지합니다.
- 레거시 `table`, `font`, `br`로 구분된 페이지를 처리합니다.
- 내비게이션, 폼, 버튼, 코드 블록, 숨겨진 텍스트, 페이지 크롬 등 일반적인 비독서 영역을 회피합니다.
- 사용자가 구성한 provider endpoint와 API key를 사용합니다.
- OpenAI, Anthropic Claude, Google Gemini 및 호환 provider 어댑터를 지원합니다.
- LM Studio, Ollama, llama.cpp server, omlx(Apple Silicon)와 같은 로컬 OpenAI 호환 런타임은 물론, Anthropic Messages API 호환 endpoint도 지원합니다.
- options 페이지에서 provider의 모델 목록을 가져옵니다.
- 통합형 또는 강조형 번역 표시 스타일을 선택할 수 있습니다.
- 떠 있는 페이지 버튼(기본 활성화)을 표시하며, 사용자가 클릭한 후에만 번역을 시작합니다. 이 버튼은 화면 가장자리를 따라 위아래로 드래그할 수 있고, 위치를 기억하며, 페이지의 밝거나 어두운 배경에 맞춰 외형을 조정하고, 닫기(×) 컨트롤이나 options 페이지에서 끌 수 있습니다.
- 기본적으로 세션 한정 번역 캐싱을 사용하며, 영구 캐시 및 캐시 비활성화 옵션도 제공합니다.
- 텍스트 감지, 큐 상태, provider 오류에 대한 popup 진단 정보를 표시합니다.
- 동적으로 삽입된 콘텐츠를 관찰합니다.
- 읽을 수 있는 콘텐츠를 대상으로 삼고 프로필 이름, 액션 수치, 미디어, 컨트롤을 회피하여 X 타임라인 카드와 장문 기사 페이지를 최적화합니다.

Margin은 PDF 번역, EPUB 번역, 자막 번역, OCR, 입력 상자 번역, 클라우드 동기화, 계정, 소셜 기능, 기본 telemetry, 공식 유료 번역 할당량 시스템을 포함하지 않습니다.

## 베타 테스트

베타 테스터는 초대를 받은 경우 Chrome Web Store 베타 등록을 통해, GitHub Release ZIP을 통해, 또는 로컬 소스 빌드를 통해 Margin을 설치할 수 있습니다. 전체 설정 및 피드백 절차는 [베타 테스트 가이드](docs/BETA_TESTING.md)를 참고하세요.

## 소스에서 설치

로컬 개발을 위해 Margin을 압축 해제된 확장 프로그램으로 로드하세요:

```sh
corepack enable
pnpm install
pnpm build
```

그런 다음:

1. `chrome://extensions`를 엽니다.
2. 개발자 모드를 활성화합니다.
3. 압축해제된 확장 프로그램을 로드합니다(Load unpacked)를 선택합니다.
4. 생성된 `apps/extension/dist/` 디렉터리를 선택합니다.
5. Margin options를 엽니다.
6. provider, API key, 모델, 대상 언어, 캐시 동작을 구성합니다.
7. 웹페이지를 열고 Margin popup에서 이 페이지 번역(Translate this page)을 클릭합니다.

## Provider 설정

Margin에는 API key가 포함되어 있지 않습니다. 사용자는 `Bearer` 접두사 없이 자신의 원본 provider API key를 직접 제공합니다.

기본 제공되는 provider는 다음 기본 endpoint를 사용합니다:

```text
OpenAI: https://api.openai.com/v1/chat/completions
Anthropic Claude: https://api.anthropic.com/v1/messages
Google Gemini: https://generativelanguage.googleapis.com/v1beta/models
```

endpoint 필드는 호환 / 로컬 LLM 설정에서만 표시되며, 이 경우 사용자가 로컬 endpoint를 선택하거나 입력해야 합니다.

모델 가져오기(Fetch models) 작업은 선택한 provider에서 사용 가능한 모델을 읽어옵니다:

- OpenAI: `GET /v1/models`
- Anthropic Claude: `GET /v1/models`
- Google Gemini: `GET /v1beta/models`
- OpenAI Compatible / Anthropic Compatible: `GET /v1/models`

가져온 모델은 모델 선택기에 나타납니다. provider 기본값이나 이전에 저장한 모델이 provider 목록에서 반환되지 않는 경우, Margin은 현재 구성된 모델을 옵션으로 유지합니다.

## 프라이버시

Margin은 선택된 텍스트 세그먼트만 구성된 provider에 전송합니다. 기본적으로 전체 페이지 HTML을 전송하지 않으며, 로그인을 요구하지 않고, 클라우드 동기화를 사용하지 않으며, 기본적으로 telemetry를 포함하지 않습니다.

provider 요청은 사용자가 구성한 endpoint와 API key를 사용하여 확장 프로그램 service worker가 보냅니다. provider의 프라이버시는 사용자가 선택한 endpoint 및 모델 provider에 따라 달라집니다.

API key는 브라우저 확장 프로그램 저장소에 저장됩니다. 브라우저 프로필을 신뢰할 수 있는 환경의 일부로 취급하세요.

## X 최적화

Margin에는 타임라인 카드와 장문 기사 페이지를 위한 선택적 X 전용 감지기가 포함되어 있습니다. 활성화하면, 보이는 모든 텍스트 노드를 스캔하는 대신 트윗 article 내부의 `tweetText` 콘텐츠와 X article 뷰 내부의 읽을 수 있는 블록을 대상으로 삼습니다.

인용된 게시물은 기본적으로 비활성화되어 있으며 options에서 활성화할 수 있습니다. X가 이미 번역됨으로 표시한 게시물은 중복 번역을 피하기 위해 기본적으로 건너뜁니다.

## 로컬 LLM

Margin은 호환 provider를 통해 로컬 LLM 런타임을 지원합니다:

- OpenAI Compatible은 OpenAI 방식의 `/v1/chat/completions` API를 사용합니다.
- Anthropic Compatible은 도구 `input_schema` 구조화 출력과 함께 Anthropic Messages 방식의 `/v1/messages` API를 사용합니다. 이는 호환 로컬 또는 게이트웨이 endpoint를 위한 와이어 프로토콜 옵션이며, Anthropic이 호스팅하는 별도의 서비스가 아닙니다.

두 호환 provider 모두 빈 API key를 허용하며, 로컬 추론을 위해 더 낮은 기본 번역 동시성을 사용합니다. Anthropic 호환 게이트웨이가 키를 요구하는 경우, Margin은 이를 `Authorization: Bearer ...` 형태로 보냅니다.

일반적인 호환 endpoint:

```text
LM Studio: http://localhost:1234/v1/chat/completions
Ollama: http://localhost:11434/v1/chat/completions
llama.cpp server: http://localhost:8080/v1/chat/completions
omlx: http://localhost:8000/v1/chat/completions
Generic Anthropic-compatible: http://localhost:8000/v1/messages
Ollama Anthropic compatibility: http://localhost:11434/v1/messages
```

로컬 런타임을 사용하려면:

1. 로컬 모델 서버를 시작합니다.
2. Margin options를 엽니다.
3. `/v1/chat/completions`에는 OpenAI Compatible을, `/v1/messages`에는 Anthropic Compatible을 선택합니다.
4. OpenAI 호환 endpoint 프리셋을 선택하거나, 런타임이 표시하는 endpoint URL을 입력합니다.
5. 로컬 게이트웨이가 요구하지 않는 한 API key는 비워 둡니다.
6. 모델 가져오기(Fetch models)를 클릭하고 모델 선택기에서 제공되는 모델을 선택합니다.
7. OpenAI Compatible의 경우, 지원될 때는 JSON 모드 요청(Request JSON mode)을 활성화 상태로 둡니다. 로컬 런타임이 `response_format` 요청 필드를 거부하면 비활성화합니다.

런타임 참고 사항:

- LM Studio는 일반적으로 `http://localhost:1234/v1/chat/completions`에서 OpenAI 호환 요청을 제공합니다.
- Ollama는 OpenAI 호환 API가 `http://localhost:11434/v1/chat/completions`에서 제공되어야 합니다.
- Ollama는 `http://localhost:11434/v1/messages`에서 Anthropic 호환 요청도 노출할 수 있습니다. Margin은 구조화 출력을 위해 도구를 전송하지만 Anthropic 호환 endpoint에 대해서는 `tool_choice`를 강제하지 않습니다. 일부 호환 런타임은 도구는 허용하지만 강제 도구 선택은 지원하지 않기 때문입니다.
- llama.cpp server는 OpenAI 호환 HTTP 서버가 활성화된 상태로 시작해야 하며, 일반적으로 `http://localhost:8080/v1/chat/completions`에서 제공됩니다.
- omlx는 Apple Silicon MLX 추론 서버입니다. `omlx serve`(무설정, 모델은 `~/.omlx/models`에서)나 `omlx serve --model-dir /path/to/models`로 시작하면, OpenAI 호환 API가 `http://localhost:8000/v1/chat/completions`에서 제공됩니다.
- 모델 가져오기(Fetch models)가 실패하면, 로컬 서버가 실행 중인지, endpoint URL이 `/v1/chat/completions` 또는 `/v1/messages`로 끝나는지, 런타임이 호환 `/v1/models` endpoint를 노출하는지 확인하세요.

로컬 모델의 품질, 속도, 컨텍스트 길이, JSON 신뢰성은 모델과 런타임에 따라 달라집니다. 번역에는 강력한 다국어 능력을 갖춘 instruct 모델을 권장합니다.

## 로컬 개발

의존성을 설치합니다:

```sh
corepack enable
pnpm install
```

핫 리로딩이 적용된 개발 서버를 실행합니다(Vite + CRXJS). `apps/extension/dist/`를 압축 해제된 확장 프로그램으로 한 번 로드한 다음, 소스를 편집하면 확장 프로그램이 자동으로 다시 로드됩니다:

```sh
pnpm --filter @margin/extension dev
```

타입 검사를 실행합니다:

```sh
pnpm check
```

린트를 실행합니다:

```sh
pnpm lint
```

확장 프로그램 manifest 및 보안 검사를 실행합니다:

```sh
pnpm check:extension
```

커버리지와 함께 테스트를 실행합니다:

```sh
pnpm test
```

확장 프로그램을 빌드합니다:

```sh
pnpm build
```

빌드는 CRXJS 플러그인(내부적으로 Rolldown)과 함께 Vite를 사용하며, 압축 해제된 확장 프로그램을 `apps/extension/dist/`에 작성합니다.

## 프로젝트 구조

```text
apps/extension/src/background/     Service worker, provider 요청, 설정, 캐시 흐름
apps/extension/src/content/        페이지 텍스트 감지, 큐잉, 번역 삽입
apps/extension/src/options/        확장 프로그램 options 페이지
apps/extension/src/popup/          Popup UI 및 진단
apps/extension/src/background/providers/      Provider 어댑터
apps/extension/src/shared/         공유 타입, 기본값, 저장소, 메시지
apps/extension/public/             빌드에 그대로 복사되는 정적 자산(아이콘)
apps/extension/*.html              Popup 및 options HTML 진입점
apps/extension/scripts/            빌드 및 확장 프로그램 검증 스크립트
docs/                              제품, 로드맵, 원칙, 위협 모델
```

## 문제 해결

페이지가 활성화된 것처럼 보이지만 번역이 삽입되지 않는 경우, Margin options에서 디버그 모드(Debug mode)를 활성화하세요. popup에 현재 페이지 감지 수, 큐에 들어간 블록, 실행 중인 요청, 대기 중인 번역, 완료된 번역, 오류 수, 최신 오류, 그리고 감지된 텍스트 블록 샘플이 표시됩니다.

이 값들을 사용하여 주요 실패 유형을 구분하세요:

- `Detected blocks: 0`은 content script가 페이지에서 읽을 수 있는 텍스트를 찾지 못했음을 의미합니다.
- 감지 수는 양수인데 실행 중인 요청이 없다면, 보통 번역 큐를 점검해야 함을 의미합니다.
- 오류 블록이나 최신 오류는 보통 provider 구성, 인증, 모델, endpoint, 또는 응답 형식 문제를 가리킵니다.

## 알려진 제한 사항

- Firefox는 아직 주요 대상이 아닙니다.
- 사이트별 DOM 처리는 가치가 높은 몇 가지 경우로 제한됩니다.
- 동적 변화가 심한 웹 앱은 번역 블록을 이동하거나 제거할 수 있습니다.
- 큰 페이지는 배치로 번역되므로, 번역이 점진적으로 나타날 수 있습니다.
- provider 속도 제한, 모델 가용성, 출력 품질은 구성된 provider에 따라 달라집니다.

## 문서

- [제품 요구사항](docs/PRD.md)
- [프로젝트 원칙](docs/PRINCIPLES.md)
- [위협 모델](docs/THREAT_MODEL.md)
- [로드맵](docs/ROADMAP.md)
- [베타 테스트 가이드](docs/BETA_TESTING.md)
- [릴리스 체크리스트](docs/RELEASE_CHECKLIST.md)

## 라이선스

MIT
