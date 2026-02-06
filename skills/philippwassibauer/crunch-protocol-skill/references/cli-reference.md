# Coordinator CLI Full Reference

## Package Information

- **Name:** `@crunchdao/coordinator-cli`
- **Binary:** `crunch-cli`
- **Version:** 4.3.2+

## Installation

```bash
npm install -g @crunchdao/crunch-cli
```

## Configuration

### Global Config File

Location: `~/.crunch/config.json`

```json
{
  "network": "devnet",
  "wallet": "./accounts/coordinator.json",
  "loglevel": "info"
}
```

### Config Commands

```bash
crunch-cli config set <key> <value>
crunch-cli config show
crunch-cli config use-profile <profile>
```

## Network Options

| Moniker        | Description                      |
| -------------- | -------------------------------- |
| `mainnet-beta` | Solana Mainnet                   |
| `devnet`       | Solana Devnet                    |
| `testnet`      | Solana Testnet                   |
| `localhost`    | Local validator (127.0.0.1:8899) |

## Complete Command Reference

### Coordinator Management

#### `coordinator register <name>`

Register a new coordinator with the protocol.

```bash
crunch-cli coordinator register "AI Research Lab"
```

**Requirements:**

- Unique coordinator name
- Sufficient SOL for account creation
- Later requires admin approval

---

#### `coordinator get [owner]`

Get coordinator details by owner address.

```bash
# Current wallet
crunch-cli coordinator get

# Specific address
crunch-cli coordinator get "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
```

**Output Fields:**

- Owner address
- Coordinator name
- Registration status
- Approval status
- Hotkey information

---

#### `coordinator get-config`

Get coordinator configuration from the protocol.

```bash
crunch-cli coordinator get-config
```

**Output Fields:**

- Protocol parameters
- Fee configurations
- Margin percentages

---

#### `coordinator reset-hotkey`

Reset/regenerate the SMP hotkey for the coordinator.

```bash
crunch-cli coordinator reset-hotkey
```

---

#### `coordinator set-emission-config <coordinatorPct> <stakerPct> <crunchFundPct>`

Set emission configuration percentages.

```bash
crunch-cli coordinator set-emission-config 50 40 10
```

**Note:** Percentages must sum to 100.

---

### Competition (Crunch) Management

#### `crunches list [wallet]`

List all crunches for a coordinator.

```bash
# Current wallet
crunch-cli crunches list

# Specific coordinator
crunch-cli crunches list "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
```

**Output:**

- List of all crunches
- Names, statuses, participant counts

---

#### `crunch create <name> <payoutAmount> [maxModelsPerCruncher]`

Create a new crunch competition.

```bash
crunch-cli crunch create "Q4 2024 Trading Challenge" 10000 5
```

**Arguments:**

- `name` - Competition name (unique)
- `payoutAmount` - Prize pool in USDC
- `maxModelsPerCruncher` - Max models per participant (default: 2)

---

#### `crunch get <name>`

Get detailed information about a competition.

```bash
crunch-cli crunch get "Synth"
```

**Output Fields:**

- Name and status
- Coordinator info
- Participant count
- Prize pool balance
- Checkpoint information
- Created/started/ended timestamps
- Configuration parameters

---

#### `crunch start <name>`

Start a competition (transitions from Created to Active).

```bash
crunch-cli crunch start "Q4 2024 Trading Challenge"
```

**Requirements:**

- Competition must be in Created state
- Must be the creating coordinator

---

#### `crunch end <name>`

End a competition (transitions from Active to Ended).

```bash
crunch-cli crunch end "Q4 2024 Trading Challenge"
```

**Requirements:**

- Competition must be in Active state
- Must be the creating coordinator

---

#### `crunch get-cruncher <crunchName> <cruncherWallet>`

Get cruncher details for a specific competition.

```bash
crunch-cli crunch get-cruncher "Synth" "5abc..."
```

**Output:**

- Cruncher registration info
- Model submissions
- Rewards claimed
- Performance data

---

### Financial Commands

#### `crunch deposit-reward <crunchName> <amount>`

Deposit USDC rewards to a competition.

```bash
crunch-cli crunch deposit-reward "Synth" 5000
```

**Requirements:**

