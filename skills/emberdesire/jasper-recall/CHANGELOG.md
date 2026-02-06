# Changelog

All notable changes to Jasper Recall will be documented in this file.

## [0.3.0] - 2026-02-05

### Added (JR-19: Multi-Agent Mesh)

- **Multi-agent mesh** — N agents can share memory, not just 2
- **Agent-specific collections** — Each agent gets its own collection (`agent_sonnet`, `agent_qwen`, etc.)
- **`recall-mesh` script** — Enhanced recall with `--agent` and `--mesh` flags
- **`index-digests-mesh` script** — Index into agent-specific collections
- **Mesh queries** — Query multiple agents' collections: `--mesh sonnet,qwen,opus`
- **Backward compatibility** — Legacy collections still work (`private_memories`)
- **Documentation** — Comprehensive guide in `docs/MULTI-AGENT-MESH.md`

### Features

- `recall-mesh "query" --agent sonnet` — Query as specific agent
- `recall-mesh "query" --mesh sonnet,qwen` — Query multiple agents
- `index-digests-mesh --agent sonnet` — Index for specific agent
- Agent memory remains private by default
- Shared and learnings collections accessible to all agents

### Technical

- Each agent collection is isolated in ChromaDB
- Collections queried in parallel and results merged
- Relevance-based sorting across all collections
- Automatic collection creation on first index

## [0.2.1] - 2026-02-05

### Added

- **`serve` command** — HTTP API server for sandboxed/Docker agents
  - `npx jasper-recall serve --port 3458`
  - `GET /recall?q=query` endpoint
  - Public-only enforced by default for security
  - CORS enabled for browser/agent access
- Sandboxed agents can now query memories without CLI access
- Server exports for programmatic use

### Security

- API server enforces `public_only=true` by default
- Private content access requires `RECALL_ALLOW_PRIVATE=true` env var

## [0.2.0] - 2026-02-05

### Added

- **Memory tagging** — Mark entries `[public]` or `[private]` in daily notes
- **`--public-only` flag** — Sandboxed agents query only shared content
- **`privacy-check` command** — Scan text/files for sensitive data before sharing
- **`sync-shared` command** — Extract `[public]` entries to shared memory directory
- **Bidirectional learning** — Main and sandboxed agents share knowledge safely

### Changed

- `recall` now supports post-filtering for privacy-tagged content
- README updated with shared memory documentation

## [0.1.0] - 2026-02-04

### Added

- Initial release
- `recall` — Semantic search over indexed memories
- `index-digests` — Index markdown files into ChromaDB
- `digest-sessions` — Extract summaries from session logs
- `npx jasper-recall setup` — One-command installation
- Local embeddings via sentence-transformers (all-MiniLM-L6-v2)
- ChromaDB persistent vector storage
- Incremental indexing with content hashing

## [0.2.2] - 2026-02-05

### Fixed

- `serve` command now properly passes CLI arguments (--help, --port, etc.)
- Server runCLI function exported for programmatic use

## [0.2.3] - 2026-02-05

### Added

- **Automatic update check** — Notifies you when new versions are available
- `update` command — Manually check for updates: `npx jasper-recall update`
- Update checks cached for 24 hours (non-intrusive)

## [0.2.4] - 2026-02-05

### Added

- **Configuration management** — `npx jasper-recall config` shows settings
- Config file: `~/.jasper-recall/config.json`
- `config init` creates config file with defaults
- Environment variables override config file
- Documented all configuration options in help
