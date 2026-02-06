---
name: treeline
description: Chat with your finances from Treeline Money. Query balances, spending, budgets, and transactions.
version: 26.2.603
user-invocable: true
homepage: https://treeline.money
metadata: {"clawdbot":{"emoji":"🌲"}}
---

# Treeline Money

**Chat with your finances.** Ask questions like "What's my net worth?", "How much did I spend on groceries?", or "Am I over budget?" and get instant answers from your own financial data.

---

## Quick Start

```bash
# 1. Install the CLI (script is bundled with this skill)
sh ./install.sh
source ~/.zshrc  # or restart terminal

# 2. Enable demo mode (sample data)
tl demo on

# 3. Try it out
tl status
```

---

## First Time Setup

> **For agents:** If `tl` commands fail with "command not found", guide the user through installation using the bundled install scripts. Start with demo mode so they can try queries immediately.
>
> **Important:** Never run installation or setup commands without asking the user first. Present the command and wait for confirmation before executing.

### Installing the CLI

The install scripts are bundled with this skill. They download the latest CLI binary from GitHub releases and add it to your PATH.

Mac/Linux:
```bash
sh ./install.sh
```

Windows (PowerShell):
```powershell
.\install.ps1
```

Verify with `tl --version`.

**Optional:** Download the [desktop app](https://treeline.money/download) for visual exploration of your data.

### Demo Mode

Demo mode loads sample data so users can try queries without connecting a bank:

```bash
tl demo on
```

To switch to real data later:
```bash
tl demo off
```

Demo data is separate from real data.

### CLI Behavior Notes

- `tl demo on` prints a success message — if it seems to hang, wait a few seconds (first run initializes the database)
- Use `tl demo status` to verify demo mode is enabled
- Some commands may take a few seconds on first run due to database initialization
- If you see errors about missing tables, try `tl demo on` again

### Connecting Real Data

**SimpleFIN** ($1.50/month, US & Canada)
1. Sign up at [beta-bridge.simplefin.org](https://beta-bridge.simplefin.org/)
2. Connect bank accounts and create a setup token
3. Run `tl setup simplefin <setup-token>`
4. Run `tl sync`

**Lunch Flow** (~$3/month, global: US, Canada, Brazil, EU, UK, Asia)
1. Sign up at [lunchflow.app](https://www.lunchflow.app/?atp=treeline)
2. Connect bank accounts and create an API destination
3. Run `tl setup lunchflow <api-key>`
4. Run `tl sync`

**CSV Import** (free, CLI or desktop app)
1. Export transactions as CSV from bank website
2. Find the account to import into: `tl status --json` (grab the account name or UUID)
3. Preview: `tl import export.csv --account "Checking" --dry-run`
4. Import: `tl import export.csv --account "Checking"`

Auto-detection handles most CSVs. If columns don't match, specify them:
```bash
tl import export.csv --account "Checking" \
  --date-column "Trans Date" \
  --amount-column "Amount" \
  --description-column "Memo"
```

For European formats: `--number-format eu` (1.234,56) or `--number-format eu_space` (1 234,56).
For credit cards where charges are positive: `--flip-signs`.
For CSVs with separate debit/credit columns: `--debit-column "Debit" --credit-column "Credit"`.
For CSVs with bank letterhead rows before the header: `--skip-rows 3`.

---

## What is Treeline?

[Treeline Money](https://treeline.money) is a local-first personal finance app. All your data stays on your device in a local DuckDB database. No cloud accounts, no subscriptions required (sync services are optional), full SQL access to your financial data.

---

## Limitations

**Encrypted databases not supported.** If the user has enabled database encryption in Treeline, CLI commands will fail. They'll need to either:
- Disable encryption if they want OpenClaw access
- Use the Treeline app directly for encrypted databases

If you see "database is encrypted" errors, explain this limitation.

---

## Response Formatting

**Format all responses for mobile/chat:**
- Use bullet points, not markdown tables
- Round numbers for readability ($1,234 not $1,234.56)
- Lead with the answer, details second
- Keep responses concise — chat isn't a spreadsheet
- Use line breaks to separate sections

**Example good response:**
```
Your net worth is $125k

Assets: $180k
- Retirement: $85k
- Savings: $25k
- Checking: $10k
- Home equity: $60k

Liabilities: $55k
- Mortgage: $52k
- Credit cards: $3k
```

**Example bad response:**
```
| Account | Type | Balance |
|---------|------|---------|
| My 401k Account | asset | 85234.56 |
...
```

---

## CLI Commands

The `tl` CLI can do more than just queries:

```bash
tl status              # Quick account summary with balances
tl status --json       # Same, but JSON output

tl query "SQL" --json  # Run any SQL query (read-only by default)
tl sql "SQL" --json    # Same as tl query (alias)
tl query "SQL" --allow-writes  # Enable write operations (INSERT, UPDATE, DELETE)

tl sync                # Sync accounts/transactions from bank integrations
tl sync --dry-run      # Preview what would sync

tl import FILE -a ACCOUNT          # Import transactions from CSV
tl import FILE -a ACCOUNT --dry-run  # Preview import without applying
tl import FILE -a ACCOUNT --json   # JSON output for scripting

tl backup create       # Create a backup
tl backup list         # List available backups
tl backup restore NAME # Restore a backup

tl doctor              # Check database health
tl compact             # Compact database (reclaim space, optimize)

tl tag "groceries" --ids ID1,ID2  # Apply tags to transactions

tl demo on|off         # Toggle demo mode (sample data)
```

> **Note:** `tl query` and `tl sql` are identical — use whichever you prefer. The database is opened read-only by default. Use `--allow-writes` to enable write operations.

**Use `tl status` for quick balance checks** — it's faster than a SQL query.

**Use `tl compact` if the user mentions slow queries** — it optimizes the database.

### CSV Import Details

`tl import` auto-detects column mappings from CSV headers. Most bank CSVs work out of the box:

```bash
tl import bank_export.csv --account "Chase Checking"
```

The `--account` / `-a` flag accepts an account name (case-insensitive, substring match) or UUID.

**Always preview first** with `--dry-run` to verify columns were detected correctly:

```bash
tl import bank_export.csv -a "Checking" --dry-run --json
```

**All import flags** (all optional except `--account`):

| Flag | Purpose | Example |
|------|---------|---------|
| `--date-column` | Override date column | `--date-column "Post Date"` |
| `--amount-column` | Override amount column | `--amount-column "Amt"` |
| `--description-column` | Override description column | `--description-column "Memo"` |
| `--debit-column` | Use debit column (instead of amount) | `--debit-column "Debit"` |
| `--credit-column` | Use credit column (instead of amount) | `--credit-column "Credit"` |
| `--balance-column` | Running balance (creates snapshots) | `--balance-column "Balance"` |
| `--flip-signs` | Negate amounts (credit card CSVs) | `--flip-signs` |
| `--debit-negative` | Negate positive debits | `--debit-negative` |
| `--skip-rows N` | Skip N rows before header | `--skip-rows 3` |
| `--number-format` | `us`, `eu`, or `eu_space` | `--number-format eu` |
| `--profile NAME` | Load a saved profile | `--profile chase` |
| `--save-profile NAME` | Save settings as profile | `--save-profile chase` |
| `--dry-run` | Preview without importing | `--dry-run` |
| `--json` | JSON output | `--json` |

**Common patterns for agents:**

```bash
# Step 1: Find the account UUID
tl status --json

# Step 2: Preview import
tl import transactions.csv -a "550e8400-e29b-41d4-a716-446655440000" --dry-run --json

# Step 3: Execute import
tl import transactions.csv -a "550e8400-e29b-41d4-a716-446655440000" --json
```

Duplicate transactions are automatically detected and skipped on re-import via fingerprinting.

---

## User Context

**Before answering finance questions, check for `CONTEXT.md` in this skill directory.**

If it exists, read it first — it contains user-specific knowledge:
- Account meanings (which accounts are retirement vs brokerage, etc.)
- Tag conventions and cash flow rules
- Plugin configurations
- Personal preferences

**Learning new context:** When you discover something about the user's setup:
1. For small observations, note them in CONTEXT.md and briefly mention what you saved
2. For significant assumptions or corrections, ask: "Want me to save that to your Treeline context?"

See the [User Context Pattern](#user-context-pattern) section at the end for the template.

---

## Quick Reference

### Net Worth
```bash
tl query "
WITH latest AS (
  SELECT DISTINCT ON (account_id) account_id, balance
  FROM sys_balance_snapshots
  ORDER BY account_id, snapshot_time DESC
)
SELECT
  SUM(CASE WHEN a.classification = 'asset' THEN s.balance ELSE 0 END) as assets,
  SUM(CASE WHEN a.classification = 'liability' THEN ABS(s.balance) ELSE 0 END) as liabilities,
  SUM(CASE WHEN a.classification = 'asset' THEN s.balance ELSE -ABS(s.balance) END) as net_worth
FROM accounts a
JOIN latest s ON a.account_id = s.account_id
" --json
```

### Account Balances
```bash
tl query "
WITH latest AS (
  SELECT DISTINCT ON (account_id) account_id, balance
  FROM sys_balance_snapshots
  ORDER BY account_id, snapshot_time DESC
)
SELECT a.name, a.classification, a.institution_name, s.balance
FROM accounts a
JOIN latest s ON a.account_id = s.account_id
ORDER BY s.balance DESC
" --json
```

### True Spending (Excluding Internal Moves)

Check CONTEXT.md for `internal_transfer_tags`. Default pattern:

```bash
tl query "
SELECT SUM(ABS(amount)) as total_spent
FROM transactions
WHERE amount < 0
  AND transaction_date >= date_trunc('month', current_date)
  AND NOT (tags && ARRAY['transfer', 'savings', 'investment'])
" --json
```

### Spending by Tag
```bash
tl query "
SELECT tags, SUM(ABS(amount)) as spent
FROM transactions
WHERE amount < 0
  AND transaction_date >= '2026-01-01' AND transaction_date < '2026-02-01'
  AND tags IS NOT NULL AND tags != '[]'
GROUP BY tags
ORDER BY spent DESC
" --json
```

### Recent Transactions
```bash
tl query "
SELECT t.description, t.amount, t.transaction_date, a.name as account
FROM transactions t
JOIN accounts a ON t.account_id = a.account_id
ORDER BY t.transaction_date DESC
LIMIT 10
" --json
```

---

## Database Schema

### Core Tables

**accounts**
| Column | Description |
|--------|-------------|
| `account_id` | UUID primary key |
| `name` | Account display name |
| `classification` | `asset` or `liability` |
| `account_type` | `credit`, `investment`, `Loan`, `other`, or null |
| `institution_name` | Bank/institution name |
| `currency` | Currency code (e.g., `USD`) |
| `is_manual` | Boolean — manually added vs synced |

**sys_balance_snapshots** — Source of truth for balances
| Column | Description |
|--------|-------------|
| `snapshot_id` | UUID primary key |
| `account_id` | FK to accounts |
| `balance` | Balance at snapshot time |
| `snapshot_time` | When recorded |
| `source` | `sync`, `manual`, etc. |

**transactions**
| Column | Description |
|--------|-------------|
| `transaction_id` | UUID primary key |
| `account_id` | FK to accounts |
| `amount` | Signed (negative = expense) |
| `description` | Transaction description |
| `transaction_date` | When it occurred |
| `posted_date` | When it cleared |
| `tags` | Array of tags |

### Tags vs Categories

**Tags** are the primary concept in Treeline — transactions can have multiple tags.

**Categories** come from the budget plugin (`plugin_budget`), which maps tags to budget categories. Not all users have this plugin.

---

## Plugin System

Plugins have their own DuckDB schemas: `plugin_<name>.*`

### Discovering Installed Plugins
```bash
tl query "
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name LIKE 'plugin_%'
" --json
```

### Common Plugin Schemas

**plugin_budget.categories** — Budget categories
| Column | Description |
|--------|-------------|
| `category_id` | UUID primary key |
| `month` | `YYYY-MM` format |
| `type` | `income` or `expense` |
| `name` | Category name |
| `expected` | Budgeted amount |
| `tags` | Array of tags to match |

**plugin_goals.goals** — Savings goals
| Column | Description |
|--------|-------------|
| `id` | UUID primary key |
| `name` | Goal name |
| `target_amount` | Target amount |
| `target_date` | Target date |
| `completed` | Boolean |
| `active` | Boolean |

**plugin_subscriptions** — Detected recurring charges

**plugin_cashflow** — Cash flow projections

**plugin_emergency_fund** — Emergency fund tracking

Check CONTEXT.md for which plugins the user has and cares about.

---

## Common Patterns

### Getting Current Balances

Always use latest snapshot:
```sql
WITH latest AS (
  SELECT DISTINCT ON (account_id) account_id, balance
  FROM sys_balance_snapshots
  ORDER BY account_id, snapshot_time DESC
)
SELECT a.name, s.balance
FROM accounts a
JOIN latest s ON a.account_id = s.account_id
```

### Working with Tags

Tags are arrays:
```sql
-- Contains a specific tag
WHERE tags @> ARRAY['groceries']

-- Contains any of these tags
WHERE tags && ARRAY['food', 'dining']

-- Note: UNNEST doesn't work in all contexts in DuckDB
-- Instead, GROUP BY tags directly
```

### Date Filters
```sql
-- This month
WHERE transaction_date >= date_trunc('month', current_date)

-- Specific month
WHERE transaction_date >= '2026-01-01'
  AND transaction_date < '2026-02-01'
```

### Budget vs Actual
```sql
SELECT
  c.name,
  c.expected,
  COALESCE(SUM(ABS(t.amount)), 0) as actual,
  c.expected - COALESCE(SUM(ABS(t.amount)), 0) as remaining
FROM plugin_budget.categories c
LEFT JOIN transactions t ON t.tags && c.tags
  AND t.amount < 0
  AND t.transaction_date >= (c.month || '-01')::DATE
  AND t.transaction_date < (c.month || '-01')::DATE + INTERVAL '1 month'
WHERE c.month = strftime(current_date, '%Y-%m')
  AND c.type = 'expense'
GROUP BY c.category_id, c.name, c.expected
```

---

## Question Mapping

| User asks | Approach |
|-----------|----------|
| "Net worth?" | Net worth query |
| "Balances?" | Account balances query |
| "How much in [X]?" | Filter by `name ILIKE '%X%'` |
| "How much did I spend?" | True spending query (exclude internal moves) |
| "Spending on [tag]?" | Filter by tag |
| "Am I over budget?" | Budget vs actual (requires budget plugin) |
| "Recent transactions" | Order by date DESC, limit |
| "Savings?" | Filter accounts by name/type |
| "Retirement?" | Filter by 401k, IRA, retirement keywords |
| "Import CSV" / "Upload transactions" | Guide through `tl import` — preview first with `--dry-run` |
| "Import from [bank name]" | Use `tl import` with appropriate flags for that bank's CSV format |

---

## Tips

1. **Always use `--json`** for parseable output
2. **Amounts are signed** — negative = expense
3. **Use `classification`** for asset/liability
4. **Balances live in snapshots**, not the accounts table
5. **Check CONTEXT.md** for user-specific account meanings and tag conventions

---

## User Context Pattern

When this skill is installed, create `CONTEXT.md` alongside it to store user-specific knowledge. This keeps the skill generic/shareable while personalizing behavior.

**Template for CONTEXT.md:**

```markdown
# Treeline User Context
*Auto-updated by your assistant as it learns your setup*

## Account Notes
<!-- What specific accounts mean, e.g.: -->
<!-- - "Company 401k" = retirement account -->
<!-- - "Home Equity" = home value estimate (manual) -->

## Tag Conventions
<!-- How the user uses tags -->

## Cash Flow Rules
<!-- Tags to exclude from "true spending" calculations -->
internal_transfer_tags: [transfer, savings, investment]

## Income Sources
<!-- Known income sources for better reporting -->

## Active Plugins
<!-- Which plugins are installed and relevant -->

## Preferences
<!-- Reporting style, rounding, spouse-friendly mode, etc. -->

## Learned Facts
<!-- Anything else discovered about the user's financial setup -->
```

**Maintenance:**
- Briefly mention updates for small observations
- Ask before recording significant assumptions
- Periodically validate against live data (accounts may close, tags may change)

---

## Privacy Note

All data is local (`~/.treeline/treeline.duckdb`). Never share transaction descriptions or account details outside the conversation unless explicitly asked.
