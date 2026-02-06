# Changelog

## [2.1.1] - 2026-02-05

### Added

- AGENTS.md template for memory recall instructions
- MEMORY_STRUCTURE.md with directory organization guide
- Test script (`--test` command) for verification
- Troubleshooting table in README
- Better onboarding documentation

## [2.1.0] - 2026-02-04

### Added

- Smart wrapper with automatic fallback (vector → built-in)
- Zero-configuration philosophy
- Graceful degradation when vector not ready

## [2.0.0] - 2026-02-04

### Added

- 100% local embeddings using `all-MiniLM-L6-v2` via Transformers.js
- No API calls required
- Semantic chunking (by headers, not just lines)
- Cosine similarity scoring
- JSON storage for personal-scale use
- OpenClaw skill manifest
- Programmatic API wrapper (`memory.js`)

### Changed

- Replaced word-frequency embeddings with neural embeddings
- Improved retrieval quality significantly
- Better chunking strategy (semantic boundaries)

## [1.0.0] - 2026-02-04

### Added

- Initial version with word-frequency embeddings
- Simple JSON storage
- Basic CLI interface
- pgvector support (Docker-based)

### Notes

- Word-frequency method works but has limited semantic understanding
- Neural embeddings (v2) recommended for production use
