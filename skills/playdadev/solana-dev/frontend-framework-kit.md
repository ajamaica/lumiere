# Frontend with framework-kit (Next.js / React)

**Source**: https://solana.com/frontend-framework-kit.md

## Goals

- One Solana client instance for the app (RPC + WS + wallet connectors)
- Wallet Standard-first discovery/connect
- Minimal "use client" footprint in Next.js (hooks only in leaf components)
- Transaction sending that is observable, cancelable, and UX-friendly

## Recommended dependencies

- @solana/client
- @solana/react-hooks
- @solana/kit
- @solana-program/system, @solana-program/token, etc.

## Bootstrap

Prefer `create-solana-dapp` with kit/framework-kit compatible template.

## Hook Patterns

- `useWalletConnection()` - connect/disconnect, wallet discovery
- `useBalance(...)` - lamports balance
- `useSolTransfer(...)` - SOL transfers
- `useSplToken(...)` - token balances/transfers
- `useTransactionPool(...)` - send + status + retry flows

## Transaction UX Checklist

- [ ] Disable inputs while pending
- [ ] Provide signature immediately after send
- [ ] Track confirmation states (processed/confirmed/finalized)
- [ ] Show actionable errors (user rejected, insufficient SOL, blockhash expired, account errors, program errors)

## ConnectorKit (Optional)

Use when you need:

- Headless connector with composable UI
- Explicit state control
- Production diagnostics/health checks for wallet sessions

Full details: https://solana.com/frontend-framework-kit.md
