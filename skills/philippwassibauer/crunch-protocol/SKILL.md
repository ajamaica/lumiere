---
name: crunch-protocol-skill
description: Natural language interface for Crunch Protocol CLI. Maps user requests to CLI commands for managing coordinators, competitions (crunches), rewards, and checkpoints. Supports output formatting for Slack, Telegram, Discord, or plain text.
---

# Crunch Protocol CLI Skill

This skill translates natural language queries into `crunch-cli` CLI commands and formats outputs for various mediums.

## Setup

Ensure the CLI is installed globally:

```bash
npm install -g @crunchdao/crunch-cli
```

Verify installation:

```bash
crunch-cli --version
```

## Profiles

Profiles are stored in `profiles.json` (next to this file). Each profile maps a short name to a set of CLI flags so users can say things like _"list crunches for m-jeremy"_ instead of typing full addresses every time.

### Profile file format

```json
{
  "profiles": {
    "m-jeremy": {
      "url": "https://mainnet.helius-rpc.com/?api-key=...",
      "wallet": "/path/to/keypair.json",
      "multisigAddress": "9WzDXwBbmkg8...",
      "coordinatorWallet": "5abc..."
    },
    "devnet": {
      "url": "devnet",
      "wallet": "/path/to/dev-keypair.json",
      "coordinatorWallet": ""
    }
  }
}
```

### Profile fields → CLI flags

| Profile field       | CLI flag                      | Notes                                                                                                       |
| ------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `url`               | `-u <value>`                  | RPC URL or moniker: `mainnet-beta`, `devnet`, `testnet`, `localhost`                                        |
| `wallet`            | `-w <value>`                  | Path to Solana keypair. Only used in multisig mode when the wallet is a proposer.                           |
| `multisigAddress`   | `-m <value>`                  | Squads multisig address (not the vault).                                                                    |
| `coordinatorWallet` | appended to `coordinator get` | The coordinator owner address. When set, default to this coordinator's context (e.g. listing its crunches). |

### How to resolve a profile

When a user references a profile name:

1. Read `profiles.json` from the skill directory.
2. Look up the profile by name (case-insensitive match).
3. Map each non-empty field to its CLI flag (see table above).
4. Prepend the flags to whatever command is being built.

**Example:** User says _"list crunches for m-jeremy"_

1. Load profile `mainnet-proposer` → `{ url: "https://mainnet...", wallet: "/path/...", multisigAddress: "9WzDX..." }`
2. Build: `crunch-cli -u "https://mainnet..." -w "/path/..." -m "9WzDX..." crunches list`

**Example:** User says _"show coordinator for devnet"_

1. Load profile `devnet` → `{ url: "devnet" }`
2. Build: `crunch-cli -u devnet coordinator get`

### Managing profiles

- Users can ask to **add**, **update**, or **remove** profiles. When they do, read the current `profiles.json`, apply the change, and write it back.
- If `profiles.json` doesn't exist yet, create it with the structure above.
- When a user says _"set profile to m-jeremy"_ or _"use profile m-jeremy"_, remember it for the rest of the conversation and apply those flags to all subsequent commands automatically.

## Command Mapping Rules

### IMPORTANT: Direct Phrase Mapping

For speed and consistency, map these phrases **directly** to CLI commands without LLM interpretation:

