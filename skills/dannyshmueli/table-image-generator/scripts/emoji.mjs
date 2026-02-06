/**
 * emoji.mjs - Emoji detection and Twemoji SVG resolution
 * 
 * Detects emoji in text, fetches Twemoji SVGs, and provides
 * data URIs for embedding in SVG <image> elements.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, '.emoji-cache');

// Emoji regex - matches most common emoji (single + compound)
// Covers: emoticons, symbols, flags, skin tones, ZWJ sequences
const EMOJI_RE = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(\u200D(\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*/gu;

/**
 * Extract emoji from text, returning segments of text and emoji
 * @returns {Array<{type: 'text'|'emoji', value: string}>}
 */
export function segmentText(text) {
  const str = String(text);
  const segments = [];
  let lastIndex = 0;
  
  for (const match of str.matchAll(EMOJI_RE)) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: str.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'emoji', value: match[0] });
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < str.length) {
    segments.push({ type: 'text', value: str.slice(lastIndex) });
  }
  
  return segments;
}

/**
 * Convert emoji to Twemoji codepoint filename
 */
export function emojiToCodepoint(emoji) {
  return [...emoji]
    .map(c => c.codePointAt(0).toString(16))
    .filter(cp => cp !== 'fe0f') // Remove variation selector
    .join('-');
}

/**
 * Fetch a URL and return the body as string
 */
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const doFetch = (url, redirects = 0) => {
      if (redirects > 5) return reject(new Error('Too many redirects'));
      https.get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return doFetch(res.headers.location, redirects + 1);
        }
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    };
    doFetch(url);
  });
}

/**
 * Get Twemoji SVG content for an emoji (with local caching)
 */
export async function getEmojiSvg(emoji) {
  const cp = emojiToCodepoint(emoji);
  
  // Check cache first
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  const cachePath = join(CACHE_DIR, `${cp}.svg`);
  
  if (existsSync(cachePath)) {
    return readFileSync(cachePath, 'utf8');
  }
  
  // Fetch from Twemoji CDN
  const url = `https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/${cp}.svg`;
  try {
    const svg = await fetchUrl(url);
    writeFileSync(cachePath, svg);
    return svg;
  } catch (e) {
    // Fallback: return null (will render as text)
    return null;
  }
}

/**
 * Convert emoji SVG to a data URI
 */
export function svgToDataUri(svgContent) {
  const encoded = Buffer.from(svgContent).toString('base64');
  return `data:image/svg+xml;base64,${encoded}`;
}

/**
 * Check if text contains any emoji
 */
export function hasEmoji(text) {
  return EMOJI_RE.test(String(text));
}

/**
 * Pre-cache all emojis found in data
 */
export async function precacheEmojis(texts) {
  const emojis = new Set();
  for (const text of texts) {
    for (const match of String(text).matchAll(EMOJI_RE)) {
      emojis.add(match[0]);
    }
  }
  
  const cache = new Map();
  await Promise.all([...emojis].map(async (emoji) => {
    const svg = await getEmojiSvg(emoji);
    if (svg) cache.set(emoji, svgToDataUri(svg));
  }));
  
  return cache;
}
