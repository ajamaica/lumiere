#!/usr/bin/env node

/**
 * 다국어 텍스트 프리렌더링 CLI
 *
 * 웹앱(apps/web/src/lib/text-render/)과 **완전히 동일한** 파이프라인을 제공합니다.
 *
 *   detect  → 비라틴 문자 감지       (detector.ts 동일)
 *   analyze → Gemini LLM 프롬프트 분석 (analyzer.ts 동일)
 *   render  → Canvas PNG 렌더링       (renderer.ts 동일)
 *
 * 사용법:
 *   node render.mjs detect  "욎홎 뙤앾뼡이라는 지역 축제 포스터 만들어줘"
 *   node render.mjs analyze "욎홎 뙤앾뼡이라는 지역 축제 포스터 만들어줘"
 *   node render.mjs render  --json '{...}' --output /tmp/text.png
 *   node render.mjs render  --input input.json --output /tmp/text.png
 */

import { createCanvas, registerFont } from 'canvas';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================================
// Script Detection (apps/web/src/lib/text-render/detector.ts 와 동일)
// =============================================================================

const SCRIPT_RANGES = [
  // 라틴 (기본 + 확장)
  { start: 0x0041, end: 0x007a, script: 'latin' },
  { start: 0x00c0, end: 0x00ff, script: 'latin' },
  { start: 0x0100, end: 0x017f, script: 'latin' },
  // 한글
  { start: 0xac00, end: 0xd7af, script: 'hangul' },
  { start: 0x1100, end: 0x11ff, script: 'hangul' },
  { start: 0x3130, end: 0x318f, script: 'hangul' },
  // 일본어
  { start: 0x3040, end: 0x309f, script: 'hiragana' },
  { start: 0x30a0, end: 0x30ff, script: 'katakana' },
  { start: 0x31f0, end: 0x31ff, script: 'katakana' },
  // 한자 (CJK)
  { start: 0x4e00, end: 0x9fff, script: 'han' },
  { start: 0x3400, end: 0x4dbf, script: 'han' },
  { start: 0xf900, end: 0xfaff, script: 'han' },
  // 태국어
  { start: 0x0e00, end: 0x0e7f, script: 'thai' },
  // 아랍어
  { start: 0x0600, end: 0x06ff, script: 'arabic' },
  { start: 0x0750, end: 0x077f, script: 'arabic' },
  // 데바나가리
  { start: 0x0900, end: 0x097f, script: 'devanagari' },
  // 키릴
  { start: 0x0400, end: 0x04ff, script: 'cyrillic' },
  { start: 0x0500, end: 0x052f, script: 'cyrillic' },
];

function getCharScript(char) {
  const code = char.codePointAt(0);
  if (code === undefined) return 'unknown';
  for (const range of SCRIPT_RANGES) {
    if (code >= range.start && code <= range.end) return range.script;
  }
  return 'unknown';
}

function detectScripts(text) {
  const scriptCounts = new Map();
  let totalChars = 0;
  for (const char of text) {
    if (/[\s\d\p{P}]/u.test(char)) continue;
    const script = getCharScript(char);
    scriptCounts.set(script, (scriptCounts.get(script) || 0) + 1);
    totalChars++;
  }
  if (totalChars === 0) return [{ script: 'latin', count: 0, percentage: 100 }];
  const results = [];
  for (const [script, count] of scriptCounts) {
    results.push({ script, count, percentage: Math.round((count / totalChars) * 100) });
  }
  return results.sort((a, b) => b.percentage - a.percentage);
}

function hasNonLatinScript(text) {
  return detectScripts(text).some((s) => s.script !== 'latin' && s.script !== 'unknown');
}

function scriptToLanguage(script) {
  const mapping = {
    latin: 'en',
    hangul: 'ko',
    hiragana: 'ja',
    katakana: 'ja',
    kanji: 'ja',
    han: 'zh',
    thai: 'th',
    arabic: 'ar',
    devanagari: 'hi',
    cyrillic: 'ru',
    unknown: 'en',
  };
  return mapping[script] || 'en';
}

// =============================================================================
// Font Management (apps/web/src/lib/text-render/fonts.ts 와 동일)
// =============================================================================

/** 폰트를 찾을 디렉토리 후보 (우선순위 순) */
function getFontsDirs() {
  return [
    path.join(__dirname, 'fonts'),
    path.join(__dirname, '..', '..', 'apps', 'web', 'public', 'fonts'),
  ];
}

function findFontsDir() {
  for (const dir of getFontsDirs()) {
    if (fs.existsSync(dir)) return dir;
  }
  return null;
}

const SCRIPT_FONT_MAP = {
  latin: 'Inter',
  hangul: 'Noto Sans KR',
  hiragana: 'Noto Sans JP',
  katakana: 'Noto Sans JP',
  kanji: 'Noto Sans JP',
  han: 'Noto Sans SC',
  thai: 'Noto Sans Thai',
  arabic: 'Noto Sans Arabic',
  devanagari: 'Noto Sans Devanagari',
  cyrillic: 'Inter',
  unknown: 'Inter',
};

