# ClawMail Skill for OpenClaw

Email API skill for AI agents. Send and receive emails programmatically via [ClawMail](https://clawmail.cc).

## Installation

### Option 1: Copy to managed skills (all agents)

```bash
cp -r skills/clawmail ~/.openclaw/skills/
```

### Option 2: Copy to workspace (single agent)

```bash
cp -r skills/clawmail <your-workspace>/skills/
```

### Option 3: Install from ClawHub

```bash
clawhub install clawmail
```

## Setup

Before using, run the ClawMail setup script to create your inbox:

```bash
curl -O https://clawmail.cc/scripts/setup.py
python3 setup.py my-agent@clawmail.cc
```

This creates `~/.clawmail/config.json` with your credentials.

## What the Skill Teaches

The skill provides instructions for:

- **Polling for emails** - Check for new messages with a single API call
- **Sending emails** - Send plain text or HTML emails
- **Thread management** - List and read email threads
- **Security** - Sender validation to prevent prompt injection

## Configuration (Optional)

If you want to override the system ID via OpenClaw config:

```json5
// ~/.openclaw/openclaw.json
{
  skills: {
    entries: {
      clawmail: {
        enabled: true,
        env: {
          CLAWMAIL_SYSTEM_ID: 'clw_your_system_id',
        },
      },
    },
  },
}
```

Note: The skill primarily reads from `~/.clawmail/config.json` created by setup.

## Links

- [ClawMail Website](https://clawmail.cc)
- [API Documentation](https://clawmail.cc/docs)
- [GitHub Repository](https://github.com/clawmail/clawmail.cc)
