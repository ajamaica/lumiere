---
name: vault
description: 'Local research orchestration and state management. Use when starting projects, logging progress, or exporting findings.'
---

# Vault

Local orchestration engine for managing long-running research tasks with high reliability and zero external costs.

## Core Concepts

- **The Vault**: A local SQLite database stored in `~/.researchvault/` (configurable via `RESEARCHVAULT_DB`).
- **Project**: A high-level research goal.
- **Instrumentation**: Every event tracks confidence (0.0-1.0), source, and tags.

## Workflows

### 1. Initialize a Project

```bash
python3 scripts/vault.py init --id "proj-v1" --objective "Project goal"
```

### 2. Multi-Source Research

Use the unified scuttle command with SSRF protection:

```bash
python3 scripts/vault.py scuttle "https://example.com" --id "proj-v1"
```

### 3. Monitoring & Summary

```bash
python3 scripts/vault.py summary --id "proj-v1"
python3 scripts/vault.py status --id "proj-v1"
```

### 4. Export

```bash
python3 scripts/vault.py export --id "proj-v1" --format markdown --output summary.md
```

## Maintenance

The database is local and excluded from version control.
