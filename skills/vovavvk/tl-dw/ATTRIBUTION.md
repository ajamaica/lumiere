# Attribution

This OpenClaw skill is based on **TL;DW** (Too Long; Didn't Watch) by **stong**.

## Original Project
- **Repository:** https://github.com/stong/tldw
- **Website:** https://tldw.tube
- **License:** GNU Affero General Public License v3.0 (AGPL-3.0)

## What This Skill Adapts

This skill ports the core transcript extraction and processing logic from the original tldw project:

- `VideoExtractor` class for YouTube caption extraction
- Caption deduplication algorithm
- Multi-format support (VTT/SRT/TTML)
- Timing-based paragraph formatting
- Caching system for metadata and captions

## Changes Made for OpenClaw

1. **Integration:** Adapted for OpenClaw's skill system and workflow
2. **Summarization:** Replaced OpenAI API calls with OpenClaw's native model support (uses user's configured model via `sessions_spawn`)
3. **Removed:** Flask HTTP API (not needed for agent integration)
4. **Added:** Cookie support for age-restricted content
5. **Enhanced:** Error handling and user feedback

## License

This skill inherits the AGPL-3.0 license from the original tldw project. See LICENSE file for full terms.

## Credits

All credit for the core transcript extraction and processing algorithms goes to **stong** and contributors to the original tldw project.
