## Arkham Intel API (`ark` / `arkham`) — Agent Skill Usage Guide

This document explains how to use the Arkham Intel API integration in `papercli`. The command is available as **`arkham`** (full name) and **`ark`** (alias). It supports the full API surface by reading Arkham’s OpenAPI specification and letting you invoke any endpoint by its `operationId`.

This guide is intentionally detailed and operational. It contains **no programming snippets** and avoids code blocks; when you see a command name or flag, it will be written inline (for example: `papercli ark ops`).

---

## What this command does (mental model)

The Arkham integration works in two phases:

- **Discover**: you list the available API operations from the OpenAPI spec file, and choose the `operationId` you want.
- **Call**: you invoke that operation by ID, provide path/query parameters and (if needed) a request body, and `papercli` performs the HTTP request with your Arkham `API-Key` header.

The OpenAPI spec used by default is `docs/exports/openapi.json` in this repository. You can override the spec path at runtime.

---

## Prerequisites

- **Arkham API Key**: Arkham requires every request to include an `API-Key` header. You must have a valid Arkham API key.
- **Config file**: `papercli` reads the key from `config.json` (unless you override via flags).
- **Network access**: The default Arkham API base URL is `https://api.arkm.com`.

---

## Configuration (`config.json`)

### Where `papercli` looks for `config.json`

`papercli` resolves configuration in this order:

- **Environment override**: If `PAPERCLI_CONFIG` is set, it uses that path.
- **Project-local**: If `./config.json` exists in the current working directory, it uses that.
- **User config**: If `~/.papercli/config.json` exists, it uses that.

If no config file is found, Arkham commands that require an API key will fail with a message explaining what path was checked and how to create a minimal config.

### Arkham config fields

Add an `arkham` section to your config:

- **`arkham.apiKey`** (required unless provided via `--api-key`): Your Arkham API key. This is used as the `API-Key` request header.
- **`arkham.baseURL`** (optional): Override the API base URL. If omitted, `papercli` uses the base URL from the OpenAPI spec (and falls back to `https://api.arkm.com`).

### Security notes for the API key

- Treat your `arkham.apiKey` like a password.
- Avoid committing `config.json` to git if it contains secrets.
- Prefer a per-environment config file and set `PAPERCLI_CONFIG` to select it.

---

## Command overview

The Arkham command group is:

- **`papercli arkham`**: main command
- **`papercli ark`**: alias (same behavior)

Subcommands:

- **`ops`**: list available API operations from the OpenAPI spec
- **`call`**: call an API operation by `operationId`

Global flags (available on `arkham`, `ops`, and `call`):

- **`--spec`**: path to the OpenAPI JSON file to use. Default: `docs/exports/openapi.json`.
- **`--api-key`**: override the API key from config for this invocation.
- **`--base-url`**: override the base URL from config/spec for this invocation.
- **`--timeout`**: HTTP timeout for the request.

---

## Operation discovery (`ops`)

### Purpose

`ops` is how you discover what you can call. It prints a list of `operationId`s derived from the OpenAPI spec.

### Output format

Each line is tab-separated and typically includes:

- `operationId`
- HTTP method (GET/POST/etc.)
- path template (may include `{pathParams}`)
- optional summary text (if present in the spec)

### Filtering

Use filters to narrow down large lists:

- **`--search`**: substring search across operationId/method/path/tags/summary
- **`--tag`**: filter by a specific OpenAPI tag (case-insensitive)

### Practical workflow

- Start with `ops` and search for the feature area you want (for example: “intelligence”, “labels”, “transfers”, “portfolio”, “balances”, “flow”).
- Copy the `operationId` you want and use it with `call`.

---

## Calling endpoints (`call`)

### Purpose

`call` performs an HTTP request for the specified `operationId`.

You provide:

- the `operationId`
- any path parameters required by the path template
- any query parameters required/desired
- optional additional headers
- optional request body (for POST-like operations)

### Parameter passing options

`papercli` supports multiple ways to provide parameters:

#### 1) `--arg name=value` (recommended first try)

This is a convenience flag. `papercli` will route the parameter to **path** or **query** based on the OpenAPI spec for that operation. If the parameter name isn’t recognized, it defaults to **query**.

Use this when you don’t want to think about whether a parameter belongs in the path or query string.

#### 2) `--path name=value`

For explicit path parameters. Use this when the endpoint includes placeholders like `{address}`, `{entity}`, `{chain}`, `{id}`, etc.

If you forget a required path parameter, `papercli` will fail fast and tell you which one is missing.

#### 3) `--query name=value`

For explicit query parameters. Use this for filters like time ranges, pagination controls, sorting options, direction filters, and any optional parameters documented by Arkham.

#### 4) Repeated parameters

You can repeat `--arg`, `--path`, `--query`, and `--header` multiple times.

