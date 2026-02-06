# ResearchVault 🦞

**The local-first orchestration engine for high-velocity AI research.**

ResearchVault is a specialized state manager and orchestration framework for OpenClaw agents. It allows agents to handle complex, multi-step investigations by persisting state, instrumentation, and insights into a local SQLite "Vault."

Following the **Inference-Speed Development** philosophy, Vault is built CLI-first to close the loop between research planning and autonomous execution.

## ✨ Core Features

- **The Vault (SQLite)**: A persistent, local ledger stored in `~/.researchvault/` (configurable via `RESEARCHVAULT_DB`). 100% private.
- **Normalized Evidence Core**: Scalable storage for `artifacts`, `findings`, and `links` (graph-ready).
- **Divergent Reasoning**: First-class `branches` + `hypotheses` so agents can explore competing explanations without contaminating the main line.
- **Cross-Artifact Synthesis**: Local embeddings + similarity links (`links`) to surface connections across findings and artifacts.
- **Active Verification Protocol**: Auto-generated `verification_missions` for low-confidence or `#unverified` findings.
- **MCP Server**: Expose the Vault over MCP for cross-agent access (`vault mcp` / `python -m scripts.mcp_server`).
- **Watchdog Mode**: Background scuttler that ingests URLs and runs query watches into your Vault.
- **Unified Ingestion Engine**: Modular connectors for automated research capture.
- **Instrumentation 2.0**: Every research event tracks **Confidence** (0.0-1.0), **Source**, and **Tags**.
- **Multi-Source Support**:
  - **X (Twitter)**: High-signal real-time data via `bird`.
  - **Reddit**: Structured community discussions and top-comment trees.
  - **Grokipedia**: Direct knowledge-base ingestion via API.
  - **YouTube**: Metadata-only extraction (titles/descriptions) without API keys.
- **Suspicion Protocol 2.0**: Hardened logic for low-trust sources. Moltbook scans are forced to low-confidence (`0.55`) and tagged `#unverified`.
- **Semantic Cache**: Integrated deduplication for queries and artifacts.
- **SSRF Safety**: Robust URL validation blocks internal network probes and private IP ranges.
- **Hardened Logic**: Versioned database migrations and a comprehensive `pytest` suite.

## 🚀 Workflows

### 1. Project Management

Initialize a project, set objectives, and assign priority levels.

```bash
uv run python scripts/vault.py init --id "metal-v1" --name "Suomi Metal" --objective "Rising underground bands" --priority 5
```

### 2. Multi-Source Ingestion

Use the unified `scuttle` command to ingest data from any supported source (Reddit, YouTube, Grokipedia, Web).

```bash
uv run python scripts/vault.py scuttle "https://www.youtube.com/watch?v=..." --id "metal-v1"
```

### 3. Divergent Reasoning (Branches + Hypotheses)

```bash
uv run python scripts/vault.py branch create --id "metal-v1" --name "alt-hypothesis" --hypothesis "The trend is label-driven, not organic."
uv run python scripts/vault.py hypothesis add --id "metal-v1" --branch "alt-hypothesis" --statement "Streaming growth is driven by playlist placement." --conf 0.55
uv run python scripts/vault.py insight --id "metal-v1" --add --branch "alt-hypothesis" --title "Counter-signal" --content "..." --tags "unverified"
```

### 4. Cross-Artifact Synthesis

```bash
uv run python scripts/vault.py synthesize --id "metal-v1" --threshold 0.78 --top-k 5
```

### 5. Verification Missions

```bash
uv run python scripts/vault.py verify plan --id "metal-v1" --threshold 0.7 --max 20
uv run python scripts/vault.py verify list --id "metal-v1" --status open
uv run python scripts/vault.py verify run --id "metal-v1" --limit 5
```

### 6. Watchdog Mode

```bash
uv run python scripts/vault.py watch add --id "metal-v1" --type url --target "https://example.com" --interval 3600 --tags "seed"
uv run python scripts/vault.py watch add --id "metal-v1" --type query --target "rising underground metal bands finland" --interval 21600
uv run python scripts/vault.py watchdog --once --limit 10
```

### 7. MCP Server

```bash
uv run python scripts/vault.py mcp --transport stdio
# or:
uv run python -m scripts.mcp_server
```

### 8. Export & Reporting

Ship research summaries to Markdown or JSON for external use or agent review.

```bash
uv run python scripts/vault.py export --id "metal-v1" --format markdown --output summary.md
```

### 9. Verification & Testing

Run the integrated test suite to verify system integrity.

```bash
uv run pytest
```

### 10. Monitoring

View sorted project lists, high-level summaries, and detailed event logs.

```bash
uv run python scripts/vault.py list
uv run python scripts/vault.py summary --id "metal-v1"
uv run python scripts/vault.py status --id "metal-v1"
```

## 🛠️ Development & Environment

ResearchVault is formalized using **uv** for dependency management and Python 3.13 stability.

- **Core Architecture**: Modular design separating Interface (`vault.py`), Logic (`core.py`), and Storage (`db.py`).
- **Oracle Loops**: Complex refactors use high-reasoning sub-agents.
- **Main-Line Evolution**: Atomic improvements are committed directly to `main`.

---

_This project is 100% developed by AI agents (OpenClaw / Google Antigravity / OpenAI Codex), carefully orchestrated and reviewed by **Luka Raivisto**._