- Sufficient USDC balance in wallet
- Competition must exist

---

#### `crunch margin <crunchName>`

Execute margin payout for a competition.

```bash
crunch-cli crunch margin "Synth"
```

---

#### `crunch drain <crunchName>`

Drain remaining USDC from a competition.

```bash
crunch-cli crunch drain "Synth"
```

**Use Case:** Recover unspent funds after competition ends

---

### Checkpoint Commands

#### `crunch checkpoint-create <crunchName> <prizeFileName> [--dryrun]`

Create a checkpoint for payout distribution.

```bash
crunch-cli crunch checkpoint-create "Synth" "./prizes.json"

# Dry run (no execution)
crunch-cli crunch checkpoint-create "Synth" "./prizes.json" --dryrun
```

**Prize File Format (JSON Lines):**

```json
{"timestamp": 1840417288969, "model": "model_1", "prize": 456.78}
{"timestamp": 1840417288969, "model": "model_2", "prize": 412.34}
{"timestamp": 1840417288969, "model": "model_3", "prize": 130.88}
```

---

#### `crunch checkpoint-get-current <crunchName>`

Get the current checkpoint information.

```bash
crunch-cli crunch checkpoint-get-current "Synth"
```

**Output:**

- Checkpoint index
- Total payout amount
- Distribution timestamp
- Claim status

---

#### `crunch checkpoint-get <crunchName> <checkpointIndex>`

Get checkpoint by index.

```bash
crunch-cli crunch checkpoint-get "Synth" 3
```

---

#### `crunch checkpoint-get-address <crunchName> <checkpointIndex>`

Get the Solana address of a checkpoint account.

```bash
crunch-cli crunch checkpoint-get-address "Synth" 3
```

---

### Utility Commands

#### `crunch check-prize-atas <crunchName> <prizeFileName> [-c]`

Check if crunchers have USDC Associated Token Accounts.

```bash
# Check only
crunch-cli crunch check-prize-atas "Synth" "./prizes.json"

# Create missing ATAs
crunch-cli crunch check-prize-atas "Synth" "./prizes.json" -c
```

---

#### `crunch set-fund-config <crunchName> <cruncherPct> <dataproviderPct> <computeProviderPct>`

Set fund configuration for a crunch.

```bash
crunch-cli crunch set-fund-config "Synth" 70 20 10
```

**Note:** Percentages must sum to 100.

---

#### `crunch emission-checkpoint-add <emissionFile>`

Add an emission checkpoint to the coordinator pool.

```bash
crunch-cli crunch emission-checkpoint-add "./emissions.json"
```

---

#### `crunch map-cruncher-addresses <crunchAddress> <wallets...>`

Map cruncher wallets into the coordinator pool address index.

```bash
crunch-cli crunch map-cruncher-addresses "CrunchAddr..." "Wallet1..." "Wallet2..."
```

---

## Multisig Operations

For production environments, use multisig for critical operations:

```bash
crunch-cli --multisig <SQUADS_MULTISIG_ADDR> <command>
```

**Multisig-Compatible Commands:**

- `coordinator register`
- `crunch create`
- `crunch start`
- `crunch end`
- `crunch deposit-reward`
- `crunch drain`

**Example:**

```bash
crunch-cli --multisig 9WzDX... crunch create "Production Competition" 50000 3
```

This creates a Squads proposal instead of direct execution.

---

## JSON Output Mode

For programmatic parsing, use JSON output:

```bash
crunch-cli -o json crunch get "Synth"
```

All commands support `-o json` for structured output.

---

## Typical Competition Workflow

1. **Register:** `crunch-cli coordinator register "My Coordinator"`
2. **Get Approved:** Wait for admin approval
3. **Create:** `crunch-cli crunch create "My Competition" 10000 2`
4. **Fund:** `crunch-cli crunch deposit-reward "My Competition" 10000`
5. **Start:** `crunch-cli crunch start "My Competition"`
6. **Monitor:** `crunch-cli crunch get "My Competition"`
7. **Checkpoint:** `crunch-cli crunch checkpoint-create "My Competition" prizes.json`
8. **End:** `crunch-cli crunch end "My Competition"`
9. **Drain:** `crunch-cli crunch drain "My Competition"`
