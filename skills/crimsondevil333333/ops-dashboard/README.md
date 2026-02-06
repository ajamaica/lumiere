# Ops Dashboard

Ops Dashboard summarizes workspace health so you can confidently answer operational questions without hopping between terminals. The CLI in `skills/ops-dashboard/scripts/ops_dashboard.py` gathers disk usage, git status, recent commits, and load averages into a single report.

## Running the dashboard

```bash
python3 skills/ops-dashboard/scripts/ops_dashboard.py --workspace . --show summary
```

- `--show summary` prints disk usage, git status, and the top three directories by size.
- `--show resources` prints load averages, disk usage, and the last three git commits.
- The script handles non-git folders by printing a friendly message instead of crashing.

## Testing

```bash
python3 -m unittest discover skills/ops-dashboard/tests
```

## Packaging & release

```bash
python3 $(npm root -g)/openclaw/skills/skill-creator/scripts/package_skill.py skills/ops-dashboard
```

## Links

- **GitHub:** https://github.com/CrimsonDevil333333/ops-dashboard
- **ClawHub:** https://www.clawhub.ai/skills/ops-dashboard
