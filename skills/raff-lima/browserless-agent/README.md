# Browserless Agent - OpenClaw Skill 🌐

A professional, production-ready web automation skill for OpenClaw with 50+ browser actions.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
playwright install chromium
```

### 2. Configure OpenClaw

This skill will automatically prompt you to configure `BROWSERLESS_URL` in the OpenClaw UI:

1. Open OpenClaw Settings
2. Go to **Skills** → **browserless-agent**
3. Enter your Browserless base URL in the **API Key** field
4. (Optional) Add `BROWSERLESS_TOKEN` in the **env** section for authentication

**Configuration Examples:**

**Cloud Service (with token):**

```
BROWSERLESS_URL=wss://chrome.browserless.io
BROWSERLESS_TOKEN=your-token-here
```

**Local Service (no token):**

```
BROWSERLESS_URL=ws://localhost:3000
```

**Custom Endpoint:**

```
BROWSERLESS_URL=wss://your-host.com/playwright/chromium
BROWSERLESS_TOKEN=optional-token
```

### 3. Get Browserless Service

**Option A: Cloud Service** (Recommended)

- Sign up at [browserless.io](https://browserless.io)
- Free tier available
- Get your base URL and token from dashboard

**Option B: Self-Hosted**

```bash
docker run -p 3000:3000 browserless/chrome
# Base URL: ws://localhost:3000
# No token needed
```

## 📖 Features

### Navigation & Pages (10 actions)

- `navigate` - Go to URL
- `go_back` / `go_forward` - Browser history
- `reload` - Refresh page
- `new_page` / `close_page` / `switch_page` - Multi-tab support
- `wait_for_load` / `wait_for_navigation` - Smart waiting

### Data Extraction (7 actions)

- `get_text` - Extract text content
- `get_attribute` - Get element attributes
- `get_html` - Get inner/outer HTML
- `get_value` - Get form values
- `get_style` - Get computed CSS
- `get_multiple` - Batch extraction
- `get_page_info` - Page metadata

### Interaction (13 actions)

- `click` / `double_click` / `right_click`
- `type_text` - Type with options
- `hover` / `focus`
- `select_option` - Dropdowns
- `check` / `uncheck` - Checkboxes
- `upload_file` - File uploads
- `press_key` / `keyboard_type` - Keyboard control
- `drag_and_drop` - Drag & drop

### Visual Capture (2 actions)

- `screenshot` - PNG/JPEG screenshots
- `pdf` - Generate PDFs

### Form Automation (1 action)

- `fill_form` - Fill multiple fields at once

### Scrolling (4 actions)

- `scroll_to` / `scroll_into_view`
- `scroll_to_bottom` / `scroll_to_top`

### Waiting & Timing (4 actions)

- `wait_for_selector` - Wait for elements
- `wait_for_timeout` - Fixed delays
- `wait_for_function` - Wait for conditions

### Element State (5 actions)

- `is_visible` / `is_enabled` / `is_checked`
- `element_exists` / `element_count`

### Storage & Cookies (6 actions)

- `get_cookies` / `set_cookie` / `delete_cookies`
- `get_local_storage` / `set_local_storage` / `clear_local_storage`

### Network Control (3 actions)

- `set_extra_headers` - Custom headers
- `block_resources` - Block images/CSS/fonts
- Request interception

### Advanced (7 actions)

- `extract_table` - Parse HTML tables
- `extract_links` - Get all links with filtering
- `evaluate` / `evaluate_function` - Run JavaScript
- `handle_dialog` - Alert/confirm handling
- `get_frame_text` / `click_in_frame` - iFrame support

### Browser Context (3 actions)

- `set_viewport` - Screen size
- `set_geolocation` - GPS location
- `set_user_agent` - User agent spoofing

## 💡 Usage Examples

### From Command Line

```bash
# Navigate to a website
python main.py navigate '{"url": "https://example.com"}'

