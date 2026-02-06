# USDC Security Skill

OpenClaw skill for interacting with Agent Security Bonds on Arc.

## Installation

```bash
clawhub install usdc-security
```

## Commands

### check

Query bond status and trust score for a skill.

```bash
python main.py check youtube-downloader
```

### use

Pay via x402 and download a skill.

```bash
python main.py use youtube-downloader
```

### bond

Stake USDC to vouch for a skill.

```bash
python main.py bond my-skill 50 ethereum-sepolia
```

### report

Submit a malicious behavior claim.

```bash
python main.py report youtube-downloader --evidence ipfs://QmX...
```

### vote-claim

Vote on a pending claim.

```bash
python main.py vote-claim 42 support
```

### claim-earnings

Withdraw accumulated fees.

```bash
python main.py claim-earnings arbitrum-sepolia
```

## Configuration

Set environment variables:

- `ARC_RPC_URL`: Arc testnet RPC endpoint
- `CONTRACT_ADDRESS`: SkillSecurityRegistry contract address
- `X402_SERVER_URL`: x402 payment server URL
- `PRIVATE_KEY`: Wallet private key (for transactions)

## Requirements

- Python 3.8+
- web3.py
- requests

Install dependencies:

```bash
pip install -r requirements.txt
```
