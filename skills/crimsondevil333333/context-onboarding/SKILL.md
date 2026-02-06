---
name: context-onboarding
description: Provide new contributors and agents with a concise tour of the workspace identity files (SOUL.md, USER.md, AGENTS.md, TOOLS.md) plus onboarding tips. Use when a newcomer needs context or when you want to double-check how this workspace is configured.
---

# Context Onboarding

## When to use this skill

- You're guiding someone new through Clawdy/Clawd and want a quick summary of the personality, operating rules, and per-skill notes.
- You need to remind yourself of the tone preferences or tooling constraints without reading every document top to bottom.

## What it does

- `scripts/context_onboarding.py` reads the key documents (`SOUL.md`, `USER.md`, `AGENTS.md`, `TOOLS.md` by default) and prints the first few lines of each so you can skim character, rules, and tooling notes.
- The CLI supports `--files` to include additional documents, `--lines` to control how many lines are shown per file, and `--brief` to emit only the opening sentence of each section.
- Use `references/context-guidelines.md` when you need more guidance about what newcomers should read next or how to keep the vibe consistent.

## CLI usage

- `python3 skills/context-onboarding/scripts/context_onboarding.py` summarizes the default identity docs and prints the first five lines per file.
- Add `--files docs/PLAYBOOK.md docs/ROLE.md` to weave in extra reference material that onboards the newcomer to cadence notes or release rituals.
- Pair `--lines 2` with `--brief` to emit single-line headlines when you just need the gist.
- `--workspace /path/to/other-workspace` lets you compare multiple workspaces or prepare summaries for a sister repo before pairing.

## Example command

```bash
python3 skills/context-onboarding/scripts/context_onboarding.py --files references/context-guidelines.md HEARTBEAT.md --lines 2
```

This prints the opening two lines for the personality files plus the heartbeat and onboarding guide so you can review vibe, reminders, and cadence expectations without opening every file.

## Options

- `--files <path>`: Accepts extra markdown files (comma/space separated) that the script should include in the output order you provide.
- `--lines <n>`: Controls how many lines from each file are shown (default 5) so you can tighten or loosen the briefing.
- `--brief`: Shrinks each preview to the first sentence (splitting on `.`, `?`, or `!`). Use this for lightning summaries during sync calls.
- `--workspace <dir>`: Point the CLI at another workspace root; useful for onboarding clones, reviewing experimental docs, or prepping a new repo.

## References

- `references/context-guidelines.md` documents onboarding topics, role expectations, cadence notes, and reminders for how this group runs.

## Resources

- **GitHub:** https://github.com/CrimsonDevil333333/context-onboarding
- **ClawHub:** https://www.clawhub.ai/skills/context-onboarding
