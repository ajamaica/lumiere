# keep-protocol Release Workflow

## Overview

This document describes the full automated release pipeline for keep-protocol.

## Prerequisites

- Git remotes configured: `origin` (CLCrawford-dev), `staging` (dev repo), `nteg` (fork)
- ClawHub CLI authenticated: `CLAWHUB_REGISTRY=https://auth.clawdhub.com npx clawhub whoami`
- CI configured with PyPI trusted publishing

## Release Checklist

### 1. Code Changes

```bash
# Work on feature branch
git checkout -b feature/description

# Push to staging first, then origin
git push staging feature/description
git push origin feature/description

# Create PR and merge to main
```

### 2. Version Bump (3 files)

| File                      | Field                     |
| ------------------------- | ------------------------- |
| `python/pyproject.toml`   | `version = "X.Y.Z"`       |
| `python/keep/__init__.py` | `__version__ = "X.Y.Z"`   |
| `keep.go`                 | `ServerVersion = "X.Y.Z"` |

### 3. Update CHANGELOG.md

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added

- New feature description

### Changed

- Change description

### Fixed

- Fix description
```

Update comparison links at bottom:

```markdown
[Unreleased]: .../compare/vX.Y.Z...HEAD
[X.Y.Z]: .../compare/vPREV...vX.Y.Z
```

### 4. Update CI Matrix (if Python version changed)

Edit `.github/workflows/ci.yml`:

```yaml
python-version: ['3.10', '3.11', '3.12', '3.13']
```

### 5. Commit and Push

```bash
git add -A
git commit -m "chore: bump version to vX.Y.Z"
git push staging main
git push origin main
```

### 6. Tag and Release (Triggers CI)

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

This triggers:

- PyPI publish (automatic via trusted publishing)
- ghcr.io Docker image publish

### 7. Sync nTEG-dev Fork

```bash
git push nteg origin/main:main --force
```

### 8. Publish to ClawHub

```bash
CLAWHUB_REGISTRY=https://auth.clawdhub.com npx clawhub publish . --version X.Y.Z
```

### 9. Verify Release

```bash
# PyPI
curl -s "https://pypi.org/pypi/keep-protocol/json" | grep -o '"version":"[^"]*"'

# ClawHub
CLAWHUB_REGISTRY=https://auth.clawdhub.com npx clawhub inspect nTEG-dev/keep-protocol

# Docker
docker pull ghcr.io/clcrawford-dev/keep-server:X.Y.Z
```

## Gotchas

### pip install with extras (zsh)

```bash
# Wrong (zsh interprets brackets as glob)
pip install keep-protocol[mcp]

# Correct
pip install "keep-protocol[mcp]"
```

### MCP server has no --help

The `keep-mcp` command uses stdio transport. It waits for MCP protocol messages, not CLI flags.

Test with:

```bash
python -c "from keep.mcp import main, mcp; print('Tools:', list(mcp._tool_manager._tools.keys()))"
```

### ClawHub requires registry env var

Always set:

```bash
CLAWHUB_REGISTRY=https://auth.clawdhub.com
```

### ClawHub login

```bash
# Interactive (opens browser)
CLAWHUB_REGISTRY=https://auth.clawdhub.com npx clawhub login

# With token (headless)
CLAWHUB_REGISTRY=https://auth.clawdhub.com npx clawhub login --token TOKEN --no-browser
```

## Remotes

| Remote    | Repository                       | Purpose                     |
| --------- | -------------------------------- | --------------------------- |
| `origin`  | CLCrawford-dev/keep-protocol     | Main public repo            |
| `staging` | CLCrawford-dev/keep-protocol-dev | Testing before origin       |
| `nteg`    | nTEG-dev/keep-protocol           | Fork for ClawHub publishing |

## Linear Issues

Create issues in the `keep-protocol` team with prefix `KP-`.

Standard release issues:

- Build feature (implementation)
- Test on keep-1 (verification)
- Package and publish to PyPI
- Update SKILL.md for ClawHub
- Community push (X post, etc.)
