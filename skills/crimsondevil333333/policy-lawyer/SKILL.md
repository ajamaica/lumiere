---
name: policy-lawyer
description: Reference the workspace policy playbook, answer "What are the rules for tone, data, and collaboration?" by searching the curated policy doc or listing its sections.
---

# Policy Lawyer

## Overview

`policy-lawyer` is built around the curated policy notebook at `references/policies.md`. The CLI (`scripts/policy_lawyer.py`) lets you:

- `--list-topics` to list every policy heading.
- `--topic <name>` to show the section that matches a topic (case-insensitive).
- `--keyword <term>` to search all policies for a given keyword.
- `--policy-file <path>` to point at a different policy document when comparing workspaces.

Use this skill when you need to remind yourself of the community standards before drafting announcements or when a question lands that needs an authoritative policy quote.

## CLI usage

- `python3 skills/policy-lawyer/scripts/policy_lawyer.py --list-topics` prints every section defined under `## <Section Name>` in the policy reference.
- `--topic "Tone"` prints the tone guidelines exactly as written so you can quote them during calm reminders.
- `--keyword security` (or any other keyword) shows the matching lines across all sections so you can quickly see where that topic is governed.
- Supply `--policy-file /path/to/repo/references/policies.md` when you want to interrogate a copy of the playbook from another workspace.

## Sample commands

```bash
python3 skills/policy-lawyer/scripts/policy_lawyer.py --topic Tone
python3 skills/policy-lawyer/scripts/policy_lawyer.py --keyword data --policy-file ../other-workspace/references/policies.md
```

The first command prints the tone section; the second searches for "data" inside another workspace's policies and prints each matching snippet.

## References

- `references/policies.md` is the curated policy playbook that lists tone, data, collaboration, and security rules.

## Resources

- **GitHub:** https://github.com/CrimsonDevil333333/policy-lawyer
- **ClawHub:** https://www.clawhub.ai/skills/policy-lawyer
