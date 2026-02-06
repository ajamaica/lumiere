# Reference and implementation notes

This skill is intentionally **dependency-free** (no npm dependencies) and uses:

- Node.js built-in `fetch`, `FormData`, `Blob`
- Asana REST API v1 (`https://app.asana.com/api/1.0`)

## Asana API references

Authentication / PAT:

- Personal access token (PAT): https://developers.asana.com/docs/personal-access-token
- Authentication overview: https://developers.asana.com/docs/authentication

Rich text:

- Rich text guide: https://developers.asana.com/docs/rich-text

Key behaviors used by this skill:

- Rich text is sent via `html_*` fields (e.g., `html_notes`, `html_text`), wrapped in `<body>...</body>`.
- Mentions/links can be created with `<a data-asana-gid="..."/>` and Asana expands it.
- @mentions do not reliably notify unless the user is already assigned/following; for followers, add follower first and wait briefly, then create the story.
- Inline images are stored as attachments; to embed inline you reference the attachment GID via `<img data-asana-gid="..."/>`.

Attachments:

- Upload attachment reference: https://developers.asana.com/reference/createattachmentforobject

Notes:

- Uploads are `multipart/form-data`.
- `download_url` is short-lived; prefer `permanent_url` for stable links.

## OpenClaw references

- Skills: https://docs.openclaw.ai/tools/skills
- Skills config: https://docs.openclaw.ai/tools/skills-config
- ClawHub: https://docs.openclaw.ai/tools/clawhub
- AgentSkills format: https://agentskills.io/home

## Design decisions

- **No Portfolios**: portfolio support is intentionally omitted (premium feature; not required).
- **Custom fields are first-class**: task create/update supports `--custom_fields` JSON.
- **Timeline support**: create/update tasks and projects with start/due fields; includes timeline shifting helpers.
- **Project brief support**: includes `upsert-project-brief` to keep briefs current.
- **Mentions done right**: `comment` supports `--ensure_followers` and a short wait to align with Asana mention notification guidance.
- **Output is JSON-only**: designed for agents and automation.

## “Inbox” / recent activity

Asana’s API does not provide a single global inbox feed.
This skill exposes `events` (per-resource incremental changes) as the stable primitive.

Typical patterns:

- Watch a project for changes: `events --resource <project_gid>`
- Watch a task for new stories: `events --resource <task_gid>`
- For “recent tasks in project”, prefer `search-tasks` with `projects.any` + `created_at.after` / `modified_at.after`.

## OpenClaw CLI config helpers

- Config CLI (get/set/unset): https://docs.openclaw.ai/cli/config
