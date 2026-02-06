---
name: researchvault
description: 'High-velocity research orchestration engine. Manages persistent state, synthesis, and autonomous verification for agents.'
metadata:
  {
    'openclaw':
      {
        'requires': { 'python': '>=3.13', 'bins': ['uv'] },
        'install':
          [
            {
              'id': 'vault-venv',
              'kind': 'exec',
              'command': 'uv venv && uv pip install -e .',
              'label': 'Initialize ResearchVault Environment',
            },
          ],
      },
  }
---

# ResearchVault 🦞

Autonomous state manager for agentic research.

## Core Features

- **The Vault**: Local SQLite persistence for `artifacts`, `findings`, and `links`.
- **Divergent Reasoning**: Create `branches` and `hypotheses` to explore parallel research paths.
- **Synthesis Engine**: Automated link-discovery using local embeddings.
- **Active Verification**: Self-correcting agents via `verification_missions`.
- **MCP Server**: Native support for cross-agent collaboration.
- **Watchdog Mode**: Continuous background monitoring of URLs and queries.

## Workflows

### 1. Project Initialization

```bash
uv run python scripts/vault.py init --id "metal-v1" --name "Suomi Metal" --objective "Rising underground bands"
```

### 2. Multi-Source Ingestion

```bash
uv run python scripts/vault.py scuttle "https://reddit.com/r/metal" --id "metal-v1"
```

### 3. Synthesis & Verification

```bash
# Link related findings
uv run python scripts/vault.py synthesize --id "metal-v1"

# Plan verification for low-confidence data
uv run python scripts/vault.py verify plan --id "metal-v1"
```

### 4. MCP Server

```bash
uv run python scripts/vault.py mcp --transport stdio
```

## Environment

Requires Python 3.13 and `uv`.
