# Browserless Agent - OpenClaw Skill

## 🎯 What's New in This Version

### ✨ Major Improvements

1. **50+ Browser Actions** - Expanded from 7 to 50+ actions covering every web automation need
2. **Flexible Configuration** - Separate base URL and token for better environment management
3. **OpenClaw Integration** - Automatic environment variable configuration through OpenClaw UI
4. **Smart Error Handling** - Detailed error messages with recovery suggestions
5. **Multi-Tab Support** - Manage multiple browser tabs simultaneously
6. **Professional Documentation** - Complete guides, examples, and API reference

### 🔧 Configuration (Easy Setup!)

**The skill uses TWO environment variables for maximum flexibility:**

**Required:**

- `BROWSERLESS_URL` - Base URL of your Browserless service

**Optional:**

- `BROWSERLESS_TOKEN` - Authentication token (if your service requires it)

This separation allows you to:

- ✅ Use local Browserless without authentication
- ✅ Easily switch between environments (dev/staging/prod)
- ✅ Use different endpoints (chromium/firefox/webkit)
- ✅ Share base URL while keeping tokens private

**Configuration Examples:**

```bash
# Cloud with authentication
BROWSERLESS_URL=wss://chrome.browserless.io
BROWSERLESS_TOKEN=your-secret-token

# Local without authentication
BROWSERLESS_URL=ws://localhost:3000
# No token needed!

# Custom endpoint
BROWSERLESS_URL=wss://your-host.com/playwright/chromium
BROWSERLESS_TOKEN=optional-token
```

The skill automatically:

- Adds `/playwright/chromium` if endpoint not specified
- Appends token as query parameter if provided
- Works with or without token

Get your Browserless service at [browserless.io](https://browserless.io) (free tier available)

### 📦 New Actions Added

**Navigation (5 new)**

- `go_back`, `go_forward`, `reload`, `wait_for_load`, `wait_for_navigation`

**Data Extraction (5 new)**

- `get_attribute`, `get_html`, `get_value`, `get_style`, `get_multiple`

**Interaction (10 new)**

- `double_click`, `right_click`, `hover`, `focus`, `select_option`
- `check`, `uncheck`, `upload_file`, `press_key`, `keyboard_type`

**Scrolling (4 new)**

- `scroll_to`, `scroll_into_view`, `scroll_to_bottom`, `scroll_to_top`

**Visual (1 new)**

- `pdf` - Generate PDF from any webpage

**Waiting (3 new)**

- `wait_for_selector`, `wait_for_timeout`, `wait_for_function`

**Element State (5 new)**

- `is_visible`, `is_enabled`, `is_checked`, `element_exists`, `element_count`

**Storage (6 new)**

- `get_cookies`, `set_cookie`, `delete_cookies`
- `get_local_storage`, `set_local_storage`, `clear_local_storage`

**Network (3 new)**

- `set_extra_headers`, `block_resources`, `get_page_info`

**Advanced (10 new)**

- `drag_and_drop`, `fill_form`, `extract_table`, `extract_links`
- `handle_dialog`, `get_frame_text`, `click_in_frame`
- `evaluate_function`, `set_viewport`, `set_geolocation`, `set_user_agent`

**Multi-Tab (4 new)**

- `new_page`, `close_page`, `switch_page`, `list_pages`

## 🚀 Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Configure in OpenClaw UI (it will prompt you automatically)
# Or set environment variable:
export BROWSERLESS_WS="wss://your-host.com/playwright/chromium?token=YOUR_TOKEN"

# Test the skill
python tests/test_browserless.py

# Run examples
python examples/quick_test.py
```

## 💡 Usage Examples

### From OpenClaw Chat

**User:** "Take a screenshot of github.com"

- Agent automatically uses this skill to capture the screenshot

**User:** "What's the title of the top post on Hacker News?"

- Agent navigates, extracts, and returns the data

**User:** "Search for 'Python' on Google and show me the first 5 results"

- Agent performs multi-step automation

### From Command Line

```bash
# Navigate
python main.py navigate '{"url": "https://example.com"}'

# Extract data
python main.py get_multiple '{
  "url": "https://news.ycombinator.com",
  "extractions": [
    {"name": "titles", "selector": ".titleline > a", "type": "text", "all": true}
  ]
}'

# Take screenshot
python main.py screenshot '{"url": "https://example.com", "path": "page.png", "full_page": true}'

# Generate PDF
python main.py pdf '{"url": "https://example.com", "path": "page.pdf", "format": "A4"}'

# Fill form
python main.py fill_form '{
  "url": "https://example.com/contact",
  "fields": {
    "input[name=\"email\"]": "user@example.com"
  }
}'
```

## 📂 File Structure

```
browserless-agent/
├── main.py                    # Core skill implementation (50+ actions)
├── SKILL.md                   # OpenClaw skill metadata & documentation
├── requirements.txt           # Python dependencies
├── README.md                  # Complete usage guide
├── CHANGELOG.md              # This file
├── .env.example              # Environment variable template
├── examples/
│   └── quick_test.py         # 7 working examples
└── tests/
    └── test_browserless.py   # Test suite (7 tests)
```

## 🎓 Documentation

- **[SKILL.md](SKILL.md)** - OpenClaw integration & all 50+ actions reference
- **[README.md](README.md)** - Complete guide with examples and best practices
- **[examples/](examples/)** - Working code examples
- **[tests/](tests/)** - Test suite to verify setup

## 🔒 Security Features

- ✅ WebSocket over TLS (wss://)
- ✅ Credentials never logged
- ✅ Isolated browser containers
- ✅ Automatic connection cleanup
- ✅ Input validation and sanitization

## 🐛 Bug Fixes

- Fixed timeout handling for slow pages
- Improved selector waiting logic
- Better error messages with context
- Graceful connection cleanup
- Support for optional parameters

## 🎯 Use Cases

1. **Web Scraping** - Extract structured data from any website
2. **Testing** - Automated E2E testing of web applications
3. **Monitoring** - Track changes on websites
4. **Reporting** - Generate PDFs from web content
5. **Automation** - Fill forms, click buttons, navigate flows
6. **Research** - Collect data for analysis
7. **Screenshots** - Capture web pages programmatically

## 🚀 Performance

- **Fast**: Connects via WebSocket (low latency)
- **Reliable**: Auto-retry on transient failures
- **Efficient**: Resource blocking for faster scraping
- **Scalable**: Stateless design, multi-tab support

## 🤝 Contributing

Contributions welcome! Some ideas:

- Add more actions (OCR, video recording, etc.)
- Improve error handling
- Add more examples
- Performance optimizations

## 📝 License

MIT License - Free to use and modify

## 🆘 Support

Having issues? Check:

1. [README.md](README.md) - Troubleshooting section
2. Run tests: `python tests/test_browserless.py`
3. Check examples: `python examples/quick_test.py`
4. Verify BROWSERLESS_WS is set correctly

## 🙏 Credits

Built for the OpenClaw community with ❤️

Powered by:

- [Playwright](https://playwright.dev) - Browser automation
- [Browserless](https://browserless.io) - Cloud browser infrastructure
- [OpenClaw](https://openclaw.ai) - AI agent framework

---

**Version:** 2.0.0  
**Date:** February 2026  
**Status:** Production Ready ✅
