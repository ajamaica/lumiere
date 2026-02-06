# ARCHITECTURE.md - Agent Credit System

## Overview

The **Agent Credit System** enables AI agents to borrow USDC using **Moltbook karma as reputation collateral**.

Core principles:

- **Reputation-based credit**: Karma and engagement metrics act as trust signals.
- **Claimed agents only**: `is_claimed === true` is mandatory to borrow.
- **Transparent scoring**: CLI shows factor breakdown.
- **Simple ledger**: Current implementation uses a JSON-backed ledger for hackathon demo speed.

---

## Components

### 1) Scoring Engine (`src/scoring.ts`)

Responsibilities:

- Fetches relevant trust signals from `AgentProfile`
- Computes a 0–100 credit score
- Maps score → tier → credit limit

Signals:

- Karma normalization (log scale)
- Claimed bonus (required)
- Age bonus (up to 1 year)
- Activity recency bonus
- Diversity bonus (posts vs comments balance)
- Follower bonus
- Owner credibility bonus (X verified + followers)
- Volatility penalty (anti-manipulation)
- EMA smoothing (stability)

### 2) Ledger Service (`src/cli/services/ledger.ts`)

Responsibilities:

- Store registered agents
- Store loans and repayment state
- Provide query methods for CLI

Current storage:

- File-backed JSON: `.credit-ledger.json`

Why JSON?

- Hackathon speed
- No database provisioning
- Works offline for demo

Future:

- Replace with SQLite/Postgres
- Add transaction log + checksums

### 3) CLI (`src/cli.ts` + `src/cli/commands/*`)

Responsibilities:

- User-friendly command interface
- Colored output + readable summaries
- Error handling + actionable suggestions

Commands:

- `register <moltbookName>`
- `check <moltbookName>`
- `borrow <moltbookName> <amount>`
- `repay <moltbookName> <amount>`
- `history <moltbookName>`
- `list`

### 4) Moltbook Adapter (`src/cli/adapters/moltbook.ts`)

Responsibilities:

- Fetch Moltbook agent profiles via HTTP

Current state:

- Placeholder endpoint (`/agents/{name}`)
- Throws if API key missing

Future:

- Confirm actual endpoint for karma and metadata
- Add caching layer

---

## Data Flow

### Register

```
CLI register
  -> Moltbook Adapter: get profile
  -> Scoring Engine: calculate credit score
  -> Ledger: persist Agent
```

### Borrow

```
CLI borrow
  -> Ledger: validate agent exists, no outstanding loan
  -> Moltbook Adapter: fetch latest profile (optional)
  -> Scoring Engine: calculate score + limit
  -> Scoring Engine: validate loan request
  -> Ledger: create Loan + update agent outstanding
  -> (Future) Circle Wallet: transfer USDC
```

### Repay

```
CLI repay
  -> Ledger: find active loan
  -> Ledger: mark loan repaid + update agent outstanding
  -> (Future) Circle Wallet: confirm repayment transfer
```

---

## Security Considerations

### Reputation / Sybil Resistance

- Require `is_claimed == true` to reduce fake agent farming.
- Owner credibility bonus adds friction (X verified, followers).

### Manipulation Detection

- Volatility penalty discourages sudden karma spikes.
- EMA smoothing reduces incentive for short-lived boost.

### Ledger Integrity

- JSON ledger is **not tamper-proof**.
- For production:
  - Use append-only transaction log
  - Add cryptographic signatures
  - Store in database with audit trails

### Key Management

- Moltbook API keys should be stored in env vars or secret managers.
- Never commit `.env`.

---

## Future Improvements

1. Real Moltbook integration
   - Confirm endpoints for karma snapshots and historical metrics
   - Implement caching and retry logic

2. Circle wallet integration
   - Borrow triggers USDC transfer
   - Repay triggers inbound transfer verification
   - Webhook listener for settlement

3. Robust persistence
   - Move ledger from JSON to SQLite/Postgres
   - Add migrations and schema versioning

4. Risk controls
   - Cooldowns
   - Utilization-based limits
   - Default penalties + blacklist

5. Observability
   - Structured logs
   - Metrics (loan volume, default rates)

---

## Appendix: Tier Mapping

| Tier | Name     | Score  | Max Borrow |
| ---- | -------- | ------ | ---------- |
| 0    | Blocked  | 0      | 0          |
| 1    | Bronze   | 1–20   | 50         |
| 2    | Silver   | 21–40  | 150        |
| 3    | Gold     | 41–60  | 300        |
| 4    | Platinum | 61–80  | 600        |
| 5    | Diamond  | 81–100 | 1000       |
