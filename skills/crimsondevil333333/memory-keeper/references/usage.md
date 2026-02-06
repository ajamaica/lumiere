# Memory Keeper usage reference

## Typical workflow

1. Update the workspace memory files (`memory/*.md`, `MEMORY.md`, and `AGENTS.md`, `SOUL.md`, `USER.md`, `TOOLS.md`, `HEARTBEAT.md`) as you go.
2. Run Memory Keeper to copy them to a dedicated archive directory or git repo, e.g.:
   ```bash
   python3 skills/memory-keeper/scripts/memory_sync.py --target ~/clawdy-memories --commit --message "Post-session sync" --remote https://github.com/CrimsonDevil333333/clawdy-memories.git --push
   ```
3. The archive retains the same folder structure, so you can always pull it back into another workspace or inspect the history when you need context recovery.

## CLI options

- `--workspace / -w`: Path to your OpenClaw workspace (default: current directory).
- `--target / -t`: Destination folder for the archive (default: `<workspace>/memory-archive`).
- `--commit`: Run `git add .` and `git commit` after copying.
- `--message`: Commit message (default: `Update memory archive`).
- `--remote`: Optional git remote URL to configure before pushing.
- `--branch`: Branch name for push (default: `master`).
- `--push`: Push the commit after it is created (requires `--remote`).
- `--allow-extra`: Additional workspace globs to include (e.g., `--allow-extra extra-notes.md`).
- `--skip-memory`: Exclude `memory/` if you only want the high-level docs.

## Automation tips

- Install this skill on any agent that needs a resilient memory archive; just configure `--target` to a repo that you control.
- Run Memory Keeper before risky operations (system upgrades, config changes, restarts) so you can roll back with your last memory snapshot.
- Call `memory_sync.py` from a cron job or heartbeat check when you need regular backups, but add `--commit --message "Heartbeat sync"` and avoid `--push` unless you really need remote updates to prevent noise.

## Troubleshooting

- **`git` errors**: ensure the destination is writable and that you have `git` installed on your system.
- **Remote refused or authentication failed**: Memory Keeper now surfaces the exact git command that failed and reminds you to configure your credential helper, SSH key, or embed a personal access token. Run `git remote -v` inside the archive to check the URL and try `GIT_ASKPASS=echo` + your token if needed.
- **Files missing**: confirm you ran the command from the correct workspace or pass `--workspace` explicitly.

## Logging

Each successful sync appends a bullet to the current day’s `memory/YYYY-MM-DD.md` so you can trace when the memory archive last changed. If you ever need to audit a run, just read that entry for the snapshot path, commit/push flags, and remote URL used.
