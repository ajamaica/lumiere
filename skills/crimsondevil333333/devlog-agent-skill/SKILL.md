# DevLog Skill 🦞

A standardized journaling skill for OpenClaw agents to track progress, tasks, and project status using `dev-log-cli`.

## Description

This skill enables agents to maintain a professional developer log. It's designed to capture context, project milestones, and task statuses in a structured SQLite database.

## Requirements

- `dev-log-cli` (installed via `pipx`)

## Links

- **GitHub**: [https://github.com/CrimsonDevil333333/dev-log-cli](https://github.com/CrimsonDevil333333/dev-log-cli)
- **PyPI**: [https://pypi.org/project/dev-log-cli/](https://pypi.org/project/dev-log-cli/)
- **ClawHub**: [https://clawhub.com/skills/devlog-skill](https://clawhub.com/skills/devlog-skill) (Pending Publication)

## Usage

### 📝 Adding Entries

Agents should use this to log significant progress or blockers.

```bash
devlog add "Finished implementing the auth module" --project "Project Alpha" --status "completed" --tags "auth,feature"
```

### 📋 Listing Logs

View recent activity for context.

```bash
devlog list --project "Project Alpha" --limit 5
```

### 📊 Viewing Stats

Check project health and activity.

```bash
devlog stats --project "Project Alpha"
```

### 🔍 Searching

Find historical context on specific topics.

```bash
devlog search "infinite loop"
```

### 🛠️ Editing/Viewing

Detailed inspection or correction of entries.

```bash
devlog view <id>
devlog edit <id>
```

## Internal Setup

The skill includes a `setup.sh` to ensure the CLI is available.
