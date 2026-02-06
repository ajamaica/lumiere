#!/usr/bin/env node

/**
 * text-preserve 스킬 셋업 스크립트
 *
 * 1. npm 의존성 설치 (canvas)
 * 2. 폰트 파일 준비 (모노레포에서 복사 또는 다운로드)
 *
 * 사용법:
 *   node setup.mjs
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FONTS_DIR = path.join(__dirname, 'fonts');
const MONOREPO_FONTS_DIR = path.join(__dirname, '..', '..', 'apps', 'web', 'public', 'fonts');

const REQUIRED_FONTS = [
  'NotoSansKR-Regular.ttf',
  'NotoSansKR-Bold.ttf',
  'NotoSansJP-Regular.ttf',
  'NotoSansJP-Bold.ttf',
  'NotoSansSC-Regular.ttf',
  'NotoSansThai-Regular.ttf',
  'Inter-Regular.ttf',
];

// Google Fonts에서 폰트를 다운로드할 수 있는 URL 매핑
// (모노레포 외부에서 사용 시)
const FONT_DOWNLOAD_URLS = {
  'NotoSansKR-Regular.ttf':
    'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/alternative/NotoSansKR-Regular.ttf',
  'NotoSansKR-Bold.ttf':
    'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/alternative/NotoSansKR-Bold.ttf',
  'Inter-Regular.ttf':
    'https://cdn.jsdelivr.net/gh/rsms/inter@v4.0/docs/font-files/Inter-Regular.ttf',
};

function log(msg) {
  console.log(`[setup] ${msg}`);
}

function logOk(msg) {
  console.log(`[setup] ✅ ${msg}`);
}

function logWarn(msg) {
  console.log(`[setup] ⚠️  ${msg}`);
}

function logErr(msg) {
  console.error(`[setup] ❌ ${msg}`);
}

// ── 1. npm 의존성 설치 ──
function installDeps() {
  log('npm 의존성 확인 중...');

  const nodeModulesCanvas = path.join(__dirname, 'node_modules', 'canvas');
  if (fs.existsSync(nodeModulesCanvas)) {
    logOk('canvas 패키지 이미 설치됨');
    return;
  }

  log('canvas 패키지 설치 중... (prebuilt binary 다운로드)');
  try {
    execSync('npm install', { cwd: __dirname, stdio: 'inherit' });
    logOk('npm install 완료');
  } catch (error) {
    logErr(`npm install 실패: ${error.message}`);
    log('수동으로 실행해주세요: cd skills/text-preserve && npm install');
    process.exit(1);
  }
}

// ── 2. 폰트 파일 준비 ──
function setupFonts() {
  log('폰트 파일 확인 중...');

  // fonts 디렉토리가 이미 있고 모든 폰트가 있으면 스킵
  if (fs.existsSync(FONTS_DIR)) {
    const existing = REQUIRED_FONTS.filter((f) => fs.existsSync(path.join(FONTS_DIR, f)));
    if (existing.length === REQUIRED_FONTS.length) {
      logOk(`모든 폰트 파일 확인됨 (${existing.length}개)`);
      return;
    }
    log(`${existing.length}/${REQUIRED_FONTS.length}개 폰트 발견, 나머지 복사 중...`);
  } else {
    fs.mkdirSync(FONTS_DIR, { recursive: true });
  }

  // 모노레포에서 복사 시도
  if (fs.existsSync(MONOREPO_FONTS_DIR)) {
    log(`모노레포 폰트 디렉토리 발견: ${MONOREPO_FONTS_DIR}`);
    let copied = 0;
    for (const fontFile of REQUIRED_FONTS) {
      const src = path.join(MONOREPO_FONTS_DIR, fontFile);
      const dst = path.join(FONTS_DIR, fontFile);
      if (fs.existsSync(dst)) continue;
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dst);
        copied++;
      } else {
        logWarn(`모노레포에서 찾을 수 없음: ${fontFile}`);
      }
    }
    if (copied > 0) logOk(`${copied}개 폰트 복사 완료`);
  } else {
    logWarn('모노레포 폰트 디렉토리를 찾을 수 없습니다.');
    log('폰트를 다운로드합니다...');
    downloadFonts();
  }

  // 최종 확인
  const finalCheck = REQUIRED_FONTS.filter((f) => fs.existsSync(path.join(FONTS_DIR, f)));
  const missing = REQUIRED_FONTS.filter((f) => !fs.existsSync(path.join(FONTS_DIR, f)));

  logOk(`폰트 준비 완료: ${finalCheck.length}/${REQUIRED_FONTS.length}개`);
  if (missing.length > 0) {
    logWarn(`누락된 폰트 (수동 다운로드 필요):`);
    for (const f of missing) {
      log(`  - ${f}`);
      log(`    Google Fonts에서 다운로드: https://fonts.google.com/noto`);
      log(`    저장 위치: ${path.join(FONTS_DIR, f)}`);
    }
  }
}

async function downloadFonts() {
  for (const fontFile of REQUIRED_FONTS) {
    const dst = path.join(FONTS_DIR, fontFile);
    if (fs.existsSync(dst)) continue;

    const url = FONT_DOWNLOAD_URLS[fontFile];
    if (!url) {
      logWarn(`다운로드 URL 없음: ${fontFile} (수동 다운로드 필요)`);
      log(`  Google Fonts에서 다운로드: https://fonts.google.com/noto`);
      log(`  저장 위치: ${dst}`);
      continue;
    }

    log(`다운로드 중: ${fontFile}...`);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(dst, buffer);
      logOk(`다운로드 완료: ${fontFile} (${(buffer.length / 1024 / 1024).toFixed(1)}MB)`);
    } catch (error) {
      logWarn(`다운로드 실패: ${fontFile} - ${error.message}`);
      log(`  수동으로 다운로드해주세요: ${url}`);
      log(`  저장 위치: ${dst}`);
    }
  }
}

// ── 3. 검증 ──
function verify() {
  log('');
  log('=== 설치 검증 ===');

  // canvas 확인
  try {
    const { createCanvas } = await import('canvas');
    const c = createCanvas(10, 10);
    c.getContext('2d');
    logOk('canvas 패키지 정상 동작');
  } catch (e) {
    logErr(`canvas 패키지 오류: ${e.message}`);
    return false;
  }

  // 폰트 확인
  const fontsOk = REQUIRED_FONTS.every((f) => fs.existsSync(path.join(FONTS_DIR, f)));
  if (fontsOk) {
    logOk('모든 폰트 파일 확인됨');
  } else {
    logWarn('일부 폰트가 누락되었습니다 (기본 폰트로 대체됩니다)');
  }

  log('');
  // Gemini SDK 확인
  try {
    await import('@google/generative-ai');
    logOk('@google/generative-ai 패키지 정상 로드');
  } catch {
    logWarn('@google/generative-ai 패키지 없음 — analyze 명령어에서 규칙 기반 fallback만 사용 가능');
  }

  // GEMINI_API_KEY 확인
  if (process.env.GEMINI_API_KEY) {
    logOk('GEMINI_API_KEY 환경변수 설정됨');
  } else {
    logWarn('GEMINI_API_KEY 환경변수 없음 — analyze 명령어에서 규칙 기반 fallback만 사용됩니다');
    log('  설정: export GEMINI_API_KEY="your-api-key"');
  }

  logOk('셋업 완료! 이제 render.mjs를 사용할 수 있습니다.');
  log('');
  log('사용 예시:');
  log('  node render.mjs detect  "안녕하세요 Hello"');
  log('  node render.mjs analyze "욎홎 뙤앾뼡 지역 축제 포스터 만들어줘"');
  log('  node render.mjs pipeline "축제 포스터" --output /tmp/test.png');
  log(
    '  node render.mjs render --json \'{"texts":[{"content":"안녕하세요","role":"headline","language":"ko","scripts":["hangul"]}],"style":{"fontCategory":"sans-serif","fontSize":"large","fontWeight":"bold","alignment":"center"}}\' --output /tmp/test.png'
  );
  return true;
}

// ── Main ──
async function main() {
  log('text-preserve 스킬 셋업 시작...');
  log('');

  installDeps();
  setupFonts();
  await verify();
}

main().catch((e) => {
  logErr(`셋업 실패: ${e.message}`);
  process.exit(1);
});
