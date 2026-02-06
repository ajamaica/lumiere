# Keep-Protocol Release Workflow Template

How to structure Linear issues for any keep-protocol release. This ensures we never skip steps and can always pick up where we left off.

## Philosophy

1. **Every release is a Linear project** with step-by-step issues
2. **Issues are chained with blockers** — can't skip ahead
3. **Staging before production** — always test before going live
4. **Documentation before tagging** — docs are part of the release, not afterthought
5. **Pick up where you left off** — find first unblocked issue

## The Three Remotes

| Remote    | Repo                             | Purpose         |
| --------- | -------------------------------- | --------------- |
| `staging` | CLCrawford-dev/keep-protocol-dev | Test here first |
| `origin`  | CLCrawford-dev/keep-protocol     | Production      |
| `nteg`    | nTEG-dev/keep-protocol           | Public mirror   |

**Flow:** staging → origin → nteg

## Documentation Files

Every release should consider updating these files:

| File             | Purpose              | Update When               |
| ---------------- | -------------------- | ------------------------- |
| **CHANGELOG.md** | Version history      | Every release (required)  |
| **README.md**    | Human quick-start    | API changes, new features |
| **AGENTS.md**    | AI coding assistants | Protocol/SDK changes      |
| **SKILL.md**     | ClawHub marketplace  | Feature changes, new tags |

### Documentation Checklist

Before tagging any release, verify:

```
□ CHANGELOG.md — New version section added with all changes
□ README.md — Version references updated (e.g., "v0.3.0+")
□ README.md — New features documented if user-facing
□ AGENTS.md — Updated if protocol, SDK methods, or wire format changed
□ SKILL.md — Updated if features or tags changed for ClawHub
□ Version string — Updated in pyproject.toml and/or go.mod
```

## Release Issue Template

For each release (e.g., v0.3.2), create these issues in order. Each blocks the next.

### Phase 1: Development

```
KP-XX: Implement [feature name]
├── Description: What's being built
├── Acceptance criteria: What "done" looks like
├── Branch: feature/kp-XX-description
└── Push to: STAGING only
```

### Phase 2: Documentation (NEW)

```
KP-XX: Update documentation for [feature/version]
├── Blocked by: Implementation issue(s)
├── CHANGELOG.md: Add version entry with all changes
├── README.md: Update if API/usage changes
├── AGENTS.md: Update if protocol/SDK changes
├── SKILL.md: Update if features/tags change
└── Acceptance: All docs accurate and consistent
```

### Phase 3: Staging Verification

```
KP-XX: Test [feature] on staging
├── Blocked by: Documentation issue
├── Test plan: Unit tests, integration tests, manual tests
├── Branch: Same feature branch on staging
└── Acceptance: All tests pass
```

```
KP-XX: Merge to staging main
├── Blocked by: Test issue
├── Actions: git merge, push staging main
└── Verification: Code on staging/main
```

### Phase 4: Production

```
KP-XX: Push to origin (production)
├── Blocked by: Staging merge
├── Actions: Merge staging/main to origin/main
└── Verification: Code on origin
```

```
KP-XX: Tag vX.Y.Z and verify CI green
├── Blocked by: Origin push
├── Actions: git tag, push tag
├── Wait: ALL CI jobs green
└── Verify: Artifacts exist (PyPI, GHCR)
```

```
KP-XX: Test vX.Y.Z in clean sandbox
├── Blocked by: CI green
├── Actions: Fresh venv, pip install, test
└── Verification: New user experience works
```

### Phase 5: Public Release

```
KP-XX: Publish vX.Y.Z to ClawHub
├── Blocked by: Sandbox test
├── Actions: clawhub publish
└── Verify: clawhub.ai listing updated
```

```
KP-XX: Sync vX.Y.Z to nteg mirror
├── Blocked by: ClawHub publish
├── Actions: git push nteg main, push tag
└── Verification: Public mirror updated
```

## Quick Reference: Issue Chain

```
Implementation
     │
     ▼
Documentation Update        ← NEW STEP
     │
     ▼
Test on Staging
     │
     ▼
Merge to Staging Main
     │
     ▼
Push to Origin
     │
     ▼
Tag + CI Green
     │
     ▼
Clean Sandbox Test
     │
     ▼
Publish ClawHub
     │
     ▼
Sync nteg Mirror
     │
     ▼
RELEASE COMPLETE
```

## How to Pick Up Where You Left Off

1. Open Linear → keep-protocol team
2. Find the active release project (e.g., "v0.3.0 — Viral Adoption")
3. Look for the **first issue that is NOT blocked**
4. That's your current step
5. Complete it, mark Done, move to next

## Creating a New Release

When starting a new version release:

### 1. Create or use existing project

```
Project: keep-protocol vX.Y.Z — [Theme]
Example: keep-protocol v0.4.0 — Public Relays
```

### 2. Create issues using this template

Copy the issue structure above. For each feature in the release:

- One implementation issue
- One documentation issue (blocked by implementation)
- One test issue (blocked by documentation)
- Share the remaining release issues (merge, push, tag, sandbox, clawhub, sync)

### 3. Set up blockers

Each issue should be blocked by the previous one:

```
Implementation → Documentation → Test → Merge → Push → Tag → Sandbox → ClawHub → Sync
```

### 4. Start work

Begin with the implementation issue. The chain guides you through.

## Example: v0.5.0 Release (with docs)

| Issue | Title                            | Blocked By |
| ----- | -------------------------------- | ---------- |
| KP-30 | Implement semantic routing       | —          |
| KP-31 | Update docs for semantic routing | KP-30      |
| KP-32 | Test on staging                  | KP-31      |
| KP-33 | Merge to staging main            | KP-32      |
| KP-34 | Push to origin                   | KP-33      |
| KP-35 | Tag v0.5.0 + CI                  | KP-34      |
| KP-36 | Clean sandbox test               | KP-35      |
| KP-37 | Publish ClawHub                  | KP-36      |
| KP-38 | Sync nteg mirror                 | KP-37      |

## Anti-Patterns (Don't Do These)

| Wrong                              | Right                        |
| ---------------------------------- | ---------------------------- |
| Push feature branch to origin      | Push to staging first        |
| Skip staging tests                 | Always test on staging       |
| Tag before updating docs           | Docs are part of the release |
| Publish to ClawHub before CI green | Wait for ALL jobs green      |
| Forget to sync nteg mirror         | Always sync after ClawHub    |
| Create issues without blockers     | Chain every issue            |
| Update CHANGELOG after release     | CHANGELOG before tagging     |

## Session Handoff

When ending a session, note in the session close:

- Current issue ID (e.g., "Stopped at KP-16")
- What's done, what's remaining
- Any blockers or questions

When starting a session:

1. Query last session for context
2. Check Linear for current issue
3. Continue from where you left off

---

_Template established: Feb 3, 2026_
_Updated: Feb 3, 2026 — Added documentation phase to release workflow_
_Based on KP-11 release workflow lessons learned_
