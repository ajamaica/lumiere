# Camoufox Options Reference

## Camoufox() Parameters

| Parameter            | Type | Default | Description                                       |
| -------------------- | ---- | ------- | ------------------------------------------------- |
| `headless`           | bool | True    | **Set to False** - headless mode gets detected    |
| `os`                 | str  | auto    | OS to emulate: `'linux'`, `'macos'`, `'windows'`  |
| `humanize`           | bool | False   | Enable human-like mouse movements                 |
| `persistent_context` | bool | False   | Save browser state between sessions               |
| `user_data_dir`      | str  | None    | Directory for profile/cookies                     |
| `proxy`              | str  | None    | Proxy URL (e.g., `http://user:pass@host:port`)    |
| `fingerprint`        | obj  | None    | Custom BrowserForge fingerprint (not recommended) |

## OS Matching

**Critical**: The `os` parameter must match your actual server OS. Bot detectors check JavaScript stack traces which reveal the real OS.

```python
# On Linux server
Camoufox(os='linux')  # ✓ Correct

# On macOS
Camoufox(os='macos')  # ✓ Correct

# Wrong: Linux server pretending to be Mac
Camoufox(os='macos')  # ✗ Will be detected
```

## Display Options for Headless Servers

### Xvfb (Virtual Framebuffer)

Best for automated scripts:

```bash
xvfb-run -a --server-args="-screen 0 1920x1080x24" python3 script.py
```

### VNC (for manual intervention)

Best when you need to see/interact with browser:

```bash
# Start VNC server
vncserver :1 -geometry 1920x1080 -depth 24

# Run with VNC display
DISPLAY=:1 python3 script.py
```

## Proxy Configuration

```python
# HTTP proxy
Camoufox(proxy='http://user:pass@proxy.example.com:8080')

# SOCKS5 proxy
Camoufox(proxy='socks5://user:pass@proxy.example.com:1080')
```

## Common Patterns

### Screenshot with wait

```python
page.goto(url)
time.sleep(3)  # Let dynamic content load
page.wait_for_load_state('networkidle')
page.screenshot(path='output.png')
```

### Handle login forms

```python
page.fill('input[name="username"]', 'myuser')
page.fill('input[name="password"]', 'mypass')
page.click('button[type="submit"]')
page.wait_for_url('**/dashboard**')
```

### Extract text

```python
text = page.inner_text('body')
# or specific element
title = page.inner_text('h1')
```
