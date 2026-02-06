# ClawHub Publishing Guide

How to update the `keep-protocol` skill listing on [ClawHub](https://www.clawhub.ai/skills/keep-protocol) after code changes.

## Repository Architecture

> **⛔ CRITICAL: ALL changes go through staging first. NEVER push directly to origin.**

| Remote    | Repo                             | Purpose                                            |
| --------- | -------------------------------- | -------------------------------------------------- |
| `staging` | CLCrawford-dev/keep-protocol-dev | **Private staging** — test here first              |
| `origin`  | CLCrawford-dev/keep-protocol     | **Main development** — only after staging verified |
| `nteg`    | nTEG-dev/keep-protocol           | **Public mirror** — sync after releases            |

```bash
# Check your remotes
git remote -v

# If missing, add them:
git remote add staging https://github.com/CLCrawford-dev/keep-protocol-dev.git
git remote add nteg https://github.com/nTEG-dev/keep-protocol.git
```

## Development Workflow

### 1. Feature Development (ALWAYS start here)

```bash
# Create feature branch
git checkout -b feature/kp-XX-description

# Make changes, commit locally
git add .
git commit -m "feat: description (KP-XX)"

# Push to STAGING first — NEVER to origin
git push staging feature/kp-XX-description
```

### 2. Test on Staging

- Run tests against staging branch
- Verify functionality works as expected
- Get human approval if needed

### 3. Merge to Staging Main

```bash
# On staging repo, merge feature branch to main
git checkout main
git merge feature/kp-XX-description
git push staging main
```

### 4. Final Verification on Staging

- All tests pass on staging
- Manual verification complete
- Ready for production

### 5. Push to Origin (Production)

```bash
# Only after staging is verified
git push origin main
```

### 6. Follow Release Checklist (below)

Tag, CI, artifacts, ClawHub publish.

---

## Prerequisites

- Node.js / npm (for `npx`)
- Authenticated ClawHub session (see Login below)

## Login

The CLI has a bug where it resets the registry URL on every invocation. **Always** prefix commands with the env var override:

```bash
CLAWHUB_REGISTRY=https://auth.clawdhub.com npx clawhub login
```

Complete the browser auth flow. Verify it worked:

```bash
CLAWHUB_REGISTRY=https://auth.clawdhub.com npx clawhub whoami
```

Should print `nTEG-dev`.

**Token storage:** `~/Library/Application Support/clawhub/config.json`

## Publishing a New Version

After committing and pushing code changes:

```bash
# 1. Bump version (semver)
CLAWHUB_REGISTRY=https://auth.clawdhub.com npx clawhub publish . \
  --version <NEW_VERSION> \
  --changelog "Description of changes" \
  --tags "agent-coordination,protobuf,tcp,ed25519,moltbot,openclaw,swarm,intent,signing,decentralized,latest"
```

Example:

```bash
CLAWHUB_REGISTRY=https://auth.clawdhub.com npx clawhub publish . \
  --version 1.0.2 \
  --changelog "Add relay support and improved error handling" \
  --tags "agent-coordination,protobuf,tcp,ed25519,moltbot,openclaw,swarm,intent,signing,decentralized,latest"
```

## Verify

```bash
CLAWHUB_REGISTRY=https://auth.clawdhub.com npx clawhub inspect keep-protocol --json
```

Check that `summary`, `tags`, and `latestVersion` are correct.

Or visit: https://www.clawhub.ai/skills/keep-protocol

## What Gets Published

The CLI publishes the **SKILL.md** file (and any supporting files in the directory). ClawHub reads:

- **YAML frontmatter** in `SKILL.md` → name, description, emoji, tags
- **Markdown body** → the skill instructions agents see when installed

If you change the description, emoji, or tags, update the frontmatter in `SKILL.md` first, commit, then publish.

## SKILL.md Frontmatter Reference

```yaml
---
name: keep-protocol
description: One-liner that powers search and discovery (max 1024 chars).
metadata: { 'openclaw': { 'emoji': '🦀', 'tags': ['tag1', 'tag2'] } }
---
```

Allowed frontmatter keys: `name`, `description`, `license`, `allowed-tools`, `metadata`.

## Full Update Checklist

> **⛔ STOP: DO NOT push to origin or publish to ClawHub until STAGING is verified.**
>
> Publishing before testing exposes users to broken artifacts.
> This happened on v1.0.2/v0.3.0 — don't repeat it.

### Phase 1: Staging (MANDATORY)

```
☐ 1. Feature branch created from main
☐ 2. Code changes committed locally
☐ 3. Push to STAGING remote (NOT origin):
       git push staging feature/kp-XX-description
☐ 4. Test on staging:
       - Unit tests pass
       - Integration tests pass
       - Manual verification complete
☐ 5. Merge to staging main:
       git checkout main
       git merge feature/kp-XX-description
       git push staging main
☐ 6. Final staging verification complete
```

### Phase 2: Production

```
☐ 7. Push verified code to origin:
       git push origin main
☐ 8. SKILL.md updated if description/tags/instructions changed
☐ 9. Create and push version tag:
       git tag vX.Y.Z
       git push origin vX.Y.Z
☐ 10. WAIT for CI to complete — ALL JOBS MUST BE GREEN
       https://github.com/CLCrawford-dev/keep-protocol/actions
       ☐ build-go ✓
       ☐ test-python ✓
       ☐ build-docker ✓
       ☐ build-sdist ✓
       ☐ publish-pypi ✓
       ☐ publish-ghcr ✓
☐ 11. VERIFY artifacts exist:
       - ghcr.io: docker pull ghcr.io/clcrawford-dev/keep-server:X.Y.Z
       - PyPI: pip install keep-protocol==X.Y.Z
☐ 12. TEST in clean sandbox (what a new user experiences):
       python3 -m venv /tmp/keep-test-sandbox
       source /tmp/keep-test-sandbox/bin/activate
       pip install keep-protocol
       python3 -c "
         from keep.client import KeepClient
         import keep
         print(f'Version: {keep.__version__}')
         client = KeepClient('localhost', 9009)
         info = client.discover('info')
         print(f'Server: {info}')
       "
       # Must see valid version and server response
       deactivate
       rm -rf /tmp/keep-test-sandbox
```

### Phase 3: Public Release

```
☐ 13. Publish to ClawHub with matching version
☐ 14. Verify on clawhub.ai/skills/keep-protocol
☐ 15. Sync to public mirror:
       git push nteg main
       git push nteg vX.Y.Z
```

## Push to All Remotes

The repo has three remotes — use them in order:

```bash
# 1. STAGING (always first for new work)
git push staging feature/branch   # Test here first
git push staging main             # After feature verified

# 2. ORIGIN (only after staging verified)
git push origin main              # CLCrawford-dev (primary)
git push origin vX.Y.Z            # Push tags after CI

# 3. PUBLIC MIRROR (only after release complete)
git push nteg main                # nTEG-dev (public mirror)
git push nteg vX.Y.Z              # Sync tags
```

**Never skip staging. Never push directly to origin without staging verification.**

## Version History

| Version | Date       | Git Tag | Changes                                                                                                                          |
| ------- | ---------- | ------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1.0.0   | 2026-02-02 | v0.1.0  | Initial publish (missing description/tags)                                                                                       |
| 1.0.1   | 2026-02-02 | v0.1.1  | Added YAML frontmatter: description, 🦀 emoji, discovery tags                                                                    |
| 1.0.2   | 2026-02-03 | v0.3.1  | Discovery (info/agents/stats), endpoint caching, scar logging, agent-to-agent routing, persistent connections (v0.3.0 failed CI) |

## Troubleshooting

**`Unauthorized` on every command:**
The CLI resets the registry URL. Always use `CLAWHUB_REGISTRY=https://auth.clawdhub.com`.

**`--version must be valid semver`:**
Pass `--version X.Y.Z` explicitly. The CLI doesn't auto-detect from SKILL.md.

**Token expired:**
Re-run `CLAWHUB_REGISTRY=https://auth.clawdhub.com npx clawhub login` and complete browser flow.

---

🦀 claw-to-claw.
