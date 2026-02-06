#!/usr/bin/env node

/**
 * Smoke test: load one model, run one chat, unload. Exit 0 if all succeed.
 * Usage: node scripts/test.mjs [model_key] [--api-url=...]
 * If model_key omitted, uses first model from GET /api/v1/models.
 */

const BASE_URL = process.env.LM_STUDIO_API_URL || 'http://127.0.0.1:1234';

async function getModels(apiUrl) {
  const url = `${apiUrl.replace(/\/$/, '')}/api/v1/models`;
  const res = await fetch(url, { headers: { 'Authorization': 'Bearer lmstudio' } });
  if (!res.ok) throw new Error(`GET models failed: ${res.status}`);
  return res.json();
}

async function loadModel(model, apiUrl) {
  const url = `${apiUrl.replace(/\/$/, '')}/api/v1/models/load`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer lmstudio' },
    body: JSON.stringify({ model })
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error?.message || d.message || `Load failed: ${res.status}`);
  }
}

async function chat(model, apiUrl) {
  const url = `${apiUrl.replace(/\/$/, '')}/api/v1/chat`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer lmstudio' },
    body: JSON.stringify({
      model,
      input: 'Reply with exactly: OK',
      store: true,
      temperature: 0,
      max_output_tokens: 10
    })
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error?.message || d.message || `Chat failed: ${res.status}`);
  }
  const data = await res.json();
  if (!data.output || !Array.isArray(data.output)) throw new Error('Invalid chat response');
  return data.model_instance_id;
}

async function unloadInstance(instanceId, apiUrl) {
  const url = `${apiUrl.replace(/\/$/, '')}/api/v1/models/unload`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer lmstudio' },
    body: JSON.stringify({ instance_id: instanceId })
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error?.message || d.message || `Unload failed: ${res.status}`);
  }
}

async function run() {
  const args = process.argv.slice(2);
  let apiUrl = BASE_URL;
  let modelKey = process.env.MODEL || null;
  args.forEach(arg => {
    if (arg.startsWith('--api-url=')) apiUrl = arg.split('=')[1];
    else if (!arg.startsWith('--')) modelKey = arg;
  });

  const data = await getModels(apiUrl);
  const models = data.models || [];
  if (models.length === 0) {
    console.error('No models found');
    process.exit(1);
  }
  const model = modelKey || models[0].key;
  const found = models.find(m => m.key === model);
  if (!found) {
    console.error(`Model not found: ${model}`);
    process.exit(1);
  }

  await loadModel(model, apiUrl);
  const instanceId = await chat(model, apiUrl);
  if (instanceId) await unloadInstance(instanceId, apiUrl);
  console.log('OK');
}

run().catch(err => {
  console.error(err.message);
  process.exit(1);
});
