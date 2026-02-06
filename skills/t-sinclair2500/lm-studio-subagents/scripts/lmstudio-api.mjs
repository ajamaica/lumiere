#!/usr/bin/env node

/**
 * LM Studio v1 REST API (POST /api/v1/chat)
 * Usage: node scripts/lmstudio-api.mjs <model> '<task>' [--temperature=0.7] [--max-output-tokens=2000] [--previous-response-id=...] [--stateful] [--log=path] [--unload-after] [--keep] [--api-url=...]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const BASE_URL = process.env.LM_STUDIO_API_URL || 'http://127.0.0.1:1234';
const STATE_FILE = path.join(process.cwd(), '.lmstudio-state');
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
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
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = data.error?.message || data.message || `HTTP ${res.status}`;
    console.error(JSON.stringify({ error: `Unload failed: ${msg}`, type: 'unload_error' }));
  }
}

async function callLMStudioAPI(model, taskContent, options = {}) {
  const {
    temperature = 0.7,
    maxOutputTokens = 2000,
    previousResponseId = null,
    apiUrl = BASE_URL,
    logPath = null,
    unloadAfter = false,
    keep = false
  } = options;

  const url = `${apiUrl.replace(/\/$/, '')}/api/v1/chat`;
  const payload = {
    model,
    input: taskContent,
    store: true,
    temperature: parseFloat(temperature),
    max_output_tokens: parseInt(maxOutputTokens)
  };
  if (previousResponseId) payload.previous_response_id = previousResponseId;

  let lastError = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (logPath) {
        fs.writeFileSync(logPath, JSON.stringify({ request: payload, attempt }, null, 2) + '\n', { flag: 'a' });
      }
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer lmstudio'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (logPath) {
        fs.writeFileSync(logPath, JSON.stringify({ response: data, status: response.status }, null, 2) + '\n', { flag: 'a' });
      }

      if (!response.ok) {
        const errorMsg = data.error?.message || data.message || `HTTP ${response.status}`;
        const code = response.status;
        if (code === 404 || (errorMsg && /model|not found/i.test(errorMsg))) {
          console.error(JSON.stringify({ error: 'Model not found', detail: errorMsg, type: 'model_not_found' }));
          process.exit(1);
        }
        if (attempt < MAX_RETRIES && code >= 500) {
          lastError = errorMsg;
          await sleep(RETRY_DELAY_MS * attempt);
          continue;
        }
        console.error(JSON.stringify({ error: errorMsg, type: data.error?.type || 'api_error' }));
        process.exit(1);
      }

      if (!data.output || !Array.isArray(data.output)) {
        console.error(JSON.stringify({ error: 'Invalid API response structure', data }));
        process.exit(1);
      }

      const messages = data.output
        .filter(item => item.type === 'message')
        .map(item => item.content)
        .join('')
        .trim();
      const reasoning = data.output
        .filter(item => item.type === 'reasoning')
        .map(item => item.content)
        .join('')
        .trim();
      const content = (messages && messages.length > 0) ? messages : (reasoning || '');

      const result = {
        content,
        content_source: (messages && messages.length > 0) ? 'message' : 'reasoning',
        model_instance_id: data.model_instance_id || null,
        response_id: data.response_id || null,
        usage: data.stats ? {
          input_tokens: data.stats.input_tokens,
          total_output_tokens: data.stats.total_output_tokens,
          model_load_time_seconds: data.stats.model_load_time_seconds
        } : null
      };

      if (unloadAfter && !keep && result.model_instance_id) {
        await unloadInstance(result.model_instance_id, apiUrl);
      }

      return result;
    } catch (err) {
      lastError = err.message;
      const isNetwork = /fetch|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|network/i.test(err.message);
      if (isNetwork && attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }
      if (isNetwork) {
        console.error(JSON.stringify({ error: 'Server unreachable (is LM Studio running?)', detail: err.message, type: 'network_error' }));
      } else {
        console.error(JSON.stringify({ error: err.message, type: 'unexpected_error' }));
      }
      process.exit(1);
    }
  }
  console.error(JSON.stringify({ error: lastError || 'Request failed after retries', type: 'api_error' }));
  process.exit(1);
}

function readState() {
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeState(model, responseId) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify({ model, response_id: responseId }));
  } catch (err) {
    console.error(JSON.stringify({ error: `Could not write state: ${err.message}`, type: 'state_error' }));
  }
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && (path.resolve(process.cwd(), process.argv[1]) === __filename || process.argv[1] === __filename)) {
  const [model, taskContent, ...args] = process.argv.slice(2);

  if (!model || !taskContent) {
    console.error('Usage: node scripts/lmstudio-api.mjs <model> \'<task>\' [--temperature=0.7] [--max-output-tokens=2000] [--previous-response-id=...] [--stateful] [--log=path] [--unload-after] [--keep] [--api-url=...]');
    process.exit(1);
  }

  const options = { apiUrl: BASE_URL };
  let stateful = false;
  let unloadAfter = false;
  let keep = false;

  args.forEach(arg => {
    if (arg.startsWith('--temperature=')) options.temperature = arg.split('=')[1];
    else if (arg.startsWith('--max-output-tokens=')) options.maxOutputTokens = arg.split('=')[1];
    else if (arg.startsWith('--previous-response-id=')) options.previousResponseId = arg.split('=')[1];
    else if (arg === '--stateful') stateful = true;
    else if (arg.startsWith('--log=')) options.logPath = arg.slice(6);
    else if (arg === '--unload-after') unloadAfter = true;
    else if (arg === '--keep') keep = true;
    else if (arg.startsWith('--api-url=')) options.apiUrl = arg.split('=')[1];
  });

  options.unloadAfter = unloadAfter;
  options.keep = keep;

  if (stateful && !options.previousResponseId) {
    const state = readState();
    if (state?.response_id && (state.model == null || state.model === model)) {
      options.previousResponseId = state.response_id;
    }
  }

  callLMStudioAPI(model, taskContent, options).then(result => {
    if (stateful && result.response_id) {
      writeState(model, result.response_id);
    }
    console.log(JSON.stringify(result));
  }).catch(err => {
    console.error(JSON.stringify({ error: err.message, type: 'unexpected_error' }));
    process.exit(1);
  });
}

export { callLMStudioAPI };