const CATEGORY_FONT_MAP = {
  'sans-serif': {
    ko: 'Noto Sans KR',
    ja: 'Noto Sans JP',
    zh: 'Noto Sans SC',
    th: 'Noto Sans Thai',
    en: 'Inter',
  },
  serif: {
    ko: 'Noto Serif KR',
    ja: 'Noto Serif JP',
    zh: 'Noto Serif SC',
    en: 'Georgia',
  },
  display: {
    ko: 'Black Han Sans',
    ja: 'Noto Sans JP',
    zh: 'Noto Sans SC',
    en: 'Impact',
  },
  handwriting: {
    ko: 'Nanum Pen Script',
    ja: 'Noto Sans JP',
    zh: 'Noto Sans SC',
    en: 'Comic Sans MS',
  },
  monospace: {
    ko: 'Noto Sans KR',
    ja: 'Noto Sans JP',
    zh: 'Noto Sans SC',
    en: 'Courier New',
  },
};

const registeredFonts = new Set();

function registerFontFile(fontsDir, fileName, family, weight = 'normal') {
  const cacheKey = `${family}-${weight}`;
  if (registeredFonts.has(cacheKey)) return true;
  const fullPath = path.join(fontsDir, fileName);
  if (!fs.existsSync(fullPath)) return false;
  try {
    registerFont(fullPath, { family, weight });
    registeredFonts.add(cacheKey);
    return true;
  } catch {
    return false;
  }
}

function initializeFonts() {
  const fontsDir = findFontsDir();
  if (!fontsDir) return { registered: 0, fontsDir: null };

  const fontFiles = [
    { file: 'NotoSansKR-Regular.ttf', family: 'Noto Sans KR', weight: 'normal' },
    { file: 'NotoSansKR-Bold.ttf', family: 'Noto Sans KR', weight: 'bold' },
    { file: 'NotoSansJP-Regular.ttf', family: 'Noto Sans JP', weight: 'normal' },
    { file: 'NotoSansJP-Bold.ttf', family: 'Noto Sans JP', weight: 'bold' },
    { file: 'NotoSansSC-Regular.ttf', family: 'Noto Sans SC', weight: 'normal' },
    { file: 'NotoSansThai-Regular.ttf', family: 'Noto Sans Thai', weight: 'normal' },
    { file: 'Inter-Regular.ttf', family: 'Inter', weight: 'normal' },
  ];

  let registered = 0;
  for (const font of fontFiles) {
    if (registerFontFile(fontsDir, font.file, font.family, font.weight)) registered++;
  }
  return { registered, fontsDir };
}

function getFontForScript(script) {
  return SCRIPT_FONT_MAP[script] || SCRIPT_FONT_MAP.latin;
}

function getFontForCategory(language, category) {
  const categoryMap = CATEGORY_FONT_MAP[category];
  if (!categoryMap) return SCRIPT_FONT_MAP.latin;
  return categoryMap[language] || categoryMap.en || SCRIPT_FONT_MAP.latin;
}

function fontWeightToCSS(weight) {
  return { normal: 'normal', bold: 'bold', black: '900' }[weight] || 'normal';
}

// =============================================================================
// Canvas Renderer (apps/web/src/lib/text-render/renderer.ts 와 동일)
// =============================================================================

const FONT_SIZE_MAP = { small: 24, medium: 36, large: 48, xlarge: 72 };
const ROLE_SIZE_RATIO = { headline: 1, subheadline: 0.7, body: 0.5, caption: 0.4 };

const DEFAULT_OPTIONS = {
  width: 1024,
  height: 512,
  padding: 60,
  backgroundColor: '#FFFFFF',
  maxWidth: 900,
};

function setFont(ctx, style) {
  const weight = fontWeightToCSS(style.fontWeight);
  ctx.font = `${weight} ${style.fontSize}px "${style.fontFamily}"`;
}

