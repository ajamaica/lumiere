# Collaboration Helper

Collaboration Helper is your lightweight task tracker for the community. It records action items in `skills/collaboration-helper/data/tasks.json` and keeps everyone aligned on who is working on what.

## Commands

- `list`: show every task, grouping by status.
- `add <title>`: create a new task with `--owner`, `--priority`, and `--note` fields.
- `complete <id>`: mark a task as done.

Example:

```bash
python3 skills/collaboration-helper/scripts/collaboration_helper.py add "Review policy" --owner legal --priority high
python3 skills/collaboration-helper/scripts/collaboration_helper.py list
python3 skills/collaboration-helper/scripts/collaboration_helper.py complete 1
```

## Testing

```bash
python3 -m unittest discover skills/collaboration-helper/tests
```

## Packaging & release

```bash
python3 $(npm root -g)/openclaw/skills/skill-creator/scripts/package_skill.py skills/collaboration-helper
```

## Links

- **GitHub:** https://github.com/CrimsonDevil333333/collaboration-helper
- **ClawHub:** https://www.clawhub.ai/skills/collaboration-helper
