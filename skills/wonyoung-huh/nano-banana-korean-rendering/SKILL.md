---
name: text-preserve
description: 비라틴 문자(한글, 일본어, 중국어 등)를 AI 이미지에 정확히 렌더링하는 스킬. Canvas 프리렌더링과 Gemini를 활용하여 텍스트 깨짐 없이 이미지를 생성합니다.
tags:
  - korean
  - 한국어
  - 한글
  - japanese
  - chinese
  - rendering
  - text
  - image
  - canvas
  - gemini
  - font
  - typography
  - 텍스트
  - 렌더링
  - 이미지
---

# 다국어 텍스트 프리렌더링 스킬

AI 이미지 모델은 한글·한자·일본어 등 비라틴 문자를 직접 그리면 글자가 깨지거나 오타가 생깁니다.
이 스킬은 **웹앱과 완전히 동일한 파이프라인**을 제공합니다:

1. **detect** — 프롬프트에 비라틴 문자가 있는지 감지
2. **analyze** — Gemini LLM으로 프롬프트에서 텍스트와 스타일 추출
3. **render** — Canvas로 정확한 폰트를 사용해 텍스트를 PNG 프리렌더링
4. **generate** — 프리렌더링 PNG를 Gemini 이미지 생성에 인풋으로 넣어 최종 이미지 생성

## 최초 설정 (한 번만)

```bash
cd {baseDir} && node setup.mjs
```

- `canvas` + `@google/generative-ai` npm 패키지 설치
- Noto Sans 폰트 파일을 `{baseDir}/fonts/`에 준비

## 환경 변수

| 변수 | 필수 | 설명 |
|---|---|---|
| `GEMINI_API_KEY` | ⭐ 필수 | Gemini Flash(분석) + Gemini Image(생성) 모두에 사용 |
| `GEMINI_IMAGE_MODEL` | 선택 | 이미지 생성 모델 (기본: gemini-3-pro-image-preview) |

---

## 사용 흐름 (Step-by-Step)

### 한 번에 실행: `pipeline`

전체 파이프라인을 한 명령어로 실행합니다:

```bash
node {baseDir}/render.mjs pipeline "욎홎 뙤앾뼡이라는 지역 축제 포스터 만들어줘" \
  --output /tmp/final-image.png --no-base64
```

결과:
```json
{
  "detect": { "needsRendering": true, "primaryScript": "hangul", ... },
  "analyze": { "texts": [...], "style": {...}, "reasoning": "..." },
  "render": { "success": true, "outputPath": "/tmp/text-render-xxx.png", ... },
  "generate": { "success": true, "outputPath": "/tmp/final-image.png", ... }
}
```

### 단계별 실행

#### Step 1: 비라틴 문자 감지 (`detect`)

```bash
node {baseDir}/render.mjs detect "사용자 프롬프트 전체"
```

- `needsRendering: false` → 프리렌더링 없이 일반 이미지 생성 진행
- `needsRendering: true` → Step 2로 진행

#### Step 2: Gemini LLM 프롬프트 분석 (`analyze`)

```bash
node {baseDir}/render.mjs analyze "욎홎 뙤앾뼡이라는 지역 축제 포스터 만들어줘"
```

Gemini Flash가 프롬프트를 분석하여:
- 이미지에 들어갈 **텍스트** 추출 (따옴표, 레이블, 맥락 기반)
- 디자인 맥락에 맞는 **스타일** 결정 (폰트, 크기, 색상)
- 각 텍스트의 **역할**(headline/subheadline/body/caption) 지정
- 각 텍스트의 **스크립트·언어** 자동 감지

> **GEMINI_API_KEY가 없으면** 규칙 기반 fallback이 동작합니다.

#### Step 3: Canvas 프리렌더링 (`render`)

analyze 결과를 그대로 render에 전달합니다:

```bash
node {baseDir}/render.mjs render \
  --json '{"texts":[...],"style":{...}}' \
  --output /tmp/rendered-text.png
```

또는 JSON 파일로:
```bash
node {baseDir}/render.mjs render --input /tmp/analysis.json --output /tmp/rendered-text.png
```

#### Step 4: Gemini 이미지 생성 (`generate`)

**프리렌더링된 텍스트 PNG를 Gemini에 인풋 이미지로 넣어서 최종 이미지를 생성합니다.**

```bash
node {baseDir}/render.mjs generate \
  --prompt "욎홎 뙤앾뼡이라는 지역 축제 포스터 만들어줘" \
  --rendered /tmp/rendered-text.png \
  --analysis '{"texts":[...],"style":{...}}' \
  --output /tmp/final-image.png \
  --no-base64
```

이 명령어는 내부적으로:
1. 프리렌더링 PNG를 **첫 번째 참조 이미지**로 Gemini에 전달
2. `buildTextRenderFinalPrompt`로 프롬프트를 구성 (텍스트 목록 + 스타일 + "텍스트를 다시 그리지 말고 그대로 사용하라" 지침)
3. Gemini가 텍스트를 자연스럽게 통합한 최종 이미지를 생성

추가 참조 이미지가 있으면 `--ref`로 전달:
```bash
node {baseDir}/render.mjs generate \
  --prompt "포스터 만들어줘" \
  --rendered /tmp/rendered-text.png \
  --ref /tmp/user-reference.jpg \
  --output /tmp/final-image.png
```

---

## 지원 폰트

| 언어 | sans-serif | serif | display | handwriting |
|---|---|---|---|---|
| 한국어 | Noto Sans KR | Noto Serif KR | Black Han Sans | Nanum Pen Script |
| 일본어 | Noto Sans JP | Noto Serif JP | Noto Sans JP | Noto Sans JP |
| 중국어 | Noto Sans SC | Noto Serif SC | Noto Sans SC | Noto Sans SC |
| 태국어 | Noto Sans Thai | — | — | — |
| 영어 | Inter | Georgia | Impact | Comic Sans MS |

## 텍스트 역할별 크기

| role | 용도 | 크기 비율 |
|---|---|---|
| headline | 메인 제목 | 1.0x |
| subheadline | 부제목 | 0.7x |
| body | 본문 | 0.5x |
| caption | 캡션/설명 | 0.4x |

## 폰트 크기 매핑

| fontSize | 픽셀 |
|---|---|
| small | 24px |
| medium | 36px |
| large | 48px |
| xlarge | 72px |

---

## 트리거 키워드

이 스킬은 사용자 프롬프트에 다음 키워드가 포함되어 있을 때 자동 활성화됩니다:

`텍스트`, `글자`, `문구`, `로고`, `워터마크`, `브랜드`, `글씨`, `제목`, `헤드라인`,
`text`, `logo`, `title`, `headline`,
또는 프롬프트에 한글/한자/일본어/태국어/아랍어 등 비라틴 문자가 포함된 경우.

## 규칙 (Do)

- 비라틴 문자가 감지되면 반드시 전체 파이프라인 (detect→analyze→render→generate)을 실행한다
- `analyze`로 LLM이 텍스트와 스타일을 추출하도록 한다
- `render`로 Canvas 프리렌더링 PNG를 생성한다
- `generate`로 프리렌더링 PNG를 Gemini에 인풋으로 넣어 최종 이미지를 생성한다

## 금지사항 (Don't)

- AI 모델에게 비라틴 문자를 직접 그리라고 요청하지 않는다
- 프리렌더링 없이 한글/한자/일본어 텍스트를 이미지 프롬프트에 포함하지 않는다
- `render` 단계를 건너뛰고 바로 `generate`하지 않는다
- `analyze` 결과에서 텍스트를 임의로 수정하지 않는다
