---
name: ops-dashboard
description: Gather operational signals (disk usage, git status, recent commits, and resources) so you can answer "How is the Clawdy infrastructure doing?" without manually running multiple checks.
---

# Ops Dashboard

## Overview

`ops-dashboard` exposes a single CLI (`scripts/ops_dashboard.py`) that prints a snapshot of:

- Workspace disk usage (total vs. free) and storage availability.
- Git status and the latest commits for the current branch.
- System load averages plus the top-level directory sizes so you know where data is accumulating.

Use this skill whenever you need to check health before deployments, push updates, or support teammates struggling with a slow workspace.

## CLI usage

- `python3 skills/ops-dashboard/scripts/ops_dashboard.py --show summary` prints disk usage, git status, and top directories.
- `--show resources` adds load averages and a break-down of recent git commits with author/summary.
- `--workspace /path/to/workspace` lets you point the tool at another clone or repo.
- `--output json` emits the same report as JSON so other scripts can consume it.

## Metrics explained

- **Disk usage:** Reports `df` results for `/`, `/mnt/ramdisk`, and any other mounted tiers in the workspace.
- **Git status:** Shows whether the current branch is clean, lists staged/unstaged files, and prints the last three commits with sha/author.
- **Load averages:** Captures the 1/5/15 minute loads so you can correlate slowdowns with heavy resource usage.
- **Directory sizes:** Highlights the three largest directories inside the workspace root so you can spot growth vectors.

## Sample command

```bash
python3 skills/ops-dashboard/scripts/ops_dashboard.py --show summary --workspace /path/to/workspace (or omit to use the current directory)
```

This command displays the basic health story for the current repo, including git status and disk usage, before you start a risky task.

## References

- `references/ops-dashboard.md` explains the meaning of each metric and how to interpret alerts like high disk usage or stale branches.

## Resources

- **GitHub:** https://github.com/CrimsonDevil333333/ops-dashboard
- **ClawHub:** https://www.clawhub.ai/skills/ops-dashboard
