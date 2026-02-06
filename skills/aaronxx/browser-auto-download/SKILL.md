---
name: browser-auto-download
version: '4.1.0'
description: 'Browser-automated file download with enhanced features. Auto-detects platform (Windows/macOS/Linux, 64/32-bit, ARM/Intel), handles multi-step navigation (homepage to platform-specific pages), captures auto-downloads triggered on page load, and falls back to button clicking when needed. Ideal for complex download flows where curl/wget fail due to client-side rendering, automatic downloads, or multi-page navigation. Features page scrolling for lazy content, extended wait times, and Golang support.'
---

# Browser Auto Download v4.1.0 (Enhanced)

Download files from dynamic webpages with **intelligent detection and multi-step navigation**.

## Key Features

- **Auto-download capture**: Detects downloads triggered automatically on page load
- **Multi-step navigation**: Finds and navigates to platform-specific pages (PC/Desktop versions)
- **Platform auto-detection**: Windows x64/ARM64, macOS Intel/Apple Silicon, Linux
- **Event listening**: Captures all download events without requiring button clicks
- **Smart fallback**: Tries multiple strategies (auto-download, navigation, clicking)

## When to Use

Use this skill for:

- **Auto-download sites**: Downloads start automatically when page loads
- **Multi-step flows**: Homepage - click "PC version" - download page
- **Dynamic content**: Download links generated via JavaScript
- **Interactive downloads**: Requires clicking buttons or navigating UI

**NOT for**: Direct file URLs (use `curl`/`wget` instead)

## Quick Start

### Option 1: Automatic (Recommended)

```bash
python skills/browser-auto-download/scripts/auto_download.py \
  --url "https://example.com/download"
```

The script will:

1. Check for auto-downloads on page load
2. Look for platform-specific page links (PC/Desktop version)
3. Navigate if needed
4. Try clicking download buttons as fallback

### Option 2: Built-in Shortcuts

```bash
# WeChat DevTools
python skills/browser-auto-download/scripts/auto_download.py --wechat

# Meitu Xiuxiu
python skills/browser-auto-download/scripts/auto_download.py --meitu
```

### Option 3: Python Module

```python
from skills.browser-auto-download.scripts.auto_download import auto_download

result = auto_download(
    url="https://example.com/download",
    auto_select=True,   # Platform detection
    auto_navigate=True  # Multi-step navigation
)

if result:
    print(f"Downloaded: {result['path']}")
```

## How It Works

### Three-Stage Strategy

**Stage 1: Auto-Download Detection**

```
Page loads - Check for downloads - Success?
    Yes:                    No:
    Save file               Go to Stage 2
```

**Stage 2: Multi-Step Navigation**

```
Look for "PC/Desktop" link - Navigate - Check downloads - Success?
    Yes:                        No:
    Save file                  Go to Stage 3
```

**Stage 3: Button Clicking**

```
Try multiple selectors - Click - Wait for download - Save
```

### Platform-Specific Page Detection

Automatically finds links like:

- "meitu for PC" - pc.meitu.com
- "Desktop version" - desktop.example.com
- "Windows Download" - windows.example.com

Keywords: `pc`, `desktop`, `windows`, `mac`, `download`, `电脑`, `桌面`, `客户端`

## Examples

### Auto-Download Sites (Best Case)

```bash
# Sites that trigger download on page load
python skills/browser-auto-download/scripts/auto_download.py \
  --url "https://pc.meitu.com/en/pc?download=pc"
```

### Multi-Step Navigation

```bash
# Homepage - PC version - Download
python skills/browser-auto-download/scripts/auto_download.py \
  --url "https://xiuxiu.meitu.com/" \
  --auto-navigate  # Enable (default: True)
```

### Manual Selector (Fallback)

```bash
# If auto-detection fails
python skills/browser-auto-download/scripts/auto_download.py \
  --url "https://example.com/download" \
  --selector "button:has-text('Download for free')"
```

### Disable Features

```bash
# Don't navigate to platform pages
python skills/browser-auto-download/scripts/auto_download.py \
  --url "https://example.com" \
  --no-auto-navigate

# Don't detect platform
python skills/browser-auto-download/scripts/auto_download.py \
  --url "https://example.com" \
  --no-auto-select
```

## Platform Detection

| System  | Architecture     | Keywords Used                   |
| ------- | ---------------- | ------------------------------- |
| Windows | AMD64/x86_64     | windows, win64, x64, 64-bit, pc |
| Windows | x86/i686         | windows, win32, x86, 32-bit, pc |
| macOS   | ARM64 (M1/M2/M3) | macos, arm64, apple silicon     |
| macOS   | x86_64 (Intel)   | macos, x64, intel               |
| Linux   | x86_64           | linux, x64, amd64               |

## Troubleshooting

**Download not starting**:

- Use `--headless` (default: False) to observe the process
- Check stderr for auto-download messages
- Try `--no-auto-navigate` if navigation is causing issues
- Use `--selector` to manually specify button

**Wrong version downloaded**:

- Check platform detection in stderr output
- Use `--no-auto-select` and manually specify `--selector`
- Verify the site offers multiple versions

**Navigation going to wrong page**:

- Disable with `--no-auto-navigate`
- The site may not have platform-specific pages

**File not saved**:

- Check write permissions in output directory
- Ensure sufficient disk space
- Wait for large files (up to 3 minutes)

## Output Format

### stderr (Progress)

```
Starting browser (visible)...
Opening: https://example.com
Checking for auto-downloads...
Checking for platform-specific page link...
Found platform page: https://pc.example.com
Navigating to platform page...
Download detected: software_v2.1.0_win64.exe
Saving: software_v2.1.0_win64.exe

SUCCESS!
File: C:\Users\User\Downloads\software_v2.1.0_win64.exe
Size: 231.9 MB
```

### stdout (JSON result)

```json
{
  "path": "C:\\Users\\User\\Downloads\\software_v2.1.0_win64.exe",
  "filename": "software_v2.1.0_win64.exe",
  "size_bytes": 243209941,
  "size_mb": 231.9,
  "platform": "Windows AMD64"
}
```

## Real-World Examples

### Meitu Xiuxiu (Multi-step + Auto-download)

```python
from auto_download import quick_download_meitu

result = quick_download_meitu()
# Flow: Homepage - PC page link - Navigate - Auto-download
```

### WeChat DevTools (Button click)

```python
from auto_download import quick_download_wechat_devtools

result = quick_download_wechat_devtools()
# Flow: Homepage - Click "Stable Windows 64" - Download
```

### Generic Software (Mixed)

```python
result = auto_download(
    url="https://example.com/downloads",
    auto_select=True,    # Detect Windows 64-bit
    auto_navigate=True   # Find "Desktop version" link
)
```

## Requirements

```bash
pip install playwright
playwright install chromium
```

## Advanced Usage

### Custom Platform Keywords

Modify `get_system_preference()` in the script to add custom keywords.

### Integration with Scripts

```python
import subprocess
import json

result = subprocess.run([
    'python', 'skills/browser-auto-download/scripts/auto_download.py',
    '--url', 'https://example.com/download'
], capture_output=True, text=True)

if result.returncode == 0:
    data = json.loads(result.stdout)
    print(f"Downloaded: {data['path']}")  # Use the file
```

### Batch Downloads

```python
urls = [
    "https://example1.com/download",
    "https://example2.com/download",
    "https://example3.com/download"
]

for url in urls:
    result = auto_download(url)
    if result:
        print(f"Success: {result['filename']}")
```