| User Phrase Pattern            | CLI Command                                         |
| ------------------------------ | --------------------------------------------------- |
| `get info about crunch <name>` | `crunch-cli crunch get "<name>"`                    |
| `get crunch <name>`            | `crunch-cli crunch get "<name>"`                    |
| `show crunch <name>`           | `crunch-cli crunch get "<name>"`                    |
| `crunch details <name>`        | `crunch-cli crunch get "<name>"`                    |
| `get coordinator <address>`    | `crunch-cli coordinator get "<address>"`            |
| `show coordinator`             | `crunch-cli coordinator get`                        |
| `my coordinator`               | `crunch-cli coordinator get`                        |
| `list crunches`                | `crunch-cli crunches list`                          |
| `list my crunches`             | `crunch-cli crunches list`                          |
| `show all crunches`            | `crunch-cli crunches list`                          |
| `get config`                   | `crunch-cli coordinator get-config`                 |
| `coordinator config`           | `crunch-cli coordinator get-config`                 |
| `checkpoint for <name>`        | `crunch-cli crunch checkpoint-get-current "<name>"` |
| `current checkpoint <name>`    | `crunch-cli crunch checkpoint-get-current "<name>"` |
| `set certificate`              | `crunch-cli coordinator cert set`                   |
| `set cert`                     | `crunch-cli coordinator cert set`                   |
| `update certificate`           | `crunch-cli coordinator cert set`                   |
| `get certificate`              | `crunch-cli coordinator cert get`                   |
| `get cert`                     | `crunch-cli coordinator cert get`                   |
| `show certificate`             | `crunch-cli coordinator cert get`                   |
| `my certificate`               | `crunch-cli coordinator cert get`                   |
| `sweep tokens <name>`          | `crunch-cli crunch sweep-token-accounts "<name>"`   |
| `sweep token accounts <name>`  | `crunch-cli crunch sweep-token-accounts "<name>"`   |
| `check prize accounts <name>`  | `crunch-cli crunch check-prize-atas "<name>"`       |
| `check atas <name>`            | `crunch-cli crunch check-prize-atas "<name>"`       |
| `map cruncher addresses`       | `crunch-cli crunch map-cruncher-addresses`          |
| `emission checkpoint add`      | `crunch-cli crunch emission-checkpoint-add`         |

### Name Extraction Rules

- When a crunch name is provided, wrap it in quotes in the CLI command
- Common competition names: Crunch, Competition, Tournament, Challenge

## Execution Pattern

1. **Parse** the user request to identify:
   - The action (get, create, start, end, list, etc.)
   - The target (crunch, coordinator, checkpoint, etc.)
   - The name/identifier if applicable
   - Any additional parameters

2. **Map** to CLI command using the direct mapping table above

3. **Execute** the command:

   ```bash
   crunch-cli [options] <command> [arguments]
   ```

4. **Format** The output of the CLI should be kept as close as possible, except if the user told you to post process the data. But map the output for the specified medium (see Output Formatting below as reference to use)

## Available Commands Reference

### Coordinator Commands

| Command                           | Description                   | Usage                                                                   |
| --------------------------------- | ----------------------------- | ----------------------------------------------------------------------- |
| `coordinator get [owner]`         | Get coordinator details       | `crunch-cli coordinator get [address]`                                  |
| `coordinator get-config`          | Get coordinator configuration | `crunch-cli coordinator get-config`                                     |
| `coordinator register <name>`     | Register new coordinator      | `crunch-cli coordinator register "Name"`                                |
| `coordinator reset-hotkey`        | Reset SMP hotkey              | `crunch-cli coordinator reset-hotkey`                                   |
| `coordinator set-emission-config` | Set emission percentages      | `crunch-cli coordinator set-emission-config <coord%> <staker%> <fund%>` |

### Certificate Commands

| Command                                    | Description          | Usage                                                         |
| ------------------------------------------ | -------------------- | ------------------------------------------------------------- |
| `coordinator cert set <pubkey> [--slot N]` | Set certificate hash | `crunch-cli coordinator cert set "MIIBIjAN..." [--slot 0\|1]` |
| `coordinator cert get [owner]`             | Get certificate info | `crunch-cli coordinator cert get [address]`                   |

### Crunch Commands (Competition Management)

