#!/usr/bin/env node

/**
 * Load a model by key via LM Studio POST /api/v1/models/load
 * Usage: node scripts/load.mjs <model> [--api-url=http://127.0.0.1:1234]
 */

const BASE_URL = process.env.LM_STUDIO_API_URL || 'http://127.0.0.1:1234';

async function loadModel(model, apiUrl = BASE_URL) {
  const url = `${apiUrl.replace(/\/$/, '')}/api/v1/models/load`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer lmstudio'
    },
    body: JSON.stringify({ model })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error?.message || data.message || `HTTP ${res.status}`;
    console.error(JSON.stringify({ error: msg, type: 'load_error' }));
    process.exit(1);
  }
  return data;
}

const [model, ...args] = process.argv.slice(2);
let apiUrl = BASE_URL;
args.forEach(arg => {
  if (arg.startsWith('--api-url=')) apiUrl = arg.split('=')[1];
});

if (!model) {
  console.error('Usage: node scripts/load.mjs <model> [--api-url=...]');
  process.exit(1);
}

loadModel(model, apiUrl).then(() => process.exit(0)).catch(err => {
  console.error(JSON.stringify({ error: err.message, type: 'load_error' }));
  process.exit(1);
});