If the same query key appears multiple times, it will be sent as multiple query entries (common for APIs that allow repeated keys).

### Headers

The `API-Key` header is always set from config or `--api-key`.

You can add additional headers with:

- **`--header name=value`**

This is useful for:

- experimenting with content negotiation
- passing custom headers for debugging/proxies

### Request body

Some endpoints require a JSON request body (typically POST/PUT style).

Provide a body with:

- **`--body`**: either inline JSON text, or a file reference prefixed by `@` to read the entire body from a file path

Notes:

- If a body is provided and no content type is explicitly set via `--header`, `papercli` sets `Content-Type` to `application/json`.
- `papercli` always sets `Accept` to `application/json`.

### Output handling

`papercli` prints the raw response body to stdout.

If the response looks like JSON, it will be pretty-printed by default. You can disable pretty-printing with `--pretty=false`.

If you want the HTTP status code printed as well, enable:

- **`--status`** (prints `HTTP <code>` to stderr)

### Error behavior

- If Arkham returns any HTTP status code >= 400, `papercli` prints the response body (so you can see Arkham’s error payload) and then returns a CLI error such as “arkham API error (HTTP 401/429/etc.)”.
- If the request times out, you’ll see a timeout error from the HTTP client.

---

## Rate limits and “heavy” endpoints

Arkham documents tiered rate limits, and some endpoints are “heavy” with stricter limits (often around 1 request/sec).

When you hit rate limits, Arkham typically responds with HTTP 429 and a JSON error payload indicating too many requests.

Operational guidance:

- Use `--timeout` appropriate to your query; “heavy” endpoints may take longer.
- Avoid tight loops; add backoff when automating repeated calls.
- Prefer narrower queries (smaller time ranges, specific tokens/entities, appropriate filters) when possible.

---

## Common API concepts (how to think about parameters)

Arkham endpoints frequently use:

- **Path parameters**: identify core resources
  - examples include address, entity, chain, token id, transaction hash, cluster id
- **Query parameters**: filters and pagination
  - time ranges (`startTime`/`endTime`-style), direction filters (in/out), sorting, min USD thresholds, page/limit/cursor patterns depending on endpoint

Because `papercli ark call` is generic and driven by OpenAPI, you should use Arkham’s API reference (or inspect the OpenAPI spec) to know the exact parameter names and expected formats for each operation.

Practical workflow:

- Find the `operationId` with `ops`.
- Start with only required path parameters.
- If the response is too large, add query filters progressively.

---

## Troubleshooting checklist

### “Missing Arkham API key”

Cause:

- `arkham.apiKey` is not present in `config.json` and you did not provide `--api-key`.

Fix:

- Add `arkham.apiKey` to your config file, or pass `--api-key` for a one-off call.

### “config.json not found”

Cause:

- No config file in any of the supported locations.

Fix:

- Create `config.json` in the current directory, or put one at `~/.papercli/config.json`, or set `PAPERCLI_CONFIG` to the correct path.

### “unknown operationId”

Cause:

- You typed an invalid `operationId`, or your spec file is different than expected.

Fix:

- Run `papercli ark ops` and pick the exact ID from the output.
- Confirm you’re using the intended spec via `--spec`.

### “missing required path param”

Cause:

- The endpoint path template includes `{param}` but you didn’t supply it via `--path` or `--arg`.

Fix:

- Provide the missing value using `--arg param=value` or `--path param=value`.

### HTTP 401 Unauthorized

Cause:

- API key missing/invalid.

Fix:

- Verify `arkham.apiKey` is correct and active.
- Confirm you are not accidentally overriding it with an empty `--api-key`.

### HTTP 429 Too Many Requests

Cause:

- Rate limit exceeded (especially common on heavy endpoints).

Fix:

- Slow down calls; add retries with backoff in your automation workflow.
- Reduce query complexity and scope.

---

## Recommended usage patterns (for agents and operators)

- **Use `ops` first**: always start by listing operations to avoid guessing paths/parameter names.
- **Prefer `--arg` initially**: it reduces friction by routing params based on the spec.
- **Use `--path` / `--query` when refining**: once you know the endpoint, be explicit for readability and reproducibility.
- **Capture the exact `operationId`** used for a workflow: it is stable and maps cleanly to a single endpoint+method.
- **Treat output as data**: the command prints API JSON responses; downstream tooling can parse it if needed.
- **Keep the API key out of logs**: avoid passing secrets via command history when possible; prefer config files or environment-selected configs.

---

## Quick reference (names only)

- Command group: `arkham` (alias: `ark`)
- Discovery: `ops`
- Execution: `call <operationId>`
- Global flags: `--spec`, `--api-key`, `--base-url`, `--timeout`
- Call flags: `--arg`, `--path`, `--query`, `--header`, `--body`, `--pretty`, `--status`