# Take a screenshot
python main.py screenshot '{"url": "https://example.com", "path": "page.png", "full_page": true}'

# Extract data
python main.py get_multiple '{
  "url": "https://news.ycombinator.com",
  "extractions": [
    {"name": "titles", "selector": ".titleline > a", "type": "text", "all": true}
  ]
}'

# Fill a form
python main.py fill_form '{
  "url": "https://example.com/contact",
  "fields": {
    "input[name=\"email\"]": "user@example.com",
    "textarea[name=\"message\"]": "Hello!"
  }
}'

# Generate PDF
python main.py pdf '{
  "url": "https://example.com",
  "path": "page.pdf",
  "format": "A4",
  "margin": {"top": "1cm", "bottom": "1cm"}
}'
```

### From OpenClaw

The agent will automatically use this skill when you ask questions like:

**User:** "Take a screenshot of google.com"

```json
Action: screenshot
Args: {"url": "https://google.com", "path": "google.png"}
```

**User:** "What's the title of wikipedia.org?"

```json
Action: navigate → get_text
Args: {"url": "https://wikipedia.org", "selector": "h1"}
```

**User:** "Search for 'Python' on GitHub and get the first 5 repository names"

```json
Action: navigate → type_text → press_key → wait_for_selector → get_multiple
```

**User:** "Fill out the contact form on example.com with my email"

```json
Action: fill_form
Args: {
  "url": "https://example.com/contact",
  "fields": {"input[type='email']": "your@email.com"}
}
```

## 🎯 Real-World Use Cases

### 1. Web Scraping

```python
# Extract product catalog
python main.py get_multiple '{
  "url": "https://store.com/products",
  "extractions": [
    {"name": "names", "selector": ".product-name", "type": "text", "all": true},
    {"name": "prices", "selector": ".price", "type": "text", "all": true},
    {"name": "images", "selector": ".product-img", "type": "attribute", "attribute": "src", "all": true}
  ]
}'
```

### 2. Automated Testing

```bash
# Test login flow
python main.py fill_form '{
  "url": "https://app.com/login",
  "fields": {
    "input[name=\"username\"]": "testuser",
    "input[name=\"password\"]": "testpass"
  }
}'

python main.py click '{"selector": "button[type=\"submit\"]"}'
python main.py wait_for_selector '{"selector": ".dashboard", "timeout": 5000}'
python main.py screenshot '{"path": "dashboard.png"}'
```

### 3. Content Monitoring

```bash
# Check for changes
python main.py navigate '{"url": "https://news.com"}'
python main.py get_text '{"selector": ".headline", "all": true}'
# Compare with previous results
```

### 4. Report Generation

```bash
# Generate PDF report
python main.py navigate '{"url": "https://analytics.com/report"}'
python main.py wait_for_selector '{"selector": ".chart-loaded"}'
python main.py pdf '{
  "path": "monthly-report.pdf",
  "format": "Letter",
  "landscape": true,
  "margin": {"top": "2cm", "bottom": "2cm"}
}'
```

### 5. Form Automation

```bash
# Batch form submission
python main.py fill_form '{
  "url": "https://survey.com",
  "fields": {
    "input[name=\"name\"]": "John Doe",
    "input[name=\"email\"]": "john@example.com",
    "select[name=\"rating\"]": "5",
    "textarea[name=\"feedback\"]": "Great service!"
  }
}'
python main.py click '{"selector": "button.submit"}'
```

## 🔧 Advanced Configuration

### Custom Wait Strategies

```bash
# Wait for network to be idle (good for AJAX sites)
python main.py navigate '{"url": "https://spa-app.com", "wait_until": "networkidle"}'

