# AGENTS.md

This repository is an **AgentSkill** for OpenClaw / Clawdbot: **Asana (PAT)**.

It is intentionally small, dependency-free, and designed to work in sandboxed environments.

If you are a coding agent working in this repo, follow the guidance below.

## Project overview

Goal: provide a robust Node.js CLI (`scripts/asana.mjs`) that lets an agent:

- Authenticate with **Asana Personal Access Token (PAT)** (Bearer token)
- Work across **multiple workspaces/projects** (contexts)
- Support both:
  - **Personal task management** (my tasks, quick capture, triage)
  - **Project manager workflows** (project brief, status updates, timelines, custom fields, attachments, stakeholder comments)

Non-goals:

- Do not add Asana Portfolio features (premium) unless explicitly requested.
- Do not bake “bot personality” into the skill; keep it generic and configurable by the user/bot prompt.

## Repo layout

- `SKILL.md` — skill definition + agent-facing usage guide
- `README.md` — human-facing quickstart (install/config/run)
- `scripts/asana.mjs` — the only executable; dependency-free Node ESM CLI
- `references/REFERENCE.md` — API notes, links, and gotchas
- `LICENSE`

## Local config files

The CLI stores local-only convenience config (defaults, contexts, event sync tokens) in:

- Default: `~/.openclaw/skills/asana.json`
- Override: `ASANA_CONFIG_PATH=/path/to/file.json`

Legacy paths are still read (for compatibility): `~/.clawdbot/skills/*` and `~/.clawd/skills/*`.

## Setup commands

OpenClaw config can be edited non-interactively via `openclaw config get|set|unset` (useful for enabling the skill and injecting `ASANA_PAT`).

No package manager required.

- Ensure Node.js **18+** (needs built-in `fetch` and ESM).
- Smoke test (requires `ASANA_PAT` in env):
  - Who am I:
    - `node scripts/asana.mjs me`

  - List workspaces:
    - `node scripts/asana.mjs workspaces`

## How to run checks

There is no test suite yet. If you change behavior, run at least:

- `node scripts/asana.mjs me`
- `node scripts/asana.mjs workspaces`
- `node scripts/asana.mjs projects --workspace <gid>`
- A write-path check in a throwaway task/project (create/update/comment + attachment upload)

## Conventions & patterns

### CLI behavior

- Always output **JSON** to stdout for machine parsing.
- Exit non-zero with a clear error message on failures.
- Preserve backwards compatibility of command names/flags where possible.
  - If you must change a flag, support the old one as an alias for at least one release.

### API calls

- Prefer explicit `opt_fields` defaults for predictable output.
- Handle pagination where it matters (Asana uses `limit` + `offset`).
- Treat 402 responses as “feature not available / premium required” and return a clear error.

### Code style

- Node ESM (`.mjs`), standard library only.
- Use small, testable functions (request helpers, parsing helpers, storage helpers).
- Keep “business logic” separate from transport (HTTP request) functions.

## Security

- **Never** commit tokens, PATs, or user config.
- Do not print PATs in logs or error messages.
- When adding new commands that accept user-supplied text/HTML, avoid echoing secrets back in errors.

## Rich text, mentions, and attachments

- Rich text uses Asana’s XML-valid HTML conventions (`html_*` fields).
- Mentions should be paired with follower management when notification delivery matters.
- Attachment uploads must use `multipart/form-data` and should return `gid` plus stable links (`permanent_url` when available).

## Release & publishing

- This skill can be published to **ClawHub** directly from the skill folder (GitHub is optional).
- First-time publish example:

  `clawhub publish . --slug asana --name "Asana" --version 1.0.0 --tags latest --changelog "Initial release (PAT)"`

- When preparing a release:
  - Update `README.md` / `SKILL.md` docs if the command surface changed
  - Bump the semver version used during `clawhub publish`
  - Validate install into a clean workspace via `clawhub install <slug>`

## When unsure

Prefer minimal, composable primitives over many narrow “shortcut” commands.
Add helpers only when they reduce multi-step orchestration or statefulness (e.g., events sync tokens).
