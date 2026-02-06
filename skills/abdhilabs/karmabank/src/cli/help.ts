/**
 * Help text formatter for CLI
 */

export function formatHelp(): string {
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                        KarmaBank CLI Help
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A command-line interface for the Agent Credit System that enables AI agents
to borrow USDC based on their Moltbook karma reputation.

┌─ Commands ──────────────────────────────────────────────────────────┐
│  register <name>      Register an agent with credit system         │
│  check <name>         Check credit score and borrowing limit       │
│  borrow <name> <amount>  Borrow USDC against your karma           │
│  repay <name> <amount>  Repay a USDC loan                        │
│  history <name>       Show loan history for an agent              │
│  list                 List all registered agents                  │
│  help                 Show this help message                       │
└─────────────────────────────────────────────────────────────────────┘

┌─ Credit Tiers ─────────────────────────────────────────────────────┐
│  Blocked    │  0-29   │  0 USDC max borrow                         │
│  Bronze     │ 30-44   │  50 USDC max borrow                       │
│  Silver     │ 45-59   │  100 USDC max borrow                      │
│  Gold       │ 60-74   │  200 USDC max borrow                      │
│  Platinum   │ 75-89   │  500 USDC max borrow                      │
│  Diamond    │ 90-100  │  1000 USDC max borrow                     │
└─────────────────────────────────────────────────────────────────────┘

┌─ Examples ──────────────────────────────────────────────────────────┐
│  credit register @agent1        # Register a new agent             │
│  credit check @agent1            # Check credit score              │
│  credit borrow @agent1 100      # Borrow 100 USDC                  │
│  credit repay @agent1 50        # Repay 50 USDC                    │
│  credit history @agent1         # View loan history                │
│  credit list                    # List all agents                  │
└─────────────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
}
