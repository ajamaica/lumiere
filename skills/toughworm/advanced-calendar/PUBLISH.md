# Publishing Instructions for Advanced Calendar Skill

## Package Structure

The skill package includes:

```
calendar/
├── SKILL.md                    # Skill metadata and documentation
├── README.md                   # Overview and quick start
├── scripts/                    # Calendar command scripts
│   ├── calendar.sh             # Main calendar commands
│   ├── check-reminders.sh      # Reminder checking
│   ├── create-event-interactive.sh # Interactive creation
│   ├── parse-and-create-event.sh # Natural language parsing
│   └── reminders.sh            # Standalone reminders
├── integration/                # OpenClaw integration
│   ├── openclaw_integration.py # Main integration handler
│   └── intent_handler.py       # Natural language processing
├── docs/                       # Documentation
│   ├── usage.md                # Usage instructions
│   └── installation.md         # Installation guide
└── tests/                      # Test suite
```

## Publishing Process

### 1. Prepare Your Environment

Make sure you have the clawhub CLI installed:

```bash
npm install -g clawhub
```

### 2. Login to ClawHub

```bash
clawhub login
```

Follow the prompts to authenticate with your GitHub account.

### 3. Navigate to the Skills Directory

```bash
cd /home/ubuntu/.openclaw/workspace/skills
```

### 4. Publish the Skill

```bash
clawhub publish calendar --slug advanced-calendar --name "Advanced Calendar" --version 1.0.2 --changelog "Version 1.0.2: Added multi-channel notifications and persistent reminders that repeat every 15 minutes until acknowledged"
```

## Post-Publishing Verification

After publishing:

1. Verify the skill appears in the clawhub repository
2. Test installation with: `clawhub install advanced-calendar`
3. Confirm all functionality works as expected
4. Check documentation renders correctly

## Versioning

Follow semantic versioning (SemVer):
- MAJOR version for incompatible API changes
- MINOR version for functionality added in a backwards-compatible manner
- PATCH version for backwards-compatible bug fixes

## Maintaining the Skill

- Monitor user feedback and issues
- Respond to bug reports promptly
- Add new features based on user requests
- Keep documentation up-to-date
- Test compatibility with new OpenClaw versions