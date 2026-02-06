# Context Onboarding

Context Onboarding gives you a curated summary of the identity docs that define this workspace: the personality (SOUL.md), the user guidance (USER.md), agent rules (AGENTS.md), and tooling notes (TOOLS.md). It is the perfect skill to run when someone joins the community, when you inherit a new workspace, or when you just want a refresher on how to stay in sync.

## Features

- CLI script at `skills/context-onboarding/scripts/context_onboarding.py` that reads the most relevant markdown files and prints the first few lines from each so you can skim key points instantly.
- Optional `--files` flag to include extra docs (e.g., playbooks or onboarding guides) plus `--lines`/`--brief` knobs for longer or shorter outputs.
- Built-in reference guide (`references/context-guidelines.md`) that explains what to highlight during onboarding calls or documentation drops.

## Usage

```bash
python3 skills/context-onboarding/scripts/context_onboarding.py --lines 4
```

Add `--files docs/PLAYBOOK.md` if you want to weave in other material, or `--brief` to limit the output to one sentence per doc.

## Testing

```bash
python3 -m unittest discover skills/context-onboarding/tests
```

## Packaging & release

```bash
python3 $(npm root -g)/openclaw/skills/skill-creator/scripts/package_skill.py skills/context-onboarding
```

## Links

- **GitHub:** https://github.com/CrimsonDevil333333/context-onboarding
- **ClawHub:** https://www.clawhub.ai/skills/context-onboarding
