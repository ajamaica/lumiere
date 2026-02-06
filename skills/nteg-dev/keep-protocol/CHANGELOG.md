# Changelog

All notable changes to keep-protocol will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.0] — 2026-02-05

### Added

- **MCP Server** for direct tool calling (`keep-mcp` command) (KP-24)
  - `keep_send` — Send signed packets to agents
  - `keep_discover` — Get server info/stats
  - `keep_discover_agents` — List connected agents
  - `keep_listen` — Register and receive messages
  - `keep_ensure_server` — Auto-start server if needed
- Optional MCP dependency: `pip install keep-protocol[mcp]`
- Entry points: `keep-mcp` CLI and `python -m keep.mcp`
- MCP setup documentation in SKILL.md (KP-28)

### Performance

- MCP tools achieve **<60ms latency** vs 80-150s with skill-based approach (118x faster)

### Changed

- Minimum Python version raised to 3.10 (MCP SDK requirement)
- CI matrix updated to test Python 3.10, 3.11, 3.12, 3.13

## [0.4.0] — 2026-02-03

### Added

- `ensure_server()` auto-bootstrap function (KP-11)
  - Checks if port 9009 is accepting connections
  - Starts server via Docker if not running
  - Falls back to `go install` if Docker unavailable
  - Waits up to 30 seconds for server readiness
- CI test workflow for Python and Go (KP-16)
- Release workflow template for Linear issue structure
- Mandatory staging workflow documentation

### Fixed

- pytest fixture error in test suite
- go vet scope to exclude reference code

### Documentation

- Added `ensure_server()` usage to README
- Refined virality plan for v0.3.0+
- Sandbox testing step in release checklist

## [0.3.1] — 2026-02-03

### Fixed

- Excluded `keep-protocol-clawhub/` from `go vet` (reference code, not buildable)
- Updated release checklist with proper tag-first workflow

## [0.3.0] — 2026-02-03

### Added

- **Discovery system** (KP-7)
  - `discover("info")` — server version, agents online, uptime
  - `discover("agents")` / `discover_agents()` — list connected agents
  - `discover("stats")` — scar exchange counts, total packets
- **Endpoint caching** — `~/.keep/endpoints.json`
- **`from_cache()` client** — reconnect from cached endpoints
- **Scar logging** — server tracks scar field exchanges
- Discovery feature test suite (KP-10)

### Changed

- Wire protocol now uses length-prefixed framing (KP-1)
  - `[4 bytes: uint32 big-endian length][N bytes: protobuf Packet]`
  - Maximum payload: 65,536 bytes
  - **Breaking:** Raw protobuf writes no longer accepted

### Documentation

- SKILL.md for ClawHub/AI agent discovery (KP-6)
- AGENTS.md for AI coding assistant integration
- ClawHub publishing guide with registry workaround
- Routing examples and v0.2.0 protocol docs (KP-4)

## [0.2.0] — 2026-02-03

### Added

- **Agent-to-agent routing** (KP-2)
  - Server maintains identity-based routing table
  - First signed packet's `src` field registers the connection
  - `dst="bot:alice"` forwards to registered agent
- **Persistent connections** with `listen()` in Python SDK (KP-3)
- Length-prefixed wire framing (KP-1)

### Changed

- Wire format requires 4-byte length prefix (breaking change from v0.1.x)

## [0.1.1] — 2026-02-02

### Added

- Multi-arch Docker image (amd64 + arm64)

### Fixed

- CI: Added `contents:read` permission to PyPI publish job
- CI: Lowercase ghcr.io tags (Docker requires lowercase)

## [0.1.0] — 2026-02-02

### Added

- Initial release
- Go server with ed25519 signature verification
- Python SDK (`KeepClient`)
- Protobuf packet schema (`keep.proto`)
- Docker image at `ghcr.io/clcrawford-dev/keep-server`
- PyPI package `keep-protocol`

### Protocol

- Packets must be ed25519 signed (unsigned = silent drop)
- Fields: sig, pk, typ, id, src, dst, body, fee, ttl, scar
- Default port: 9009

---

[Unreleased]: https://github.com/CLCrawford-dev/keep-protocol/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/CLCrawford-dev/keep-protocol/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/CLCrawford-dev/keep-protocol/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/CLCrawford-dev/keep-protocol/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/CLCrawford-dev/keep-protocol/compare/v0.1.1...v0.3.0
[0.2.0]: https://github.com/CLCrawford-dev/keep-protocol/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/CLCrawford-dev/keep-protocol/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/CLCrawford-dev/keep-protocol/releases/tag/v0.1.0
