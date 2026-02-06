---
name: lmstudio-subagents
description: "Reduces token usage from paid providers by offloading work to local LM Studio models. Use when: (1) Cutting costs—use local models for summarization, extraction, classification, rewriting, first-pass review, brainstorming when quality suffices, (2) Avoiding paid API calls for high-volume or repetitive tasks, (3) No extra model configuration—JIT loading and REST API work with existing LM Studio setup, (4) Local-only or privacy-sensitive work. Requires LM Studio 0.4+ with server (default :1234). No CLI required."
metadata: {"openclaw":{"requires":{},"tags":["local-model","local-llm","lm-studio","token-management","privacy","subagents"]}}
license: MIT
---

# LM Studio Models

Offload tasks to local models when quality suffices. Base URL: http://127.0.0.1:1234. Auth: `Authorization: Bearer lmstudio`. instance_id = `loaded_instances[].id` (same model can have multiple, e.g. `key` and `key:2`).

## Key Terms

- **model**: From GET models key; use in chat and optional load.
- **lm_studio_api_url**: Default http://127.0.0.1:1234 (paths /api/v1/...).
- **response_id** / **previous_response_id**: Chat returns response_id; pass as previous_response_id for stateful.
- **instance_id**: For unload, use only the value from GET /api/v1/models for that model: each `loaded_instances[].id`. Do not assume it equals the model key; with multiple instances ids can be like key:2. LM Studio docs: List (loaded_instances[].id), Unload (instance_id).

Trigger in frontmatter; below = implementation.

## Prerequisites

LM Studio 0.4+, server :1234, models on disk; load/unload via API (JIT optional); Node for script (curl ok).

## Quick start

Minimal path: list models, then one chat. Replace `<model>` with a key from GET /api/v1/models and `<task>` with the task text.

```bash
curl -s -H 'Authorization: Bearer lmstudio' http://127.0.0.1:1234/api/v1/models
node scripts/lmstudio-api.mjs <model> '<task>' --temperature=0.5 --max-output-tokens=200
```

Stateful multi-turn: pass `--previous-response-id=<id>` from the prior script output. Or use `--stateful` to persist response_id automatically. Optional `--log <path>` for request/response.

```bash
node scripts/lmstudio-api.mjs <model> 'First turn...' --previous-response-id=$ID1
node scripts/lmstudio-api.mjs <model> 'Second turn...' --previous-response-id=$ID2
```

## Complete Workflow

### Step 0: Preflight

GET <base>/api/v1/models; non-200 or connection error = server not ready.

```bash
exec command:"curl -s -o /dev/null -w '%{http_code}' -H 'Authorization: Bearer lmstudio' http://127.0.0.1:1234/api/v1/models"
```

### Step 1: List Models and Select

GET /api/v1/models to list models. Parse each entry: key, type, loaded_instances, max_context_length, capabilities. If a model already has loaded_instances.length > 0 and fits the task, skip to Step 5; otherwise pick a key for chat (and optional load in Step 3). Choose by task: vision -> capabilities.vision; embedding -> type=embedding; context -> max_context_length. Prefer already-loaded; prefer smaller for speed, larger for reasoning. Note loaded_instances[].id for optional unload later.

**Example — list models:**
```bash
exec command:"curl -s -H 'Authorization: Bearer lmstudio' http://127.0.0.1:1234/api/v1/models"
```

Parse models[] (key, type, loaded_instances, max_context_length, capabilities, params_string). If a model has loaded_instances.length > 0 and fits task, skip to Step 5; else pick key for chat (and optional load). Note loaded_instances[].id for optional unload.

### Step 2: Model Selection

Pick key from GET response; use as model in chat (optional load). Constraints: vision -> capabilities.vision; embedding -> type=embedding; context -> max_context_length. Prefer loaded (loaded_instances non-empty), smaller for speed/larger for reasoning; fallback primary. If unsure, use the first loaded instance for that key or the smallest loaded model that fits the task. Optional POST load; else JIT on first chat.

