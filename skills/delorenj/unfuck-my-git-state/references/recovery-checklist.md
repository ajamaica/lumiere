# Recovery Checklist

Run this checklist before and after each remediation step.

## Preflight

1. Confirm repo path:

```bash
git rev-parse --show-toplevel
```

2. Capture a snapshot:

```bash
bash scripts/snapshot_git_state.sh .
```

3. If history looks fragile, back up metadata:

```bash
tar -czf git-metadata-backup-$(date +%Y%m%d-%H%M%S).tar.gz .git
```

## Post-Fix Verification Gate

1. Status and branch coherence:

```bash
git status
git branch --show-current
git symbolic-ref -q HEAD
```

2. Worktree integrity:

```bash
git worktree list --porcelain
```

3. Ref health:

```bash
git show-ref --head >/dev/null
git fsck --full --no-reflogs
```

4. Smoke test normal operations:

```bash
git rev-parse HEAD
git log --oneline -n 3
```

## Hard Stop Conditions

Stop and escalate if any of these remain true:

- `git status` prints a fatal error.
- `git symbolic-ref -q HEAD` is empty but detached HEAD is not intentional.
- `git worktree list --porcelain` still references missing paths after prune.
- `git fsck` introduces new critical corruption.
