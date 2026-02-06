# Clawbridge Skill

> **Optional:** Adds `/clawbridge` chat command to OpenClaw. It calls the runner.

## Do You Need This?

**Most users don't need this skill.** Use the CLI directly:

```bash
clawbridge run
```

Only install this skill if you want to trigger Clawbridge from OpenClaw chat.

## Install

**First, set up Clawbridge runner:**

1. Go to **https://clawbridge.cloud**
2. Create an account and workspace
3. Follow the install instructions

**Then install this skill:**

```bash
openclaw skills install claw-clawbridge
```

## Usage

In OpenClaw chat:

```
/clawbridge
```

## What It Does

1. Runs `clawbridge run`
2. Parses output (`VAULT_URL=`, `CANDIDATES_COUNT=`)
3. Replies with candidate count and Vault link

## Architecture

- **Skill = thin trigger** (this repo)
- **Runner = product engine** (private, owns all logic)

The skill does NOT contain discovery prompts, venues, or business logic.

## License

MIT
