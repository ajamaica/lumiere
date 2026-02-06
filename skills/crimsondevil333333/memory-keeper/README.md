# Memory Keeper skill

Memory Keeper copies the OpenClaw memory journal files (`memory/*.md`, `MEMORY.md`, `AGENTS.md`, `SOUL.md`, `USER.md`, `TOOLS.md`, `HEARTBEAT.md`) into a dedicated archive folder or repository. Use it whenever you need a durable snapshot of your agent context before risky operations, updates, or migrations.

## Key highlights

- **Automated snapshots**: Copies the core documents plus optional globs via `--allow-extra` while keeping the workspace structure intact.
- **Git-ready**: Optionally initializes a repository inside the archive, commits the snapshot, configures a remote, and pushes the new branch.
- **Logs its own work**: Every successful run appends a timestamped entry to today’s `memory/YYYY-MM-DD.md`, so the journal records when and where the archive changed.
- **Friendly failures**: If an authentication error happens while configuring or pushing to a remote, the CLI prints a helpful reminder about tokens/SSH keys instead of crashing.

## Usage

```bash
python3 skills/memory-keeper/scripts/memory_sync.py \
  --target ~/clawdy-memories --commit --message "Post-session" --remote https://github.com/your-org/clawdy-memories.git --push
```

Pass `--skip-memory` when you only want the top-level metadata files, or `--allow-extra extra-notes.md` to snapshot additional assets.

## Logging & tokens

Memory Keeper now writes a bullet to `memory/YYYY-MM-DD.md` after each successful run. Look there for entries like:

```
- [2026-02-03 12:00:00 IST] Memory Keeper synced to /path/to/archive (commit=True, push=False, remote=https://...)
```

If a git command fails because the remote needs a token, the CLI will report `Git command 'git -C ... <args>' failed` and remind you to configure your credential helper or embed the token/SSH key in the URL. This keeps the tool readable even when authentication isn’t set up yet.

## Testing

Run the unit tests from the workspace root:

```bash
python3 -m unittest discover skills/memory-keeper/tests
```

These tests cover copying defaults, logging entries, and gracefully handling git errors.

## Packaging & releases

When you’re ready to deliver a release, package the skill:

```bash
python3 $(npm root -g)/openclaw/skills/skill-creator/scripts/package_skill.py skills/memory-keeper
```

Share the resulting `memory-keeper.skill` file via ClawHub or GitHub releases.

## Links

- **GitHub:** https://github.com/CrimsonDevil333333/memory-keeper
- **ClawHub:** https://www.clawhub.ai/skills/memory-keeper
