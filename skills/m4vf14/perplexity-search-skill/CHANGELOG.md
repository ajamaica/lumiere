# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-02-04

### Added

- Initial release
- Web search via Perplexity Search API
- Recency filtering (day/week/month/year)
- Result count control (1-10)
- JSON and formatted output modes
- Security hardening:
  - ANSI sanitization
  - API key protection
  - Error message sanitization
  - Request timeout
  - Input validation
- Comprehensive documentation
- MIT License

### Security

- API key stored in environment variables only
- Output sanitization prevents terminal injection
- Error messages don't expose sensitive information
- 30-second timeout on all requests
- Input validation on all parameters
