# USD1 WLF Transfer Skill

## Description

Allows an agent to securely transfer USD1 (USDC on Wormhole) from one wallet to another using Wormhole Liquidity Facility (WLF).

## Capabilities

- Check sender wallet balance (optional)
- Transfer a specified amount of USD1 to a recipient address
- Return transaction hash and status
- Uses Testnet by default for safety

## Input Parameters

- amount: number (required) - amount of USD1 to send (e.g. 1.0)
- toAddress: string (required) - recipient wallet address (e.g. 0x123...)
- chain: string (optional, default: Solana) - source chain
- privateKey: string (secure, required) - sender wallet private key

## Output

- transactionHash: string
- status: "success" or "failed"
- message: string (details or error)

## Security Notes

- Never hardcode private keys
- Use secure agent input for keys
- Testnet only until production

## Example Usage

/skill usd1-wlf-transfer amount=1.0 toAddress=0xabc123... chain=Solana
