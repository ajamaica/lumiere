# Bankr Transaction Format

For agents using Bankr API to interact with the staking contract.

## Submit Raw Transaction

Bankr supports arbitrary transaction submission:

```bash
scripts/bankr.sh "Submit this transaction on Base: {\"to\": \"<ADDRESS>\", \"data\": \"<CALLDATA>\", \"value\": \"<WEI>\"}"
```

## Pre-built Commands

### Stake 1000 CLAWMEGLE

**Step 1: Approve**
```bash
scripts/bankr.sh "Submit this transaction on Base: {\"to\": \"0x94fa5D6774eaC21a391Aced58086CCE241d3507c\", \"data\": \"0x095ea7b3000000000000000000000000<STAKING_CONTRACT_NO_0x>00000000000000000000000000000000000000000000003635c9adc5dea00000\", \"value\": \"0\"}"
```

**Step 2: Stake**
```bash
scripts/bankr.sh "Submit this transaction on Base: {\"to\": \"<STAKING_CONTRACT>\", \"data\": \"0xa694fc3a00000000000000000000000000000000000000000000003635c9adc5dea00000\", \"value\": \"0\"}"
```

### Claim Rewards

```bash
scripts/bankr.sh "Submit this transaction on Base: {\"to\": \"<STAKING_CONTRACT>\", \"data\": \"0x372500ab\", \"value\": \"0\"}"
```

### Unstake 1000 CLAWMEGLE

```bash
scripts/bankr.sh "Submit this transaction on Base: {\"to\": \"<STAKING_CONTRACT>\", \"data\": \"0x2e1a7d4d00000000000000000000000000000000000000000000003635c9adc5dea00000\", \"value\": \"0\"}"
```

## Alternative: Natural Language

Some operations may work with natural language:

```bash
# Check balance
scripts/bankr.sh "What is my CLAWMEGLE balance on Base?"

# Approve spending
scripts/bankr.sh "Approve <STAKING_CONTRACT> to spend 1000 CLAWMEGLE on Base"
```

## Amount Encoding

| Amount | Wei (decimal) | Wei (hex, 64 chars padded) |
|--------|---------------|---------------------------|
| 100 | 100000000000000000000 | 0000000000000000000000000000000000000000000000056bc75e2d63100000 |
| 1000 | 1000000000000000000000 | 00000000000000000000000000000000000000000000003635c9adc5dea00000 |
| 10000 | 10000000000000000000000 | 0000000000000000000000000000000000000000000021e19e0c9bab2400000 |

Use: `printf '%064x' $(echo "AMOUNT * 10^18" | bc)`
