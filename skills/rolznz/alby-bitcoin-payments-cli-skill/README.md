# Alby Bitcoin Payments CLI Skill

Agent Skill for [Alby CLI](https://github.com/getAlby/cli)

## Getting Started

### 🚀 Install with single command

```bash
npx skills add getAlby/alby-cli-skill
```

### 🦞 OpenClaw

1. Tell your agent to install the skill:

```txt
Install this skill as a custom skill: https://raw.githubusercontent.com/getAlby/alby-cli-skill/refs/heads/master/SKILL.md
```

2. Save a wallet connection secret at `~/.alby-cli/connection-secret.key`.

> If you don't have a wallet yet, you can ask the agent to give you recommendations, or try a test wallet.

3. Verify it's working. ask "What's your wallet balance"?

## Test Wallets

You can also tell your agent to create a test wallet to try the CLI.

### Example prompt

```txt
make 2 test wallets for me and save them. Call them alice and bob. Then send 1000 sats from alice to bob.
```
