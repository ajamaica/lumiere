---
name: create-plugin
description: Create OpenClaw plugins/extensions (TypeScript modules) from natural‑language requests. Use when the user asks to create a plugin/extension, add a new slash command, add plugin tools, or says “create plugin that does …” or “create OpenClaw plugin called NAME …”. Trigger for /create-plugin NAME WHAT-IT-DOES, /create-plugin GENERAL-PROMPT, “create extension that does ACTION”, or similar.
---

# Create Plugin

**Note to User:** Depending on its permissions, OpenClaw can already create its own plugins. This skill streamlines the process. Plugins can change how OpenClaw works. They run in‑process with the gateway, so treat them as trusted code.

## References

Use any of the following sources for reference, as they may be more up to date than this skill:

- [OpenClaw Plugin Docs](https://docs.openclaw.ai/plugins/)
- [OpenClaw Plugins > Agent Tools](https://docs.openclaw.ai/plugins/agent-tools/)
- [Repo docs: Plugins](https://github.com/openclaw/openclaw/blob/main/docs/plugin.md)
- [Repo docs: Agent tools](https://github.com/openclaw/openclaw/blob/main/docs/plugins/agent-tools.md)
- If local repo exists: `<openclaw-repo>/docs/plugin.md`, and `<openclaw-repo>/docs/plugins/agent-tools.md`

If you can access those links, they may be more up to date than this skill. Defer to them if there are discrepancies. Otherwise, this skill shows how to create an OpenClaw plugin as of February 2026.

## Overview

Turn a user request into a working OpenClaw plugin: choose an id, scaffold files (`openclaw.plugin.json`, `index.ts`, optional `package.json`), implement commands/tools/services, and document how to enable/restart.

## Workflow

### 1) Parse intent + confirm scope

- Identify the plugin id and primary capability (auto‑reply command, agent tool, CLI command, channel, service, etc.).
- If the request is ambiguous, ask for:
  - Desired plugin id/name
  - What triggers it (slash command? agent tool?)
  - Expected output/side effects
  - Any dependencies or external binaries
  - Config fields (API keys, flags, defaults)

### 2) Choose location + id

Pick a plugin root directory:

- **Recommended (safe from upgrades):** `~/.openclaw/extensions/<id>`
- Local dev (workspace‑scoped): `<workspace>/.openclaw/extensions/<id>`
- Custom path: add to `plugins.load.paths`

Local dev install options:

- Copy install: `openclaw plugins install /path/to/plugin`
- Symlink install: `openclaw plugins install -l /path/to/plugin`

Normalize id to lowercase, hyphenated, <=64 chars.

### 3) Create required files

**Always include a manifest** (`openclaw.plugin.json`):

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "description": "...",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {}
  }
}
```

Notes:

- `configSchema` is required even if empty.

**Plugin entrypoint** (`index.ts`):

```ts
import type { OpenClawPluginApi } from 'openclaw/plugin-sdk'

export default function register(api: OpenClawPluginApi) {
  // registerCommand / registerTool / registerCli / registerService / etc.
}
```

**Optional `package.json`** when you want a pack or npm metadata:

```json
{
  "name": "@openclaw/my-plugin",
  "version": "0.1.0",
  "type": "module",
  "openclaw": { "extensions": ["./index.ts"] }
}
```

### 4) Implement features

Always write and run tests for your plugin features.

**Auto‑reply command** (no LLM run):

```ts
api.registerCommand({
  name: 'mycmd',
  description: '...',
  acceptsArgs: true,
  requireAuth: true,
  handler: async (ctx) => ({ text: 'OK' }),
})
```

Rules:

- Commands are global, case‑insensitive, and must not override reserved names.
- `acceptsArgs: false` means `/cmd args` won’t match.

**Agent tool** (LLM‑callable):

```ts
import { Type } from '@sinclair/typebox'

api.registerTool({
  name: 'my_tool',
  description: 'Do a thing',
  parameters: Type.Object({ input: Type.String() }),
  async execute(_id, params) {
    return { content: [{ type: 'text', text: params.input }] }
  },
})
```

Optional tools (opt‑in):

```ts
api.registerTool({ ... }, { optional: true });
```

Enable optional tools via `tools.allow` or `agents.list[].tools.allow`.

### 5) Enable + restart

If you have ability to run commands, ask the user whether you can run the following commands, otherwise provide them as instructions.

- Enable: `openclaw plugins enable <id>` (or set `plugins.entries.<id>.enabled = true`)
- Restart gateway after changes.
- Check errors: `openclaw plugins doctor`

## Output expectations

When creating a plugin, produce:

- The plugin file tree
- The exact file contents for `openclaw.plugin.json` and `index.ts`
- Any config snippet required (`plugins.entries.<id>.config` or tool allowlist)
- Reminder and instructions to enable the plugin and restart the gateway, and how to test the new functionality
