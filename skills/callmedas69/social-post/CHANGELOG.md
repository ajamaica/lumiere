# Changelog

All notable changes to the social-post skill will be documented in this file.

## [1.0.0] - 2026-02-06

### Added

- **Multi-platform posting**: Post to Twitter, Farcaster, or both simultaneously
- **Thread support**: Automatically split long text into numbered, connected threads
- **Link shortening**: Compress URLs using TinyURL to save characters
- **Image upload support**: Upload images to both platforms
  - Twitter: Direct upload via Twitter API
  - Farcaster: Upload to catbox.moe with proper embed support
- **Character/byte limit validation**: 252 chars (Twitter) / 288 bytes (Farcaster) with 10% safety buffer
- **Platform-specific posting**: `--twitter` and `--farcaster` flags
- **Auto-truncate option**: `--truncate` flag to automatically shorten text
- **Dry-run mode**: `--dry-run` flag to preview without posting
- **Comprehensive error handling**: Clear error messages and troubleshooting guidance

### Features

- Character count validation before posting
- Shows exact overflow amount when over limit
- Smart thread splitting by sentences and paragraphs
- 2-second delays between thread parts for rate limiting
- Image attachment on first post of thread
- Proper reply chains (Twitter: `in_reply_to_tweet_id`, Farcaster: `parentCastId`)
- Automatic credential loading from `.env` and Farcaster credentials file

### Documentation

- Complete SKILL.md with usage examples
- Detailed README.md with setup instructions
- Troubleshooting guide for common errors
- Credential requirements and verification steps

### Technical

- Bash scripts with modular library architecture
- Twitter OAuth 1.0a integration
- Farcaster hub integration with x402 payments
- Python dependencies: `requests`, `requests_oauthlib`
- External dependencies: `curl`, `jq`
