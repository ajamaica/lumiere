#!/usr/bin/env node

/**
 * Unload all instances for a model key via LM Studio GET models + POST unload.
 * instance_id for unload must be from loaded_instances[].id (List response), not the model key.
 * Usage: node scripts/unload.mjs <model_key> [--api-url=http://127.0.0.1:1234]
 */

const BASE_URL = process.env.LM_STUDIO_API_URL || 'http://127.0.0.1:1234';

async function getModels(apiUrl) {
  const url = `${apiUrl.replace(/\/$/, '')}/api/v1/models`;
  const res = await fetch(url, {
    headers: { 'Authorization': 'Bearer lmstudio' }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET models failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function unloadInstance(instanceId, apiUrl) {
  const url = `${apiUrl.replace(/\/$/, '')}/api/v1/models/unload`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer lmstudio'
    },
    body: JSON.stringify({ instance_id: instanceId })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error?.message || data.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
}

async function unloadModel(modelKey, apiUrl = BASE_URL) {
  const data = await getModels(apiUrl);
  const model = data.models?.find(m => m.key === modelKey);
  if (!model) {
    console.error(JSON.stringify({ error: `Model not found: ${modelKey}`, type: 'model_not_found' }));
    process.exit(1);
  }
  const instances = model.loaded_instances || [];
  if (instances.length === 0) {
    return;
  }
  for (const inst of instances) {
    const id = inst.id ?? inst;
    await unloadInstance(id, apiUrl);
  }
}

const [modelKey, ...args] = process.argv.slice(2);
let apiUrl = BASE_URL;
args.forEach(arg => {
  if (arg.startsWith('--api-url=')) apiUrl = arg.split('=')[1];
});

if (!modelKey) {
  console.error('Usage: node scripts/unload.mjs <model_key> [--api-url=...]');
  process.exit(1);
}

unloadModel(modelKey, apiUrl).then(() => process.exit(0)).catch(err => {
  console.error(JSON.stringify({ error: err.message, type: 'unload_error' }));
  process.exit(1);
});
