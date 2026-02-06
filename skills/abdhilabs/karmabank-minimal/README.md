# KarmaBank

A hackathon-ready **KarmaBank** that allows AI agents to borrow USDC based on their **Moltbook karma** reputation.

This project includes:

- A **credit scoring engine** (`src/scoring.ts`) that calculates a 0–100 credit score
- A **CLI tool** (`credit`) built with `commander`
- A lightweight **ledger** (file-backed JSON store) for demo/testing

> Status: CLI + docs are scaffolded for Day 2. Circle wallet + real Moltbook integration can be plugged in next.

---

## Features

- **Register** an agent by Moltbook name
- **Check** credit score, tier, max borrow, and score breakdown
- **Borrow** USDC (demo ledger-backed issuance)
- **Repay** USDC loans
- **History** shows loan records
- **List** shows all registered agents

---

## Installation

```bash
cd agent-credit-system
npm install
```

### Environment Variables

Create a `.env` file (optional):

```bash
MOLTBOOK_API_KEY=your_key_here
MOLTBOOK_API_BASE=https://www.moltbook.com/api/v1
CREDIT_LEDGER_PATH=.credit-ledger.json
```

> If `MOLTBOOK_API_KEY` is not set, the CLI will fall back to demo/mock profiles for scoring.

---

## Usage

### Run in Dev Mode

```bash
npm run dev -- --help
```

### Build + Run

```bash
npm run build
npm start -- --help
```

---

## CLI Commands

### Register

```bash
credit register <moltbookName>
```

Example:

```bash
credit register myagent
```

### Check

```bash
credit check <moltbookName> [--verbose]
```

Example:

```bash
credit check myagent --verbose
```

### Borrow

```bash
credit borrow <moltbookName> <amount> [--yes]
```

Example:

```bash
credit borrow myagent 100 --yes
```

### Repay

```bash
credit repay <moltbookName> <amount> [--yes]
```

Example:

```bash
credit repay myagent 50 --yes
```

### History

```bash
credit history <moltbookName> [--limit 10]
```

Example:

```bash
credit history myagent --limit 5
```

### List

```bash
credit list [--verbose]
```

---

## Credit Tiers

| Tier     | Score  | Max Borrow | Notes                |
| -------- | ------ | ---------- | -------------------- |
| Blocked  | 0      | 0 USDC     | Unclaimed or blocked |
| Bronze   | 1–20   | 50 USDC    | Entry tier           |
| Silver   | 21–40  | 150 USDC   | Moderate activity    |
| Gold     | 41–60  | 300 USDC   | Strong presence      |
| Platinum | 61–80  | 600 USDC   | Verified + active    |
| Diamond  | 81–100 | 1000 USDC  | Top reputation       |

Loan terms:

- **Interest:** 0%
- **Term:** 14 days

---

## Architecture Diagram (Text)

```
           ┌──────────────────────┐
           │      Moltbook API     │
           │  (agent karma stats)  │
           └──────────┬───────────┘
                      │
                      ▼
           ┌──────────────────────┐
           │    Scoring Engine     │
           │   src/scoring.ts      │
           └──────────┬───────────┘
                      │ CreditScore
                      ▼
┌───────────────┐   ┌──────────────────────┐
│  CLI (credit) │──►│ Ledger Service        │
│ src/cli.ts     │   │ .credit-ledger.json  │
└───────────────┘   └──────────┬───────────┘
                               │
                               ▼
                      ┌──────────────────┐
                      │ Loans + Agents   │
                      │ Registry + State │
                      └──────────────────┘
```

---

## Development

### Tests

```bash
npm test
```

### Lint

```bash
npm run lint
```

---

## Contributing

1. Fork / branch from `main`
2. Keep PRs small and focused
3. Add tests for scoring/ledger changes
4. Run `npm test` before submitting

---

## License

ISC
