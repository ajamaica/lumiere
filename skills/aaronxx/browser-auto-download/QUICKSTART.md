# 🚀 Quick Start Guide

Get started with Browser Auto Download in 5 minutes!

## 📦 Installation

### Step 1: Install Dependencies

```bash
pip install playwright
playwright install chromium
```

### Step 2: Install Skill

Download `browser-auto-download.skill` from [ClawHub](https://clawhub.com/skills/browser-auto-download) and place it in your OpenClaw skills directory.

## 🎯 Basic Usage

### Option 1: Command Line (Simplest)

```bash
# Auto-detect mode
python skills/browser-auto-download/scripts/auto_download.py \
  --url "https://example.com/download"
```

### Option 2: Python Script

```python
from skills.browser_auto_download.scripts.auto_download import auto_download

result = auto_download(
    url="https://example.com/download",
    headless=False  # See browser in action
)

if result:
    print(f"Downloaded: {result['path']}")
```

### Option 3: Built-in Shortcuts

```bash
# WeChat DevTools
python skills/browser-auto-download/scripts/auto_download.py --wechat

# Meitu Xiuxiu
python skills/browser-auto-download/scripts/auto_download.py --meitu
```

## 📝 Common Use Cases

### Download from Chinese Website

```python
result = auto_download(
    url="https://developers.weixin.qq.com/.../download.html",
    headless=True
)
# Automatically finds "稳定版 Windows 64" button
```

### Download with Navigation

```python
result = auto_download(
    url="https://xiuxiu.meitu.com/",
    auto_navigate=True  # Finds and navigates to PC page
)
# Homepage → PC page → Auto-download
```

### Download Direct Exe Link

```python
result = auto_download(
    url="https://www.python.org/ftp/python/3.14.3/python-3.14.3-amd64.exe"
)
# Direct link, no button clicking needed
```

### Custom Output Directory

```python
result = auto_download(
    url="https://example.com/download",
    output_dir="/path/to/downloads"
)
```

## 🔧 Advanced Options

### Headless Mode (No Browser Window)

```bash
python skills/browser-auto-download/scripts/auto_download.py \
  --url "https://example.com" \
  --headless
```

### Manual Selector

```bash
python skills/browser-auto-download/scripts/auto_download.py \
  --url "https://example.com" \
  --selector "button#download-btn"
```

### Disable Platform Detection

```bash
python skills/browser-auto-download/scripts/auto_download.py \
  --url "https://example.com" \
  --no-auto-select
```

### Disable Multi-Step Navigation

```bash
python skills/browser-auto-download/scripts/auto_download.py \
  --url "https://example.com" \
  --no-auto-navigate
```

## 🎓 Examples

### Example 1: Batch Downloads

```python
downloads = [
    ("https://www.python.org/ftp/python/3.14.3/python-3.14.3-amd64.exe", "Python"),
    ("https://www.7-zip.org/a/7z2501-x64.exe", "7-Zip"),
]

for url, name in downloads:
    result = auto_download(url=url, headless=True)
    if result:
        print(f"✓ {name}: {result['filename']}")
```

### Example 2: With Error Handling

```python
try:
    result = auto_download(
        url="https://example.com/download",
        headless=True,
        wait_timeout=120000  # 2 minutes
    )
    if result:
        print(f"✓ Success: {result['path']}")
except Exception as e:
    print(f"✗ Failed: {e}")
```

### Example 3: Platform Detection

```python
result = auto_download(
    url="https://example.com/download",
    auto_select=True  # Auto-detects your platform
)

# Automatically chooses:
# - Windows 64-bit on AMD64
# - macOS ARM64 on M1/M2/M3
# - Linux x64 on x86_64
```

## 🐛 Troubleshooting

### Download Not Starting

**Problem:** Script clicks but download doesn't start

**Solution:**

```bash
# Use visible mode to observe
python skills/browser-auto-download/scripts/auto_download.py \
  --url "https://example.com" \
  --headless=False
```

### Wrong Version Downloaded

**Problem:** Downloads 32-bit on 64-bit system

**Solution:**

```python
result = auto_download(
    url="https://example.com",
    auto_select=True  # Ensure platform detection is ON
)
```

### Timeout Issues

**Problem:** Large files timeout

**Solution:**

```python
result = auto_download(
    url="https://example.com",
    wait_timeout=300000  # Increase to 5 minutes
)
```

### Website Not Supported

**Problem:** New website pattern not recognized

**Solution:**

```python
# Use manual selector
result = auto_download(
    url="https://example.com",
    download_button_selector="your-custom-selector"
)
```

## 📚 Next Steps

- **Full Documentation:** See [README.md](README.md)
- **More Examples:** See [examples.py](examples.py)
- **Contributing:** See [CONTRIBUTING.md](CONTRIBUTING.md)
- **Report Issues:** https://github.com/your-repo/browser-auto-download/issues

## 💡 Tips

1. **Start with visible mode** (`headless=False`) to see what's happening
2. **Check stderr output** for detailed progress information
3. **Use auto_select=True** for platform-specific downloads
4. **Use auto_navigate=True** for multi-page download flows
5. **JSON output** is printed to stdout for programmatic use

## 🆘 Getting Help

- **Discord:** https://discord.gg/clawd
- **Issues:** https://github.com/your-repo/browser-auto-download/issues
- **ClawHub:** https://clawhub.com/skills/browser-auto-download

---

**Happy Downloading! 🚀**
