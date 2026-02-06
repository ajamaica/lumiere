---
name: skill-release-manager
description: Automates the release lifecycle of OpenClaw skills. Updates version, syncs to GitHub (subtree), creates GitHub Releases, and publishes to ClawHub in one command.
---

# Skill Release Manager

Unified release tool for OpenClaw skills.

## Features

1.  **Version Bump**: Automatically increments `package.json` version (patch/minor/major).
2.  **Git Ops**: Commits the version bump to the local workspace.
3.  **GitHub Release**: Uses `skill-publisher` to sync code to a remote repo and create a GitHub Release.
4.  **ClawHub Publish**: Pushes the skill to the ClawHub registry.

## Usage

```bash
node skills/skill-release-manager/index.js \
  --path skills/private-evolver \
  --remote https://github.com/autogame-17/evolver.git \
  --bump patch \
  --notes "Release notes here"
```

## Options

- `--path`: Path to the skill directory (required).
- `--remote`: Target GitHub repository URL (required).
- `--bump`: Version increment (`patch`, `minor`, `major`) or specific version (`1.2.3`). Default: `patch`.
- `--notes`: Release notes for GitHub.

## Prerequisites

- `skill-publisher` skill must be present.
- `clawhub` CLI must be authenticated.