function wrapText(ctx, text, maxWidth) {
  const chars = [...text];
  const lines = [];
  let currentLine = '';

  for (const char of chars) {
    const testLine = currentLine + char;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine !== '') {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [''];
}

function validateCanvasSize(size, defaultSize) {
  const n = Number(size);
  if (!Number.isFinite(n) || n <= 0 || n > 8192) return defaultSize;
  return Math.round(n);
}

function render(input) {
  const { texts, style, layoutHint = 'centered', options = {} } = input;
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const baseSize = FONT_SIZE_MAP[style.fontSize] || FONT_SIZE_MAP.medium;

  // 텍스트 스타일 준비
  const textStyles = (texts || [])
    .filter((t) => t.content && t.content.trim() !== '')
    .map((t) => {
      const scripts = detectScripts(t.content);
      const primaryScript = scripts[0]?.script || (t.scripts && t.scripts[0]) || 'latin';
      const language = t.language || scriptToLanguage(primaryScript);
      const fontFamily =
        getFontForCategory(language, style.fontCategory) || getFontForScript(primaryScript);

      return {
        text: t,
        style: {
          fontFamily,
          fontSize: Math.round(baseSize * (ROLE_SIZE_RATIO[t.role] || 1)),
          fontWeight: style.fontWeight || 'bold',
          color: style.color || '#000000',
          alignment: style.alignment || 'center',
          lineHeight: 1.4,
        },
      };
    });

  // 텍스트가 없으면 빈 캔버스
  if (textStyles.length === 0) {
    const w = validateCanvasSize(opts.width, DEFAULT_OPTIONS.width);
    const h = validateCanvasSize(opts.height, DEFAULT_OPTIONS.height);
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = style.backgroundColor || opts.backgroundColor;
    ctx.fillRect(0, 0, w, h);
    return { buffer: canvas.toBuffer('image/png'), width: w, height: h, mimeType: 'image/png' };
  }

  // 텍스트 측정
  const measureCanvas = createCanvas(1, 1);
  const measureCtx = measureCanvas.getContext('2d');

  const lineMetrics = [];
  for (const ts of textStyles) {
    setFont(measureCtx, ts.style);
    const lines = wrapText(measureCtx, ts.text.content, opts.maxWidth);
    const lineHeight = ts.style.fontSize * (ts.style.lineHeight || 1.4);
    for (const line of lines) {
      const metrics = measureCtx.measureText(line);
      lineMetrics.push({
        text: line,
        width: metrics.width,
        height: lineHeight,
        style: ts.style,
        role: ts.text.role,
      });
    }
  }

  // 캔버스 크기 계산
  const maxLineWidth = Math.max(...lineMetrics.map((m) => m.width));
  const totalHeight = lineMetrics.reduce((sum, m) => sum + m.height, 0);

  const width = validateCanvasSize(
    Math.max(opts.width, Math.ceil(maxLineWidth + opts.padding * 2)),
    DEFAULT_OPTIONS.width
  );
  const height = validateCanvasSize(
    Math.max(opts.height, Math.ceil(totalHeight + opts.padding * 2)),
    DEFAULT_OPTIONS.height
  );

  // 캔버스 생성 + 렌더링
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = style.backgroundColor || opts.backgroundColor;
  ctx.fillRect(0, 0, width, height);
  ctx.textBaseline = 'top';

  let y = (height - totalHeight) / 2;
  let prevRole = '';

  for (const metric of lineMetrics) {
    // 역할이 바뀌면 간격 추가
    if (prevRole && prevRole !== metric.role) {
      y += metric.style.fontSize * 0.3;
    }
    prevRole = metric.role;

    setFont(ctx, metric.style);
    ctx.fillStyle = metric.style.color;

    let x;
    switch (metric.style.alignment) {
      case 'left':
        x = opts.padding;
        break;
      case 'right':
        x = width - opts.padding - metric.width;
        break;
      case 'center':
      default:
        x = (width - metric.width) / 2;
    }

    ctx.fillText(metric.text, x, y);
    y += metric.height;
  }

  return {
    buffer: canvas.toBuffer('image/png'),
    width,
    height,
    mimeType: 'image/png',
  };
}

// =============================================================================
// LLM Analyzer (apps/web/src/lib/text-render/analyzer.ts 와 동일)
// =============================================================================

/** 분석 프롬프트 템플릿 — 웹앱 analyzer.ts의 ANALYSIS_PROMPT와 동일 */
const ANALYSIS_PROMPT = `당신은 디자인 전문가입니다. 사용자의 프롬프트를 분석하여 이미지에 들어갈 텍스트와 적절한 스타일을 추출해주세요.

## 분석 지침
1. 프롬프트에서 "반드시 이미지에 포함되어야 하는 텍스트"를 추출합니다.
2. 따옴표로 감싸진 텍스트, "문구:", "헤드라인:", "제목:" 등으로 시작하는 텍스트를 찾습니다.
3. 디자인 맥락(포스터, 메뉴판, 배너 등)을 파악하여 적절한 폰트 스타일을 결정합니다.

## 스타일 가이드
- 락발라드/록 포스터: display 폰트, bold/black, large/xlarge
- 카페/레스토랑 메뉴: handwriting 또는 serif, normal, medium
- 비즈니스/기업: sans-serif, normal/bold, medium
- 럭셔리/프리미엄: serif, normal, medium/large
- 키즈/유아: sans-serif (rounded), bold, large
- 이벤트/세일: display, black, xlarge

## 출력 형식 (JSON)
{
  "texts": [
    { "content": "추출된 텍스트", "role": "headline|subheadline|body|caption" }
  ],
  "style": {
    "mood": "분위기 키워드 (예: elegant, playful, bold)",
    "fontCategory": "serif|sans-serif|display|handwriting|monospace",
    "fontSize": "small|medium|large|xlarge",
    "fontWeight": "normal|bold|black",
    "alignment": "left|center|right",
    "color": "#000000 (선택사항)",
    "backgroundColor": "#FFFFFF (선택사항)"
  },
  "layoutHint": "horizontal|vertical|centered",
  "reasoning": "스타일 선택 이유"
}

## 사용자 프롬프트
`;

/**
 * Gemini Flash를 사용하여 프롬프트를 분석합니다.
 * 웹앱의 analyzePrompt() 함수와 동일한 로직.
 */
async function analyzePrompt(prompt, context) {
  // 1. 먼저 다국어 텍스트가 있는지 빠르게 확인
  if (!hasNonLatinScript(prompt)) {
    return {
      needsRendering: false,
      texts: [],
      style: {
        mood: 'neutral',
        fontCategory: 'sans-serif',
        fontSize: 'medium',
        fontWeight: 'normal',
        alignment: 'center',
      },
      layoutHint: 'centered',
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[analyze] GEMINI_API_KEY가 설정되지 않았습니다. 규칙 기반 fallback으로 전환합니다.');
    return extractTextsByRules(prompt);
  }

  try {
    // @google/generative-ai 동적 임포트
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    const fullPrompt = ANALYSIS_PROMPT + prompt + (context ? `\n\n추가 맥락: ${context}` : '');

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const response = result.response;
    const text = response.text();

    // JSON 파싱
    const parsed = JSON.parse(text);

    // 추출된 텍스트에 스크립트 정보 추가
    const textsWithScripts = (parsed.texts || []).map((t) => {
      const scripts = detectScripts(t.content);
      const primaryScript = scripts[0]?.script || 'latin';
      return {
        content: t.content,
        role: t.role,
        language: scriptToLanguage(primaryScript),
        scripts: scripts.map((s) => s.script),
      };
    });

    // 다국어 텍스트가 있는지 최종 확인
    const hasMultilingual = textsWithScripts.some((t) =>
      t.scripts.some((s) => s !== 'latin' && s !== 'unknown')
    );

    return {
      needsRendering: hasMultilingual && textsWithScripts.length > 0,
      texts: textsWithScripts,
      style: {
        mood: parsed.style?.mood || 'neutral',
        fontCategory: parsed.style?.fontCategory || 'sans-serif',
        fontSize: parsed.style?.fontSize || 'large',
        fontWeight: parsed.style?.fontWeight || 'bold',
        alignment: parsed.style?.alignment || 'center',
        color: parsed.style?.color,
        backgroundColor: parsed.style?.backgroundColor,
      },
      layoutHint: parsed.layoutHint || 'centered',
      reasoning: parsed.reasoning,
    };
  } catch (error) {
    console.error('[analyze] Gemini 분석 실패, 규칙 기반 fallback:', error.message || error);
    return extractTextsByRules(prompt);
  }
}

/**
 * 규칙 기반으로 텍스트를 추출합니다 (LLM 실패 시 fallback).
 * 웹앱의 extractTextsByRules() 함수와 동일한 로직.
 */
function extractTextsByRules(prompt) {
  const texts = [];

  // 1. 따옴표로 감싸진 텍스트 추출
  const quotedMatches = prompt.match(/["'""''「」『』]([^"'""''「」『』]+)["'""''「」『』]/g);
  if (quotedMatches) {
    for (const match of quotedMatches) {
      const content = match.slice(1, -1);
      if (hasNonLatinScript(content)) {
        const scripts = detectScripts(content);
        texts.push({
          content,
          role: texts.length === 0 ? 'headline' : 'body',
          language: scriptToLanguage(scripts[0]?.script || 'latin'),
          scripts: scripts.map((s) => s.script),
        });
      }
    }
  }

  // 2. "텍스트:", "문구:", "제목:" 패턴 추출
  const labelPatterns = [
    /(?:텍스트|문구|제목|헤드라인|타이틀|이름)[:\s]+([^\n,。.]+)/gi,
    /(?:text|title|headline)[:\s]+([^\n,。.]+)/gi,
  ];

  for (const pattern of labelPatterns) {
    let match;
    while ((match = pattern.exec(prompt)) !== null) {
      const content = match[1].trim();
      if (hasNonLatinScript(content) && !texts.some((t) => t.content === content)) {
        const scripts = detectScripts(content);
        texts.push({
          content,
          role: 'headline',
          language: scriptToLanguage(scripts[0]?.script || 'latin'),
          scripts: scripts.map((s) => s.script),
        });
      }
    }
  }

  // 3. 위 패턴에 안 걸렸으면 — 프롬프트에서 비라틴 문자 덩어리 직접 추출
  if (texts.length === 0) {
    // 한글/한자/일본어/태국어 등 연속 비라틴 토큰 추출
    const nonLatinChunks = prompt.match(/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\u3040-\u30FF\u4E00-\u9FFF\u0E00-\u0E7F\u0600-\u06FF\u0900-\u097F\u0400-\u052F][\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\u3040-\u30FF\u4E00-\u9FFF\u0E00-\u0E7F\u0600-\u06FF\u0900-\u097F\u0400-\u052F\s\d\p{P}]*/gu);

    if (nonLatinChunks) {
      // "만들어줘", "넣어줘", "생성해줘" 같은 동사 제거
      const verbPatterns = /(?:만들어|넣어|생성해|그려|디자인해|작성해|써|해줘|할게|줘|주세요|해주세요|합니다|한다|하는|이라는|같은|느낌의?|스타일|으로|에서|하고|부탁|이미지|사진|그림|포스터|배너|로고|메뉴|디자인)/g;

      for (const chunk of nonLatinChunks) {
        const cleaned = chunk.replace(verbPatterns, '').trim();
        if (cleaned.length >= 2 && hasNonLatinScript(cleaned)) {
          const scripts = detectScripts(cleaned);
          texts.push({
            content: cleaned,
            role: texts.length === 0 ? 'headline' : 'subheadline',
            language: scriptToLanguage(scripts[0]?.script || 'latin'),
            scripts: scripts.map((s) => s.script),
          });
        }
      }
    }
  }

  // 맥락 기반 스타일 추론
  const style = inferStyleFromContext(prompt);

  return {
    needsRendering: texts.length > 0,
    texts,
    style,
    layoutHint: 'centered',
  };
}

/**
 * 프롬프트의 맥락(포스터, 메뉴, 배너 등)에서 스타일을 추론합니다.
 */
function inferStyleFromContext(prompt) {
  const lower = prompt.toLowerCase();

  // 맥락별 스타일 매핑
  const contextStyles = [
    { patterns: ['포스터', 'poster', '공연', '콘서트', '축제', 'festival'], style: { mood: 'energetic', fontCategory: 'display', fontSize: 'xlarge', fontWeight: 'black', alignment: 'center' } },
    { patterns: ['메뉴', 'menu', '카페', 'cafe', '레스토랑', 'restaurant'], style: { mood: 'warm', fontCategory: 'handwriting', fontSize: 'medium', fontWeight: 'normal', alignment: 'center' } },
    { patterns: ['배너', 'banner', '광고', 'ad', '세일', 'sale', '이벤트', 'event'], style: { mood: 'bold', fontCategory: 'display', fontSize: 'xlarge', fontWeight: 'black', alignment: 'center' } },
    { patterns: ['명함', 'card', '비즈니스', 'business', '기업', 'corporate'], style: { mood: 'professional', fontCategory: 'sans-serif', fontSize: 'medium', fontWeight: 'bold', alignment: 'left' } },
    { patterns: ['럭셔리', 'luxury', '프리미엄', 'premium', '고급'], style: { mood: 'elegant', fontCategory: 'serif', fontSize: 'large', fontWeight: 'normal', alignment: 'center' } },
    { patterns: ['키즈', 'kids', '어린이', '유아', '동화'], style: { mood: 'playful', fontCategory: 'sans-serif', fontSize: 'large', fontWeight: 'bold', alignment: 'center' } },
  ];

  for (const ctx of contextStyles) {
    if (ctx.patterns.some((p) => lower.includes(p))) {
      return ctx.style;
    }
  }

  // 기본 스타일
  return {
    mood: 'neutral',
    fontCategory: 'sans-serif',
    fontSize: 'large',
    fontWeight: 'bold',
    alignment: 'center',
  };
}

// =============================================================================
// Image Generator (apps/web/src/app/api/chat/route.ts handleTextRenderFinal 와 동일)
// =============================================================================

/**
 * 최종 이미지 생성 프롬프트를 구성합니다.
 * 웹앱의 buildTextRenderFinalPrompt() 함수와 동일한 로직.
 */
function buildTextRenderFinalPrompt(userPrompt, texts, style) {
  const textInfo =
    texts && texts.length > 0
      ? `\n## 포함할 텍스트\n${texts.map((t, i) => `${i + 1}. "${t.content}" (역할: ${t.role})`).join('\n')}`
      : '';

  const styleInfo = style
    ? `\n## 스타일 가이드\n- 분위기: ${style.mood || '기본'}\n- 폰트 스타일: ${style.fontCategory || 'sans-serif'}\n- 크기: ${style.fontSize || 'medium'}\n- 정렬: ${style.alignment || 'center'}`
    : '';

  return `당신은 전문 이미지 생성 AI입니다. 사용자의 요청에 맞는 이미지를 생성합니다.
${textInfo}
${styleInfo}

## 중요 지침
1. 첫 번째 참조 이미지가 렌더링된 텍스트 이미지라면, 이 텍스트를 이미지에 자연스럽게 통합해주세요.
2. 텍스트가 이미지의 맥락에 맞게 배치되어야 합니다.
3. 텍스트의 가독성을 유지하면서도 디자인적으로 조화롭게 만들어주세요.
4. 텍스트를 다시 그리지 마세요 — 참조 이미지의 텍스트를 그대로 사용합니다.

## 사용자 요청
${userPrompt}`;
}

/**
 * 프리렌더링된 텍스트 PNG를 Gemini에 인풋으로 넣어서 최종 이미지를 생성합니다.
 * 웹앱의 handleTextRenderFinal → generateImage 호출과 동일한 로직.
 */
async function generateFinalImage({
  userPrompt,
  renderedImagePath,
  texts,
  style,
  referenceImages = [],
  model: requestModel,
  aspectRatio,
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY 환경변수가 필요합니다.');
  }

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);

  const modelName = requestModel || process.env.GEMINI_IMAGE_MODEL || 'gemini-3-pro-image-preview';

  // generationConfig — 웹앱의 client.ts와 동일
  const generationConfig = {
    responseModalities: ['TEXT', 'IMAGE'],
  };

  const model = genAI.getGenerativeModel({ model: modelName, generationConfig });

  // 프롬프트 구성 — 웹앱의 buildTextRenderFinalPrompt와 동일
  const composedPrompt = buildTextRenderFinalPrompt(userPrompt, texts, style);

  // 이미지 parts 구성: 텍스트 렌더링 PNG(첫번째) + 참조 이미지들
  const parts = [];

  // 1. 프리렌더링된 텍스트 이미지 (첫 번째 참조)
  if (renderedImagePath && fs.existsSync(renderedImagePath)) {
    const imageBuffer = fs.readFileSync(renderedImagePath);
    parts.push({
      inlineData: {
        mimeType: 'image/png',
        data: imageBuffer.toString('base64'),
      },
    });
  }

  // 2. 추가 참조 이미지들
  for (const refImg of referenceImages) {
    if (refImg.path && fs.existsSync(refImg.path)) {
      const buf = fs.readFileSync(refImg.path);
      const mimeType = refImg.path.endsWith('.png') ? 'image/png'
        : refImg.path.endsWith('.jpg') || refImg.path.endsWith('.jpeg') ? 'image/jpeg'
        : 'image/png';
      parts.push({ inlineData: { mimeType, data: buf.toString('base64') } });
    } else if (refImg.base64) {
      parts.push({ inlineData: { mimeType: refImg.mimeType || 'image/png', data: refImg.base64 } });
    }
  }

  // 3. 텍스트 프롬프트
  parts.push({ text: composedPrompt });

  // Gemini API 호출
  const result = await model.generateContent({
    contents: [{ role: 'user', parts }],
  });

  const response = result.response;

  // 응답에서 이미지 추출 — 웹앱의 parseGeminiResponse와 동일
  let generatedImageBase64 = null;
  let generatedImageMimeType = null;
  let responseText = null;

  if (response.candidates && response.candidates.length > 0) {
    const candidate = response.candidates[0];
    if (candidate.content && candidate.content.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          generatedImageBase64 = part.inlineData.data;
          generatedImageMimeType = part.inlineData.mimeType;
        } else if (part.text) {
          responseText = part.text;
        }
      }
    }
  }

  return {
    imageBase64: generatedImageBase64,
    imageMimeType: generatedImageMimeType,
    text: responseText,
  };
}