# Wait for specific element
python main.py wait_for_selector '{
  "selector": ".dynamic-content",
  "timeout": 15000,
  "state": "visible"
}'
```

### Block Resources (Speed Up)

```bash
# Block images and CSS for faster scraping
python main.py block_resources '{"types": ["image", "stylesheet", "font"]}'
python main.py navigate '{"url": "https://example.com"}'
```

### Custom Headers (Authentication)

```bash
python main.py set_extra_headers '{
  "headers": {
    "Authorization": "Bearer token123",
    "X-Custom-Header": "value"
  }
}'
```

### Mobile Emulation

```bash
python main.py set_viewport '{"width": 375, "height": 667}'
python main.py set_user_agent '{"user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)"}'
```

## 🐛 Troubleshooting

### Connection Failed

```
Error: Timeout occurred: connect ETIMEDOUT
```

**Solutions:**

- Verify `BROWSERLESS_URL` is correct
- Check if `BROWSERLESS_TOKEN` is set (if required by your service)
- Check if Browserless service is running
- Test connection: `curl -I https://your-browserless-host.com`
- Ensure firewall allows WebSocket connections

### Element Not Found

```
Error: waiting for selector ".my-button" failed
```

**Solutions:**

- Use browser DevTools to verify selector
- Wait for element: `wait_for_selector` before interaction
- Check if element is in iframe: use `click_in_frame`
- Increase timeout: `"timeout": 30000`

### Slow Performance

**Solutions:**

- Block unused resources: `block_resources`
- Use `wait_until: "domcontentloaded"` instead of `load`
- Avoid full page screenshots for large pages
- Use specific selectors instead of `get_all`

### JavaScript Errors

```
Error: Evaluation failed
```

**Solutions:**

- Wrap in try-catch: `evaluate '{"expression": "try { myFunc() } catch(e) { e.message }"}'`
- Wait for page load before evaluation
- Check browser console in Browserless debugger

## 📚 API Reference

### Common Parameters

All functions support:

- `url` (optional): Navigate before action
- `timeout` (optional): Custom timeout in milliseconds
- `selector`: CSS selector (use DevTools to find)

### Selector Tips

```css
/* ID */
#my-button

/* Class */
.button-primary

/* Attribute */
input[name="email"]
a[href*="github"]

/* Hierarchy */
div.container > button
nav a.active

/* Pseudo-classes */
button:not(.disabled)
li:first-child
```

### Return Format

All actions return JSON:

```json
{
  "status": "success|error",
  "action": "action_name",
  "message": "error message if failed",
  "...": "action-specific data"
}
```

## 🔒 Security

- ✅ Credentials never logged
- ✅ TLS encryption (wss://)
- ✅ Isolated browser containers
- ✅ No local browser required
- ⚠️ Be careful with sensitive data in screenshots
- ⚠️ Validate user input before navigation
- ⚠️ Use authentication headers securely

## 📦 Dependencies

```
playwright>=1.40.0
```

## 🤝 Contributing

Found a bug or want a new feature? Open an issue!

## 📄 License

MIT License - Use freely and modify as needed.

## 🌟 Tips & Best Practices

1. **Always wait for dynamic content**

   ```bash
   python main.py wait_for_selector '{"selector": ".loaded"}'
   ```

2. **Use batch operations**

   ```bash
   # Better: One call with get_multiple
   # Instead of: Multiple get_text calls
   ```

3. **Handle errors gracefully**

   ```bash
   # Check if element exists first
   python main.py element_exists '{"selector": ".optional"}'
   ```

4. **Optimize for speed**

   ```bash
   # Block unnecessary resources
   python main.py block_resources '{"types": ["image", "font"]}'
   ```

5. **Use specific selectors**
   ```bash
   # Good: button[data-test-id="submit"]
   # Bad: div > div > button
   ```

## 🎓 Learning Resources

- [Playwright Documentation](https://playwright.dev/python/)
- [CSS Selectors Guide](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors)
- [JavaScript Evaluation](https://playwright.dev/python/docs/evaluating)
- [Browserless Docs](https://docs.browserless.io/)

---

**Made with ❤️ for OpenClaw**

Need help? Ask your OpenClaw agent: _"How do I use the browserless-agent skill?"_