| Command                          | Description             | Usage                                                            |
| -------------------------------- | ----------------------- | ---------------------------------------------------------------- |
| `crunch get <name>`              | Get crunch details      | `crunch-cli crunch get "Synth"`                                  |
| `crunches list [wallet]`         | List all crunches       | `crunch-cli crunches list`                                       |
| `crunch create`                  | Create new crunch       | `crunch-cli crunch create "Name" <payoutUSDC> [maxModels]`       |
| `crunch start <name>`            | Start competition       | `crunch-cli crunch start "Name"`                                 |
| `crunch end <name>`              | End competition         | `crunch-cli crunch end "Name"`                                   |
| `crunch deposit-reward`          | Deposit USDC            | `crunch-cli crunch deposit-reward "Name" <amount>`               |
| `crunch margin <name>`           | Execute margin payout   | `crunch-cli crunch margin "Name"`                                |
| `crunch drain <name>`            | Drain remaining USDC    | `crunch-cli crunch drain "Name"`                                 |
| `crunch get-cruncher`            | Get cruncher details    | `crunch-cli crunch get-cruncher "CrunchName" <wallet>`           |
| `crunch sweep-token-accounts`    | Sweep tokens to vault   | `crunch-cli crunch sweep-token-accounts "Name"`                  |
| `crunch check-prize-atas`        | Check USDC accounts     | `crunch-cli crunch check-prize-atas "Name"`                      |
| `crunch map-cruncher-addresses`  | Map cruncher addresses  | `crunch-cli crunch map-cruncher-addresses "CoordName"`           |
| `crunch emission-checkpoint-add` | Add emission checkpoint | `crunch-cli crunch emission-checkpoint-add "CoordName" <amount>` |

### Checkpoint Commands

| Command                         | Description             | Usage                                                               |
| ------------------------------- | ----------------------- | ------------------------------------------------------------------- |
| `crunch checkpoint-create`      | Create checkpoint       | `crunch-cli crunch checkpoint-create "Name" prizes.json [--dryrun]` |
| `crunch checkpoint-get-current` | Current checkpoint      | `crunch-cli crunch checkpoint-get-current "Name"`                   |
| `crunch checkpoint-get`         | Get checkpoint by index | `crunch-cli crunch checkpoint-get "Name" <index>`                   |

### Global Options

- `-u, --url <network>` - Network: mainnet-beta, devnet, localhost (default: from config)
- `-w, --wallet <path>` - Wallet keypair file path
- `-o, --output json` - Output as JSON (useful for parsing)
- `-m, --multisig <addr>` - Create multisig proposal instead of direct execution

## Output Formatting

### Medium Detection

Detect output medium from user request:

- "for slack" / "slack format" → Slack
- "for telegram" / "telegram format" → Telegram
- "for discord" / "discord format" → Discord
- Default → Plain text / Markdown

### Slack Format

```
*🏆 Crunch: Synth*
━━━━━━━━━━━━━━━━━
• *Status:* Active
• *Participants:* 142
• *Prize Pool:* 10,000 USDC
• *Checkpoint:* 5
* *Funds:* 3000USDC
```

### Telegram Format

```
🏆 <b>Crunch: Synth</b>

📊 Status: Active
👥 Participants: 142
💰 Prize Pool: 10,000 USDC
📍 Checkpoint: 5
💰 Funds: 3000USDC
```

### Discord Format

```
## 🏆 Crunch: Synth
**Status:** Active
**Participants:** 142
**Prize Pool:** 10,000 USDC
**Checkpoint:** 5
```

### Plain Text / Default

```
Crunch: Synth
Status: Active
Participants: 142
Prize Pool: 10,000 USDC
Checkpoint: 5
Funds: 3000USDC
```

## Error Handling

If a command fails:

1. Show user-friendly error message
2. Suggest possible fixes:
   - Wrong network? Add `-u devnet` or `-u mainnet-beta`
   - Missing wallet? Add `-w /path/to/wallet.json`
   - Crunch not found? List available crunches with `crunches list`

## Example Workflows

### "Get me info about crunch Synth"

```bash
crunch-cli crunch get "Synth"
```

### "Show my coordinator on mainnet"

```bash
crunch-cli -u mainnet-beta coordinator get
```

### "List all crunches for slack"

```bash
crunch-cli crunches list
```

Then format output for Slack.

### "What's the current checkpoint for the Chaos competition?"

```bash
crunch-cli crunch checkpoint-get-current "Chaos"
```

## Reference Documentation

For full CLI documentation, see [references/cli-reference.md](references/cli-reference.md).
