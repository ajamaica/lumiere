---
name: the-trench
description: Call The Trench Solana program on devnet using the public IDL and TS types.
homepage: https://github.com/BAGWATCHER/the-trench-demo
metadata: { 'openclaw': { 'emoji': '🕳️' } }
---

# The Trench Skill

Use this skill to construct Anchor clients that call The Trench program on **devnet**. This repo is public and contains only the IDL and TS types (no private bot logic).

## Program

- Program ID (devnet): `6fs4qcRYSdR8pd2ZPoAmLpthrqZR94Dhf6J4PLvtqQt1`
- IDL: `{baseDir}/../idl.json`
- TS types: `{baseDir}/../the_trench.ts`

## Usage (TypeScript)

```ts
import { Connection, PublicKey } from '@solana/web3.js'
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import idl from '../idl.json'

const programId = new PublicKey('6fs4qcRYSdR8pd2ZPoAmLpthrqZR94Dhf6J4PLvtqQt1')
const connection = new Connection('https://api.devnet.solana.com', 'confirmed')
const provider = AnchorProvider.env()
const program = new Program(idl as any, programId, provider)

// Example call
// await program.methods.listDeadToken(...).accounts({ ... }).rpc();
```

## Notes

- This skill does **not** include any private trading logic or alpha.
- If you need mainnet, update the program ID and IDL accordingly.
