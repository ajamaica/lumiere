#!/usr/bin/env node
/**
 * Generate images via xAI's Grok Imagine API.
 */
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';
import { parseArgs } from 'util';

const slugify = (text) => {
  return text.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'image';
};

const defaultOutDir = () => {
  const now = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const preferred = join(homedir(), 'Projects', 'tmp');
  const base = existsSync(preferred) ? preferred : './tmp';
  mkdirSync(base, { recursive: true });
  return join(base, `grok-imagine-${now}`);
};

const requestImage = async (apiKey, prompt, model, inputImage) => {
  const url = inputImage 
    ? 'https://api.x.ai/v1/images/edits'
    : 'https://api.x.ai/v1/images/generations';
  
  const payload = { model, prompt, n: 1 };
  
  if (inputImage) {
    const fs = await import('fs');
    const imageData = fs.readFileSync(inputImage);
    payload.image = imageData.toString('base64');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'grok-imagine/1.0',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`xAI Images API failed (${response.status}): ${error}`);
  }

  return response.json();
};

const downloadImage = async (url, filepath) => {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'grok-imagine/1.0' },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to download image (${response.status})`);
  }
  
  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(filepath, buffer);
};

const writeGallery = (outDir, items) => {
  const thumbs = items.map(it => `
<figure>
  <a href="${it.file}"><img src="${it.file}" loading="lazy" /></a>
  <figcaption>${it.prompt}</figcaption>
</figure>`).join('\n');

  const html = `<!doctype html>
<meta charset="utf-8" />
<title>grok-imagine</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 24px; font: 14px/1.4 ui-sans-serif, system-ui; background: #0b0f14; color: #e8edf2; }
  h1 { font-size: 18px; margin: 0 0 16px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
  figure { margin: 0; padding: 12px; border: 1px solid #1e2a36; border-radius: 14px; background: #0f1620; }
  img { width: 100%; height: auto; border-radius: 10px; display: block; }
  figcaption { margin-top: 10px; color: #b7c2cc; }
  code { color: #9cd1ff; }
</style>
<h1>🎨 grok-imagine</h1>
<p>Output: <code>${outDir}</code></p>
<div class="grid">
${thumbs}
</div>
`;
  writeFileSync(join(outDir, 'index.html'), html);
};

const main = async () => {
  const { values } = parseArgs({
    options: {
      prompt: { type: 'string', short: 'p' },
      count: { type: 'string', short: 'n', default: '1' },
      model: { type: 'string', short: 'm', default: 'grok-imagine-image' },
      input: { type: 'string', short: 'i' },
      'out-dir': { type: 'string', short: 'o' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: true,
  });

  if (values.help || !values.prompt) {
    console.log(`Usage: gen.mjs --prompt "description" [options]

Options:
  -p, --prompt    Image description (required)
  -n, --count     Number of images (default: 1)
  -m, --model     Model id (default: grok-imagine-image)
  -i, --input     Input image for editing
  -o, --out-dir   Output directory
  -h, --help      Show this help`);
    process.exit(values.help ? 0 : 1);
  }

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    console.error('Missing XAI_API_KEY');
    process.exit(2);
  }

  const outDir = values['out-dir'] ? resolve(values['out-dir']) : defaultOutDir();
  mkdirSync(outDir, { recursive: true });

  const count = parseInt(values.count, 10);
  const items = [];

  for (let idx = 1; idx <= count; idx++) {
    console.log(`[${idx}/${count}] ${values.prompt}`);
    
    const res = await requestImage(
      apiKey,
      values.prompt,
      values.model,
      values.input || null,
    );

    const data = res.data?.[0];
    const imageB64 = data?.b64_json;
    const imageUrl = data?.url;

    if (!imageB64 && !imageUrl) {
      throw new Error(`Unexpected response: ${JSON.stringify(res).slice(0, 400)}`);
    }

    const filename = `${String(idx).padStart(3, '0')}-${slugify(values.prompt)}.png`;
    const filepath = join(outDir, filename);

    if (imageB64) {
      writeFileSync(filepath, Buffer.from(imageB64, 'base64'));
    } else {
      await downloadImage(imageUrl, filepath);
    }

    items.push({ prompt: values.prompt, file: filename });
    
    // MEDIA line for OpenClaw auto-attach
    console.log(`MEDIA: ${resolve(filepath)}`);
  }

  writeFileSync(join(outDir, 'prompts.json'), JSON.stringify(items, null, 2));
  writeGallery(outDir, items);
  console.log(`\nWrote: ${join(outDir, 'index.html')}`);
};

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
