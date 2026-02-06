# Changelog

All notable changes to the Hippocampus Memory skill.

## [3.8.6] - 2026-02-05

### Changed

- Added `title: "Hippocampus - Memory System"` for better search discoverability

## [3.8.3] - 2026-02-05

### Added

- **Multi-session support**: `preprocess.sh` now scans ALL session files, not just one
- Datetime-based watermark (`lastProcessedTimestamp`) for reliable cross-session tracking

### Changed

- Watermark system: switched from message ID to ISO datetime format
- Improved filtering to work across multiple conversation sessions

### Fixed

- Bug where only the most recently modified session was scanned
- Messages from other sessions were being missed during encoding

## [3.7.1] - 2026-02-02

### Added

- Brain dashboard generator (`generate-dashboard.sh`)
- Auto-detection of other brain skills (amygdala, VTA)
- Dashboard shows install prompts for missing skills

## [3.7.0] - 2026-01-31

### Added

- Semantic reinforcement during encoding
- LLM compares new signals to existing memories automatically

### Changed

- Removed manual `reinforce.sh` — reinforcement is now automatic

## [3.6.0] - 2026-01-30

### Added

- `sync-core.sh` for generating `HIPPOCAMPUS_CORE.md`
- Integration with OpenClaw's RAG via `memorySearch.extraPaths`

## [3.5.0] - 2026-01-29

### Added

- `encode-pipeline.sh` — unified encoding workflow
- Importance scoring based on signal content
- Automatic pending memory generation

## [3.0.0] - 2026-01-27

### Changed

- Complete rewrite based on Stanford Generative Agents paper
- New memory index schema with importance, decay, reinforcement
- Domain-based memory organization (user/self/relationship/world)

## [2.0.0] - 2026-01-25

### Added

- Initial decay system (0.99^days formula)
- `recall.sh` with importance weighting

## [1.0.0] - 2026-01-20

### Added

- Initial release
- Basic memory capture and retrieval
- `preprocess.sh` for signal extraction