// =============================================================================
// CLI
// =============================================================================

function printUsage() {
  console.error(`
다국어 텍스트 프리렌더링 CLI (웹앱과 동일한 파이프라인)

사용법:
  node render.mjs detect   "욎홎 뙤앾뼡이라는 지역 축제 포스터 만들어줘"
  node render.mjs analyze  "욎홎 뙤앾뼡이라는 지역 축제 포스터 만들어줘"
  node render.mjs render   --json '{"texts":[...],"style":{...}}' --output out.png
  node render.mjs generate --prompt "축제 포스터" --rendered /tmp/text.png --output /tmp/final.png
  node render.mjs pipeline "욎홎 뙤앾뼡이라는 지역 축제 포스터 만들어줘" --output /tmp/final.png

명령어:
  detect   <text>  텍스트의 스크립트를 감지하고 렌더링 필요 여부를 반환합니다.
  analyze  <text>  Gemini LLM으로 프롬프트를 분석하여 텍스트와 스타일을 추출합니다.
  render           분석 결과 JSON을 받아 텍스트를 Canvas로 PNG 프리렌더링합니다.
  generate         프리렌더링 PNG를 Gemini에 인풋으로 넣어 최종 이미지를 생성합니다.
  pipeline <text>  detect → analyze → render → generate 전체를 한 번에 실행합니다.

analyze 옵션:
  --context <text>    추가 맥락 (선택사항)

render 옵션:
  --json <json>       인라인 JSON 입력
  --input <file>      JSON 파일 경로
  --output <file>     출력 PNG 파일 경로
  --no-base64         stdout에 base64를 포함하지 않음

generate 옵션:
  --prompt <text>     사용자 원본 프롬프트
  --rendered <file>   프리렌더링된 텍스트 PNG 경로
  --analysis <json>   analyze 결과 JSON (texts/style 포함)
  --ref <file>        추가 참조 이미지 (여러 개 가능)
  --model <name>      Gemini 이미지 모델 (기본: gemini-3-pro-image-preview)
  --output <file>     최종 이미지 출력 경로
  --no-base64         stdout에 base64를 포함하지 않음

pipeline 옵션:
  --output <file>     최종 이미지 출력 경로
  --ref <file>        추가 참조 이미지 (여러 개 가능)
  --model <name>      Gemini 이미지 모델
  --render-only       generate 단계 건너뛰기 (Canvas 렌더링까지만)
  --no-base64         stdout에 base64를 포함하지 않음

환경 변수:
  GEMINI_API_KEY      Gemini API 키 (analyze/generate/pipeline에서 필요)
  GEMINI_IMAGE_MODEL  이미지 생성 모델 (기본: gemini-3-pro-image-preview)
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  // ── detect 명령어 ──
  if (command === 'detect') {
    const text = args.slice(1).join(' ');
    if (!text) {
      console.error('Error: 텍스트를 입력해주세요.');
      console.error('사용법: node render.mjs detect "안녕하세요 Hello"');
      process.exit(1);
    }
    const scripts = detectScripts(text);
    const needsRendering = hasNonLatinScript(text);
    const primaryScript = scripts.find((s) => s.script !== 'unknown')?.script || 'latin';

    console.log(
      JSON.stringify({
        text,
        scripts,
        primaryScript,
        language: scriptToLanguage(primaryScript),
        needsRendering,
      })
    );
    return;
  }

  // ── analyze 명령어 (Gemini LLM 프롬프트 분석) ──
  if (command === 'analyze') {
    let prompt = '';
    let context = '';
    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--context' && i + 1 < args.length) {
        context = args[++i];
      } else if (!args[i].startsWith('--')) {
        prompt += (prompt ? ' ' : '') + args[i];
      }
    }
    if (!prompt) {
      console.error('Error: 프롬프트를 입력해주세요.');
      console.error('사용법: node render.mjs analyze "욎홎 뙤앾뼡 지역 축제 포스터 만들어줘"');
      process.exit(1);
    }

    const analysis = await analyzePrompt(prompt, context || undefined);
    console.log(JSON.stringify(analysis, null, 2));
    return;
  }

  // ── render 명령어 ──
  if (command === 'render') {
    const opts = {};
    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--json' && i + 1 < args.length) opts.json = args[++i];
      else if (args[i] === '--input' && i + 1 < args.length) opts.input = args[++i];
      else if (args[i] === '--output' && i + 1 < args.length) opts.output = args[++i];
      else if (args[i] === '--no-base64') opts.noBase64 = true;
    }

    // 입력 파싱
    let input;
    try {
      if (opts.json) {
        input = JSON.parse(opts.json);
      } else if (opts.input) {
        input = JSON.parse(fs.readFileSync(opts.input, 'utf-8'));
      } else {
        console.error('Error: --json 또는 --input 옵션이 필요합니다.');
        printUsage();
        process.exit(1);
      }
    } catch (e) {
      console.error(`Error: JSON 파싱 실패 - ${e.message}`);
      process.exit(1);
    }

    // 폰트 초기화
    const fontResult = initializeFonts();
    if (fontResult.registered === 0) {
      console.log(
        JSON.stringify({
          success: false,
          error:
            '폰트를 찾을 수 없습니다. "node setup.mjs"를 실행하여 폰트를 설치해주세요.',
          searchedDirs: getFontsDirs(),
        })
      );
      process.exit(1);
    }

    // 렌더링 실행
    const result = render(input);

    // 파일 출력
    const outputPath =
      opts.output || path.join(os.tmpdir(), `text-render-${Date.now()}.png`);
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(outputPath, result.buffer);

    // JSON 결과 출력
    const response = {
      success: true,
      outputPath: path.resolve(outputPath),
      width: result.width,
      height: result.height,
      mimeType: result.mimeType,
      sizeBytes: result.buffer.length,
    };

    if (!opts.noBase64) {
      response.base64 = result.buffer.toString('base64');
    }

    console.log(JSON.stringify(response));
    return;
  }

  // ── generate 명령어 (프리렌더링 PNG → Gemini 이미지 생성) ──
  if (command === 'generate') {
    const opts = { refs: [] };
    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--prompt' && i + 1 < args.length) opts.prompt = args[++i];
      else if (args[i] === '--rendered' && i + 1 < args.length) opts.rendered = args[++i];
      else if (args[i] === '--analysis' && i + 1 < args.length) opts.analysis = args[++i];
      else if (args[i] === '--ref' && i + 1 < args.length) opts.refs.push(args[++i]);
      else if (args[i] === '--model' && i + 1 < args.length) opts.model = args[++i];
      else if (args[i] === '--output' && i + 1 < args.length) opts.output = args[++i];
      else if (args[i] === '--no-base64') opts.noBase64 = true;
    }

    if (!opts.prompt) {
      console.error('Error: --prompt 옵션이 필요합니다.');
      printUsage();
      process.exit(1);
    }

    // analysis JSON 파싱 (texts, style 추출)
    let texts = [];
    let style = {};
    if (opts.analysis) {
      try {
        const analysisData = JSON.parse(opts.analysis);
        texts = analysisData.texts || [];
        style = analysisData.style || {};
      } catch {
        // analysis가 파일 경로일 수 있음
        try {
          const analysisData = JSON.parse(fs.readFileSync(opts.analysis, 'utf-8'));
          texts = analysisData.texts || [];
          style = analysisData.style || {};
        } catch (e2) {
          console.error(`Error: analysis JSON 파싱 실패 - ${e2.message}`);
        }
      }
    }

    try {
      const result = await generateFinalImage({
        userPrompt: opts.prompt,
        renderedImagePath: opts.rendered,
        texts,
        style,
        referenceImages: opts.refs.map((r) => ({ path: r })),
        model: opts.model,
      });

      // 이미지 저장
      const response = { success: false };

      if (result.imageBase64) {
        const ext = result.imageMimeType === 'image/jpeg' ? '.jpg' : '.png';
        const outputPath = opts.output || path.join(os.tmpdir(), `final-image-${Date.now()}${ext}`);
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        const imgBuffer = Buffer.from(result.imageBase64, 'base64');
        fs.writeFileSync(outputPath, imgBuffer);

        response.success = true;
        response.outputPath = path.resolve(outputPath);
        response.mimeType = result.imageMimeType;
        response.sizeBytes = imgBuffer.length;
        response.text = result.text;

        if (!opts.noBase64) {
          response.base64 = result.imageBase64;
        }
      } else {
        response.error = '이미지가 생성되지 않았습니다.';
        response.text = result.text;
      }

      console.log(JSON.stringify(response, null, 2));
    } catch (e) {
      console.log(JSON.stringify({ success: false, error: e.message }));
      process.exit(1);
    }
    return;
  }

  // ── pipeline 명령어 (detect → analyze → render → generate 전체) ──
  if (command === 'pipeline') {
    let prompt = '';
    const opts = { refs: [] };
    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--output' && i + 1 < args.length) opts.output = args[++i];
      else if (args[i] === '--ref' && i + 1 < args.length) opts.refs.push(args[++i]);
      else if (args[i] === '--model' && i + 1 < args.length) opts.model = args[++i];
      else if (args[i] === '--render-only') opts.renderOnly = true;
      else if (args[i] === '--no-base64') opts.noBase64 = true;
      else if (!args[i].startsWith('--')) {
        prompt += (prompt ? ' ' : '') + args[i];
      }
    }
    if (!prompt) {
      console.error('Error: 프롬프트를 입력해주세요.');
      console.error('사용법: node render.mjs pipeline "욎홎 뙤앾뼡 축제 포스터" --output out.png');
      process.exit(1);
    }

    const pipelineResult = {};

    // Step 1: detect
    const scripts = detectScripts(prompt);
    const needsRendering = hasNonLatinScript(prompt);
    const primaryScript = scripts.find((s) => s.script !== 'unknown')?.script || 'latin';
    pipelineResult.detect = {
      scripts,
      primaryScript,
      language: scriptToLanguage(primaryScript),
      needsRendering,
    };

    if (!needsRendering) {
      pipelineResult.skipped = true;
      pipelineResult.reason = '비라틴 문자가 감지되지 않아 프리렌더링을 건너뜁니다.';
      console.log(JSON.stringify(pipelineResult, null, 2));
      return;
    }

    // Step 2: analyze (Gemini LLM)
    const analysis = await analyzePrompt(prompt);
    pipelineResult.analyze = analysis;

    if (!analysis.needsRendering || analysis.texts.length === 0) {
      pipelineResult.skipped = true;
      pipelineResult.reason = '분석 결과 렌더링할 텍스트가 없습니다.';
      console.log(JSON.stringify(pipelineResult, null, 2));
      return;
    }

    // Step 3: render (Canvas 프리렌더링)
    const fontResult = initializeFonts();
    if (fontResult.registered === 0) {
      pipelineResult.render = {
        success: false,
        error: '폰트를 찾을 수 없습니다. "node setup.mjs"를 실행해주세요.',
      };
      console.log(JSON.stringify(pipelineResult, null, 2));
      process.exit(1);
    }

    const renderInput = {
      texts: analysis.texts,
      style: analysis.style,
      layoutHint: analysis.layoutHint,
    };
    const renderResult = render(renderInput);

    const renderedPath = path.join(os.tmpdir(), `text-render-${Date.now()}.png`);
    fs.writeFileSync(renderedPath, renderResult.buffer);

    pipelineResult.render = {
      success: true,
      outputPath: path.resolve(renderedPath),
      width: renderResult.width,
      height: renderResult.height,
      mimeType: renderResult.mimeType,
      sizeBytes: renderResult.buffer.length,
    };

    // --render-only면 여기서 종료
    if (opts.renderOnly) {
      // 최종 출력 위치로 복사
      if (opts.output) {
        const outDir = path.dirname(opts.output);
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        fs.copyFileSync(renderedPath, opts.output);
        pipelineResult.render.outputPath = path.resolve(opts.output);
      }
      if (!opts.noBase64) {
        pipelineResult.render.base64 = renderResult.buffer.toString('base64');
      }
      console.log(JSON.stringify(pipelineResult, null, 2));
      return;
    }

    // Step 4: generate (Gemini 이미지 생성)
    try {
      const genResult = await generateFinalImage({
        userPrompt: prompt,
        renderedImagePath: renderedPath,
        texts: analysis.texts,
        style: analysis.style,
        referenceImages: opts.refs.map((r) => ({ path: r })),
        model: opts.model,
      });

      if (genResult.imageBase64) {
        const ext = genResult.imageMimeType === 'image/jpeg' ? '.jpg' : '.png';
        const finalPath = opts.output || path.join(os.tmpdir(), `final-image-${Date.now()}${ext}`);
        const finalDir = path.dirname(finalPath);
        if (!fs.existsSync(finalDir)) fs.mkdirSync(finalDir, { recursive: true });

        const imgBuffer = Buffer.from(genResult.imageBase64, 'base64');
        fs.writeFileSync(finalPath, imgBuffer);

        pipelineResult.generate = {
          success: true,
          outputPath: path.resolve(finalPath),
          mimeType: genResult.imageMimeType,
          sizeBytes: imgBuffer.length,
          text: genResult.text,
        };

        if (!opts.noBase64) {
          pipelineResult.generate.base64 = genResult.imageBase64;
        }
      } else {
        pipelineResult.generate = {
          success: false,
          error: '이미지가 생성되지 않았습니다.',
          text: genResult.text,
        };
      }
    } catch (e) {
      pipelineResult.generate = {
        success: false,
        error: e.message,
      };
    }

    console.log(JSON.stringify(pipelineResult, null, 2));
    return;
  }

  // ── 알 수 없는 명령어 ──
  printUsage();
  process.exit(1);
}

main().catch((e) => {
  console.error(`Error: ${e.message || e}`);
  process.exit(1);
});
