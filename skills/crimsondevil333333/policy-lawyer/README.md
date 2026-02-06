# Policy Lawyer

Policy Lawyer keeps the workspace policies within reach. It reads `references/policies.md` and helps you quote the right clause when the team needs clarity on tone, data usage, or collaboration etiquette.

## Usage

```bash
python3 skills/policy-lawyer/scripts/policy_lawyer.py --list-topics
python3 skills/policy-lawyer/scripts/policy_lawyer.py --topic "Tone"
python3 skills/policy-lawyer/scripts/policy_lawyer.py --keyword security
```

## Testing

```bash
python3 -m unittest discover skills/policy-lawyer/tests
```

## Packaging & release

```bash
python3 $(npm root -g)/openclaw/skills/skill-creator/scripts/package_skill.py skills/policy-lawyer
```

## Links

- **GitHub:** https://github.com/CrimsonDevil333333/policy-lawyer
- **ClawHub:** https://www.clawhub.ai/skills/policy-lawyer
