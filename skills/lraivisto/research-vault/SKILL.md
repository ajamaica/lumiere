---
name: research-vault
description: 'Local-first research brain for agentic investigations: project ledger (SQLite), branch-aware findings/events, synthesis links, verification missions, and watchdog ingestion. Use when you need persistent research memory, hypothesis branching, cross-artifact synthesis, or MCP access.'
---

# ResearchVault

Local-first orchestration engine for managing long-running research tasks with high reliability and zero external costs.

## Core Concepts

- **The Vault**: A local SQLite database stored in `~/.researchvault/` (configurable via `RESEARCHVAULT_DB`).
- **Project**: A high-level research goal.
- **Branch**: A divergent reasoning line inside a project (default: `main`).
- **Hypothesis**: A trackable claim/rationale attached to a branch.
- **Instrumentation**: Every event tracks confidence (0.0-1.0), source, and tags.

## Workflows

### 1. Initialize a Project

```bash
uv run python scripts/vault.py init --id "proj-v1" --objective "Project goal"
```

### 2. Divergent Reasoning (Branches + Hypotheses)

```bash
uv run python scripts/vault.py branch create --id "proj-v1" --name "alt" --hypothesis "Competing explanation"
uv run python scripts/vault.py hypothesis add --id "proj-v1" --branch "alt" --statement "Key claim needs corroboration" --conf 0.55
```

### 3. Multi-Source Research (Scuttle)

Use the unified scuttle command (SSRF-protected) to ingest a URL into the Vault:

```bash
uv run python scripts/vault.py scuttle "https://example.com" --id "proj-v1" --branch "main"
```

### 4. Cross-Artifact Synthesis

Register local files as artifacts, then synthesize similarity links:

```bash
uv run python scripts/vault.py artifact add --id "proj-v1" --path "./notes.md" --type "NOTE"
uv run python scripts/vault.py synthesize --id "proj-v1" --threshold 0.78 --top-k 5
```

### 5. Active Verification Protocol

Generate and run verification missions for low-confidence / `unverified` findings:

```bash
uv run python scripts/vault.py verify plan --id "proj-v1" --threshold 0.7 --max 20
uv run python scripts/vault.py verify list --id "proj-v1" --status open
uv run python scripts/vault.py verify run --id "proj-v1" --limit 5
```

### 6. Watchdog Mode

Add watch targets and run one iteration:

```bash
uv run python scripts/vault.py watch add --id "proj-v1" --type url --target "https://example.com" --interval 3600 --tags "seed"
uv run python scripts/vault.py watch add --id "proj-v1" --type query --target "my topic query" --interval 21600
uv run python scripts/vault.py watchdog --once --limit 10
```

### 7. MCP Server

Expose the Vault over MCP (stdio transport by default):

```bash
uv run python scripts/vault.py mcp --transport stdio
```

### 8. Monitoring & Summary

```bash
uv run python scripts/vault.py summary --id "proj-v1"
uv run python scripts/vault.py status --id "proj-v1"
```

### 9. Export

```bash
uv run python scripts/vault.py export --id "proj-v1" --format markdown --output summary.md
```

## Maintenance

The database is local-first by default and should stay out of version control.