### Step 3: Load Model (optional)

Optional: POST /api/v1/models/load { model, context_length?, ... }. Or run scripts/load.mjs &lt;model&gt;. JIT: first chat loads; explicit load only for specific options.

### Step 4: Verify Loaded (optional)

If explicit load: GET models, confirm loaded_instances. If JIT: no verify; first chat returns model_instance_id, stats.model_load_time_seconds.

### Step 5: Call API

From the skill folder: node scripts/lmstudio-api.mjs &lt;model&gt; '&lt;task&gt;' [options].

```bash
exec command:"node scripts/lmstudio-api.mjs <model> '<task>' --temperature=0.7 --max-output-tokens=2000"
```

Stateful: add --previous-response-id=<response_id>. Curl: POST <base>/api/v1/chat, body model, input, store, temperature, max_output_tokens; optional previous_response_id. Parse: output (type message) -> content; response_id, model_instance_id, stats. Script outputs content, model_instance_id, response_id, usage.

### Step 6: Unload (optional)

For the model key you used: GET /api/v1/models, then for **each** `loaded_instances[].id` for that model, POST /api/v1/models/unload with body `{"instance_id": "<that id>"}`. Use the id from the response only (do not send the model key unless it exactly equals that id). Or run scripts/unload.mjs &lt;model_key&gt; (script does GET then unloads each instance id). Optional --unload-after (default off); use --keep to leave loaded. Unload only that model's instances. JIT+TTL auto-unload; explicit when needed.

```bash
# One unload per instance_id; repeat for each id in that model's loaded_instances
exec command:"curl -s -X POST http://127.0.0.1:1234/api/v1/models/unload -H 'Content-Type: application/json' -H 'Authorization: Bearer lmstudio' -d '{\"instance_id\": \"<instance_id>\"}'"
```

### Step 7: Verify unload (optional)

After unloading, confirm no instances remain for that model key. Run the jq check below; result must be `0`. If non-zero, unload the remaining instance_id(s) from that model and re-run the check. Do not infer from "model object exists"; the object still exists with an empty `loaded_instances` array.

```bash
exec command:"curl -s -H 'Authorization: Bearer lmstudio' http://127.0.0.1:1234/api/v1/models | jq '.models[]|select(.key==\"<model_key>\")|.loaded_instances|length'"
```

Expect output `0`. If not, unload remaining instance_ids and re-run.

## Error Handling

- Script retries on transient failure (2-3 attempts with backoff).
- Model not found -> pick another model from GET response.
- API/server errors -> GET models, check URL.
- Invalid output -> retry.
- Memory -> unload or smaller model.
- Unload fails -> instance_id must be exactly from GET /api/v1/models for that model's loaded_instances[].id (not the model key unless it matches).

## Copy-paste

Replace `<model>` with a key from GET /api/v1/models and `<task>` with the task text. Optional unload per Step 6 (instance_id from GET models for that key).

```bash
exec command:"curl -s -H 'Authorization: Bearer lmstudio' http://127.0.0.1:1234/api/v1/models"
exec command:"node scripts/lmstudio-api.mjs <model> '<task>' --temperature=0.7 --max-output-tokens=2000"
```

## LM Studio API Details

Helper/API: see Step 5. Output: content, model_instance_id, response_id, usage. Auth: Bearer lmstudio. List GET /api/v1/models. Load POST /api/v1/models/load (optional). Unload POST /api/v1/models/unload { instance_id }.

## Scripts

lmstudio-api.mjs: chat; options --stateful, --unload-after, --keep, --log &lt;path&gt;, --previous-response-id, --temperature, --max-output-tokens. load.mjs: load model by key. unload.mjs: unload by model key (all instances). test.mjs: smoke test (load, chat, unload one model).

## Notes

- LM Studio 0.4+.
- JIT (first chat loads; model_load_time_seconds in stats); stateful (response_id / previous_response_id).
