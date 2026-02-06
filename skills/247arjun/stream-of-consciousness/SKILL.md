---
name: stream-of-consciousness
description: Export the entire conversation context into Open-Token format (including tools and optional internal traces) for agent collaboration, auditability, and reproducibility.
version: 0.1.0
---

# Open-Token Export (SKILL)

## Objective

When invoked, output the **entirety of the currently available conversation** in **Open-Token** format as a single export artifact, suitable for:

- agent handoff / continuation across runtimes and providers
- audit & incident review
- reproducibility and debugging
- provenance and diffing

The output MUST be machine-parseable and complete per the chosen mode.

## Invocation

Parse `$ARGUMENTS` as space-separated `key=value` pairs.

Supported options:

- `mode=json|ndjson`  
  Default: `json`

- `pretty=true|false`  
  Default: `true` for `json`; `false` for `ndjson`

- `include=visible-only|include-internal`  
  Default: `visible-only`

- `internal=redacted|summary|full`  
  Default: `redacted`  
  Meaning:
  - `redacted`: include internal events only as placeholders (no content)
  - `summary`: include brief summaries of internal traces (if available)
  - `full`: include internal traces verbatim (ONLY if available and permitted)

- `redact=none|secrets|pii|strict`  
  Default: `secrets`

- `max_bytes=<int>` (optional)  
  If present, apply truncation rules defined below.

### Availability rule for internal traces

If `include=include-internal` is requested but internal traces (hidden reasoning, hidden system routing, hidden intermediate tokens) are not available in the current runtime context, DO NOT fabricate them.

In that case:

- set `conversation.internal_availability="unavailable"`
- omit internal-trace content events or export them as redacted placeholders, consistent with `internal=redacted`
- still export tool calls/results if they are available

## Non-negotiable rules

1. Export only what is available in the current conversation context; NEVER invent missing turns.
2. Preserve causal order; DO NOT reorder events.
3. Preserve attribution: correct actor, role, and event type.
4. Tool outputs MUST be isolated in `tool_result` events.
5. Apply redaction according to the `redact` option (unless `redact=none`).
6. If output is truncated, annotate truncation deterministically (see Truncation section).
7. Ensure the final output is valid JSON (or valid NDJSON per line) with no surrounding commentary.

## Open-Token schema v0.1

### Top-level object (mode=json)

Emit exactly one JSON object:

```json
{
  "open_token_version": "0.1",
  "exported_at": "RFC3339 timestamp in UTC if available, else omit",
  "conversation": {},
  "participants": [],
  "events": [],
  "integrity": {}
}
```

Constraints:

- No extra top-level keys besides those listed (omit keys you cannot populate).
- `events` MUST be in strictly increasing sequence order.

### Streaming export (mode=ndjson)

Emit newline-delimited JSON records:

1. Header line:
   { "type": "header", "open_token_version": "0.1", "exported_at": "..." }

2. Then one line per event:
   { "type": "event", ...event object... }

3. Optional footer line:
   { "type": "footer", "integrity": { ... } }

Constraints:

- Every line MUST be valid JSON.
- Do not wrap NDJSON in an array.

## conversation object

`conversation` fields:

- `id` (required): stable identifier if provided by runtime; else generate `conv_<YYYYMMDD>_<hash8>`
- `title` (optional)
- `started_at` (optional; RFC3339; do not guess)
- `timezone` (optional)
- `source_runtime` (optional): "cli"|"web"|"api"|"ide"|"other"
- `provider` (optional): "openai"|"anthropic"|"google"|"meta"|"other"
- `internal_availability` (optional): "available"|"unavailable"|"unknown"
- `redaction` (required if redact != none):
  - `mode`: none|secrets|pii|strict
  - `strategy`: mask|drop|hash
  - `notes`: array of high-level notes (no secrets)

## participants array

Each participant:

{
"actor*id": "act*###",
"kind": "human|model|tool|system",
"name": "string",
"provider": "string (optional)",
"model": "string (optional)",
"instance_id": "string (optional)"
}

Rules:

- Create one `participants` entry per distinct speaker/agent/tool/system originator.
- Use `kind="system"` for system/developer prompt originators.
- Use `kind="tool"` for external tools/functions.
- Use `kind="model"` for model/agent outputs (including subagents).

## events array

### Event shape

Each `events[]` entry MUST follow:

{
"id": "evt*000001",
"seq": 1,
"ts": "RFC3339 UTC timestamp (optional if unknown)",
"type": "message|tool_use|tool_result|span_start|span_end|annotation",
"actor_id": "act*###",
"visibility": "public|internal|metadata",
"role": "system|developer|user|assistant|assistant*thought|tool",
"content": {
"mime": "text/plain|application/json",
"text": "string (optional)",
"data": {}
},
"links": {
"parent_id": "evt*###### (optional)",
"replies*to": "evt*###### (optional)",
"call*id": "call*###### (optional)",
"span*id": "span*###### (optional)"
},
"usage": {
"input_tokens": 0,
"output_tokens": 0,
"reasoning_tokens": 0
}
}

Rules:

- `id` REQUIRED; `seq` REQUIRED and must be contiguous (1..N).
- `ts` OPTIONAL; do not guess timestamps.
- `usage` OPTIONAL; include only if available.
- If `content.text` is used, `content.mime` should be `text/plain`.
- If `content.data` is used, `content.mime` should be `application/json`.

### Role mapping guidance

Map provider concepts to `role` + `visibility`:

- System prompt → `role="system"`, `visibility="internal"` (or `public` if explicitly shown)
- Developer instruction → `role="developer"`, `visibility="internal"`
- User message → `role="user"`, `visibility="public"`
- Assistant final answer → `role="assistant"`, `visibility="public"`
- Hidden reasoning trace:
  - if available AND `include=include-internal`:
    - `role="assistant_thought"`, `visibility="internal"`
    - content depends on `internal`:
      - `full`: include verbatim thought content
      - `summary`: include a brief summary string
      - `redacted`: include placeholder with no thought content
  - else:
    - omit thought content; set `conversation.internal_availability="unavailable"` when applicable
- Tool invocation request → `type="tool_use"`, `role="assistant"`, `visibility="internal"`
- Tool output → `type="tool_result"`, `role="tool"`, `visibility="internal"`

### Tool event requirements

For every tool call:

- Emit one `tool_use` event and one `tool_result` event.
- Both MUST share the same `links.call_id`.
- `tool_use.content.data` MUST include:
  - `tool_name` (string)
  - `arguments` (object/array)
- `tool_result.content` MUST contain ONLY the tool output.
  - If structured: `content.mime="application/json"` and put output in `content.data`
  - If text: `content.mime="text/plain"` and put output in `content.text`

If a tool call was initiated but no result exists in context:

- Still emit the `tool_use` event.
- Emit a `tool_result` event with:
  - `content.mime="application/json"`
  - `content.data={"missing_result":true}`
  - and include `conversation.redaction.notes` or an event-level annotation if relevant.

## Nested agents and subagents

If subagents exist:

- Represent each subagent as its own participant (`kind="model"`).
- Wrap subagent activity in a span:
  - `span_start` event opens span (`links.span_id`)
  - subagent events include `links.span_id`
  - `span_end` event closes span

If spawn metadata is available, put it in `span_start.content.data`:

- `spawn_reason`
- `requested_capabilities`
- `tooling_scope`
- `model` (if specified)

## Redaction

Apply redaction according to `redact`:

- `none`: no redaction (still avoid emitting known-prohibited private keys if policy requires)
- `secrets`: mask API keys, auth tokens, passwords, session cookies, private keys
- `pii`: additionally mask emails, phone numbers, street addresses, direct personal identifiers
- `strict`: mask secrets + pii + any internal-only configuration strings and untrusted tool outputs that may contain sensitive data

Mechanics:

- Replace sensitive substrings with: `[REDACTED:<type>:<hash8>]`
- Do not change surrounding punctuation unless necessary.
- Record high-level notes in `conversation.redaction.notes` (no secret values).

## Truncation

If `max_bytes` is set and output exceeds limit:

1. Prefer truncating large `content.text` fields:
   - keep first 1024 chars + last 256 chars, insert `…`
2. Mark truncated content:
   - If `content.mime="text/plain"`:
     - add `content.data={"truncated":true,"original_length":<int if known>}` and keep `text` truncated
   - If `content.mime="application/json"`:
     - include `{"truncated":true}` in the JSON structure where applicable
3. Do NOT drop events unless explicitly requested; if you must drop, drop oldest first and insert an `annotation` event describing the omission.

## Integrity (optional)

If feasible, include:

"integrity": {
"hash_alg": "sha256",
"canonicalization": "json-c14n-like",
"events_hash": "hex string"
}

If not feasible, omit `integrity`.

## Output checklist (must pass)

- Output is valid JSON (or NDJSON per line).
- `seq` is contiguous and strictly increasing.
- No fabricated timestamps or missing turns.
- Tool calls: `tool_use` paired with `tool_result` via `call_id` (or explicit missing-result marker).
- Redaction applied per `redact` option.
- Internal traces included only if available; otherwise marked unavailable and not fabricated.
- No extraneous text outside the export payload.

## Minimal example (json)

```json
{
  "open_token_version": "0.1",
  "exported_at": "2026-01-31T00:00:00Z",
  "conversation": {
    "id": "conv_20260131_ab12cd34",
    "provider": "unknown",
    "source_runtime": "unknown",
    "internal_availability": "unavailable",
    "redaction": {
      "mode": "secrets",
      "strategy": "mask",
      "notes": ["masked api keys"]
    }
  },
  "participants": [
    { "actor_id": "act_001", "kind": "system", "name": "system" },
    { "actor_id": "act_002", "kind": "human", "name": "user" },
    {
      "actor_id": "act_003",
      "kind": "model",
      "name": "assistant",
      "provider": "unknown",
      "model": "unknown"
    },
    { "actor_id": "act_004", "kind": "tool", "name": "CalculatorAPI" }
  ],
  "events": [
    {
      "id": "evt_000001",
      "seq": 1,
      "type": "message",
      "actor_id": "act_001",
      "visibility": "internal",
      "role": "system",
      "content": { "mime": "text/plain", "text": "You are a math tutor." }
    },
    {
      "id": "evt_000002",
      "seq": 2,
      "type": "message",
      "actor_id": "act_002",
      "visibility": "public",
      "role": "user",
      "content": { "mime": "text/plain", "text": "What is 5 factorial?" }
    },
    {
      "id": "evt_000003",
      "seq": 3,
      "type": "tool_use",
      "actor_id": "act_003",
      "visibility": "internal",
      "role": "assistant",
      "content": {
        "mime": "application/json",
        "data": { "tool_name": "CalculatorAPI", "arguments": { "op": "factorial", "n": 5 } }
      },
      "links": { "call_id": "call_000001" }
    },
    {
      "id": "evt_000004",
      "seq": 4,
      "type": "tool_result",
      "actor_id": "act_004",
      "visibility": "internal",
      "role": "tool",
      "content": { "mime": "text/plain", "text": "120" },
      "links": { "call_id": "call_000001" }
    },
    {
      "id": "evt_000005",
      "seq": 5,
      "type": "message",
      "actor_id": "act_003",
      "visibility": "public",
      "role": "assistant",
      "content": { "mime": "text/plain", "text": "5! equals 120." }
    }
  ]
}
```
