# Execution Guide for AI Agents

This guide provides detailed instructions for AI agents on how to execute aria2-json-rpc skill commands.

## Core Principles

**NEVER manually construct JSON-RPC requests. ALWAYS use the provided Python scripts.**

**⚠️ CRITICAL: Use `python3` command, NOT `python`**

- On macOS, the `python` symlink doesn't exist by default
- Always use `python3` for cross-platform compatibility
- All examples in this guide use `python3`

## Execution Workflow

1. **Parse** the user's natural language command to identify intent
2. **Map** the intent to the appropriate script and method
3. **Execute** the script using the Bash tool with proper parameters
4. **Format** the output in a user-friendly way

## Available Scripts

### Primary Script

- `scripts/rpc_client.py` - Direct RPC method calls (main interface)

### Helper Scripts

- `scripts/command_mapper.py` - Parse natural language to RPC methods
- `scripts/examples/list-downloads.py` - List all downloads with formatting
- `scripts/examples/pause-all.py` - Pause all active downloads
- `scripts/examples/monitor-downloads.py` - Real-time monitoring
- `scripts/examples/add-torrent.py` - Add torrent downloads
- `scripts/examples/set-options.py` - Modify download options

## Command Mapping Table

| User Intent                        | Script Call                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------- |
| Download a file                    | `python3 scripts/rpc_client.py aria2.addUri '["{URL}"]'`                                    |
| Download multiple files separately | Call `python3 scripts/rpc_client.py aria2.addUri '["URL"]'` once per file                   |
| Check download status              | `python3 scripts/rpc_client.py aria2.tellStatus {GID}`                                      |
| Check if download completed        | `python3 scripts/rpc_client.py aria2.tellStatus {GID}` (check status="complete")            |
| Pause download                     | `python3 scripts/rpc_client.py aria2.pause {GID}`                                           |
| Pause all downloads                | `python3 scripts/rpc_client.py aria2.pauseAll`                                              |
| Resume download                    | `python3 scripts/rpc_client.py aria2.unpause {GID}`                                         |
| Resume all downloads               | `python3 scripts/rpc_client.py aria2.unpauseAll`                                            |
| Remove active download             | `python3 scripts/rpc_client.py aria2.remove {GID}`                                          |
| Remove completed download          | `python3 scripts/rpc_client.py aria2.removeDownloadResult {GID}`                            |
| List active downloads              | `python3 scripts/rpc_client.py aria2.tellActive`                                            |
| List waiting downloads             | `python3 scripts/rpc_client.py aria2.tellWaiting 0 100`                                     |
| List stopped downloads             | `python3 scripts/rpc_client.py aria2.tellStopped 0 100`                                     |
| Get last 10 completed downloads    | `python3 scripts/rpc_client.py aria2.tellStopped -1 10`                                     |
| Show global stats                  | `python3 scripts/rpc_client.py aria2.getGlobalStat`                                         |
| Show aria2 version                 | `python3 scripts/rpc_client.py aria2.getVersion`                                            |
| List all available RPC methods     | `python3 scripts/rpc_client.py system.listMethods`                                          |
| Get download options               | `python3 scripts/rpc_client.py aria2.getOption {GID}`                                       |
| Get global options                 | `python3 scripts/rpc_client.py aria2.getGlobalOption`                                       |
| Change download speed limit        | `python3 scripts/rpc_client.py aria2.changeOption {GID} '{"max-download-limit":"1048576"}'` |
| Purge download results             | `python3 scripts/rpc_client.py aria2.purgeDownloadResult`                                   |

## Parameter Formatting

### Pattern 1: No Parameters

```bash
python3 scripts/rpc_client.py aria2.getGlobalStat
python3 scripts/rpc_client.py aria2.pauseAll
python3 scripts/rpc_client.py aria2.getVersion
```

### Pattern 2: Single String (GID)

```bash
python3 scripts/rpc_client.py aria2.tellStatus 2089b05ecca3d829
python3 scripts/rpc_client.py aria2.pause 2089b05ecca3d829
python3 scripts/rpc_client.py aria2.remove 2089b05ecca3d829
```

### Pattern 3: Array of Strings (URLs)

```bash
# Single URL
python3 scripts/rpc_client.py aria2.addUri '["http://example.com/file.zip"]'

# Multiple URLs
python3 scripts/rpc_client.py aria2.addUri '["http://url1.com", "http://url2.com"]'
```

### Pattern 4: Multiple Parameters (Numbers)

```bash
python3 scripts/rpc_client.py aria2.tellWaiting 0 100
python3 scripts/rpc_client.py aria2.tellStopped 0 50
```

### Pattern 5: Helper Scripts

```bash
python3 scripts/examples/list-downloads.py
python3 scripts/examples/pause-all.py
python3 scripts/examples/add-torrent.py /path/to/file.torrent
```

## Step-by-Step Execution Examples

### Example 1: Download a File

**User Command:** "Please download http://example.com/file.zip"

**Thought Process:**

1. User wants to download → use `aria2.addUri`
2. Need to pass URL as array parameter
3. Call rpc_client.py with proper formatting using `python3`

**Execute:**

```bash
python3 scripts/rpc_client.py aria2.addUri '["http://example.com/file.zip"]'
```

**Parse Output:** Extract GID from script output (e.g., "2089b05ecca3d829")

**Response:**

```
✓ Download started successfully!
GID: 2089b05ecca3d829

You can check progress with: "show status for GID 2089b05ecca3d829"
```

### Example 2: Check Download Status

**User Command:** "What's the status of GID 2089b05ecca3d829?"

**Thought Process:**

1. User wants status → use `aria2.tellStatus`
2. GID is the parameter
3. Parse JSON output and format nicely

**Execute:**

```bash
python3 scripts/rpc_client.py aria2.tellStatus 2089b05ecca3d829
```

**Parse Output:** Script returns JSON with fields like:

- `status`: "active", "paused", "complete", etc.
- `completedLength`: bytes downloaded
- `totalLength`: total file size
- `downloadSpeed`: current speed

**Response:**

```
Download Status:
- Status: active
- Progress: 45.2 MB / 100 MB (45%)
- Speed: 2.3 MB/s
- ETA: ~2 minutes
```

### Example 3: List All Downloads

**User Command:** "Show me what's downloading"

**Thought Process:**

1. User wants overview → use helper script for nice formatting
2. `list-downloads.py` shows active, waiting, and stopped

**Execute:**

```bash
python3 scripts/examples/list-downloads.py
```

**Response:** Summarize the output, for example:

```
Current Downloads:

Active (2):
- ubuntu-20.04.iso: 45% complete, 2.3 MB/s
- archive.zip: 78% complete, 1.5 MB/s

Waiting (1):
- movie.mp4: queued

Stopped (3):
- file1.zip: completed
- file2.tar.gz: completed
- file3.pdf: error
```

## Common Mistakes to Avoid

### ❌ WRONG: Manually construct JSON-RPC

```bash
# DON'T do this!
curl -X POST http://localhost:6800/jsonrpc \
  -d '{"jsonrpc":"2.0","method":"aria2.addUri",...}'

# DON'T do this!
echo '{"jsonrpc": "2.0", "method": "aria2.addUri", ...}'
```

### ✅ CORRECT: Use Python scripts

```bash
# DO this!
python3 scripts/rpc_client.py aria2.addUri '["http://example.com/file.zip"]'
```

### ❌ WRONG: Try to import aria2

```python
# DON'T do this!
import aria2  # aria2 is not a Python library!
```

### ✅ CORRECT: Call scripts via subprocess

```python
# DO this if needed!
import subprocess
result = subprocess.run(
    ["python3", "scripts/rpc_client.py", "aria2.getGlobalStat"],
    capture_output=True, text=True
)
```

## Response Formatting Guidelines

### For addUri (download started)

```
✓ Download started successfully!
GID: {gid}
```

### For tellStatus (download progress)

```
Status: {status}
Progress: {completed}/{total} ({percentage}%)
Speed: {speed}
```

### For pause/unpause operations

```
✓ Download {paused/resumed}
GID: {gid}
```

### For batch operations (pauseAll, unpauseAll)

```
✓ All downloads {paused/resumed}
```

---

## Data Formatting for Agents

### Converting aria2 Data to Human-Readable Format

aria2 returns numbers as strings. Agents should convert these for better user experience.

#### Byte Conversion

```python
def format_bytes(bytes_str):
    """Convert byte string to human-readable format.

    Examples:
        "1024" -> "1.0 KB"
        "1048576" -> "1.0 MB"
        "22434" -> "21.9 KB"
    """
    bytes_val = int(bytes_str)
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if bytes_val < 1024.0:
            return f"{bytes_val:.1f} {unit}"
        bytes_val /= 1024.0
    return f"{bytes_val:.1f} PB"

# Usage with aria2 response
status = client.tell_status(gid)
total = format_bytes(status['totalLength'])
completed = format_bytes(status['completedLength'])
print(f"Progress: {completed} / {total}")
```

#### Percentage Calculation

```python
def calculate_progress(status):
    """Calculate download progress percentage.

    Returns:
        Float percentage (0-100) or 0 if total is unknown
    """
    completed = int(status.get('completedLength', 0))
    total = int(status.get('totalLength', 0))

    if total == 0:
        return 0.0

    return (completed / total) * 100

# Usage
status = client.tell_status(gid)
progress = calculate_progress(status)
print(f"Progress: {progress:.1f}%")
```

#### Speed Formatting

```python
def format_speed(speed_str):
    """Convert speed string (bytes/sec) to human-readable format.

    Examples:
        "0" -> "0 B/s"
        "102400" -> "100.0 KB/s"
        "2097152" -> "2.0 MB/s"
    """
    speed = int(speed_str)

    if speed == 0:
        return "0 B/s"

    for unit in ['B/s', 'KB/s', 'MB/s', 'GB/s']:
        if speed < 1024.0:
            return f"{speed:.1f} {unit}"
        speed /= 1024.0
    return f"{speed:.1f} TB/s"

# Usage
status = client.tell_status(gid)
dl_speed = format_speed(status['downloadSpeed'])
ul_speed = format_speed(status['uploadSpeed'])
print(f"Download: {dl_speed}, Upload: {ul_speed}")
```

#### ETA Calculation

```python
def calculate_eta(status):
    """Calculate estimated time to completion.

    Returns:
        String like "2m 34s" or "Unknown" if can't calculate
    """
    completed = int(status.get('completedLength', 0))
    total = int(status.get('totalLength', 0))
    speed = int(status.get('downloadSpeed', 0))

    if speed == 0 or total == 0 or completed >= total:
        return "Unknown"

    remaining_bytes = total - completed
    eta_seconds = remaining_bytes / speed

    if eta_seconds < 60:
        return f"{int(eta_seconds)}s"
    elif eta_seconds < 3600:
        minutes = int(eta_seconds / 60)
        seconds = int(eta_seconds % 60)
        return f"{minutes}m {seconds}s"
    else:
        hours = int(eta_seconds / 3600)
        minutes = int((eta_seconds % 3600) / 60)
        return f"{hours}h {minutes}m"

# Usage
status = client.tell_status(gid)
eta = calculate_eta(status)
print(f"ETA: {eta}")
```

#### Complete Status Formatting Example

```python
def format_download_status(status):
    """Format complete download status for user display."""

    gid = status['gid']
    state = status['status']

    # Basic info
    result = [
        f"GID: {gid}",
        f"Status: {state}"
    ]

    # Progress info (if applicable)
    if state in ['active', 'paused', 'waiting']:
        total = format_bytes(status['totalLength'])
        completed = format_bytes(status['completedLength'])
        progress = calculate_progress(status)
        result.append(f"Progress: {completed} / {total} ({progress:.1f}%)")

    # Speed info (if active)
    if state == 'active':
        dl_speed = format_speed(status['downloadSpeed'])
        result.append(f"Speed: {dl_speed}")

        eta = calculate_eta(status)
        if eta != "Unknown":
            result.append(f"ETA: {eta}")

    # Error info (if error)
    if state == 'error':
        error_code = status.get('errorCode', 'Unknown')
        error_msg = status.get('errorMessage', 'No message')
        result.append(f"Error: [{error_code}] {error_msg}")

    # Files info
    files = status.get('files', [])
    if files:
        result.append(f"Files: {len(files)}")
        for file in files[:3]:  # Show first 3 files
            path = file.get('path', 'Unknown')
            result.append(f"  - {path}")
        if len(files) > 3:
            result.append(f"  ... and {len(files) - 3} more")

    return "\n".join(result)

# Usage in agent response
status = client.tell_status(gid)
formatted = format_download_status(status)
print(formatted)
```

### Quick Reference: Common Field Conversions

| aria2 Field       | Type               | Conversion Needed         |
| ----------------- | ------------------ | ------------------------- |
| `totalLength`     | string (bytes)     | → Human-readable size     |
| `completedLength` | string (bytes)     | → Human-readable size     |
| `downloadSpeed`   | string (bytes/sec) | → Speed with unit         |
| `uploadSpeed`     | string (bytes/sec) | → Speed with unit         |
| `numActive`       | string (number)    | → Integer display         |
| `numWaiting`      | string (number)    | → Integer display         |
| `status`          | string             | → Capitalize or use icons |
| `errorCode`       | string             | → Error message lookup    |

---

## Troubleshooting

For detailed troubleshooting information, see **[troubleshooting.md](troubleshooting.md)**.

### Quick Troubleshooting

**Script not found:** Change to skill directory or use absolute path

**Connection refused:** Check if aria2 is running with `--enable-rpc`

**Parameter error:** Use single quotes around JSON: `'["url"]'`

**GID not found:** Check stopped downloads with `aria2.tellStopped 0 100`

## Configuration

Scripts automatically load configuration from:

1. Environment variables (highest priority)
2. `config.json` in skill directory
3. Defaults (localhost:6800)

You don't need to set configuration manually - scripts handle it automatically.

## See Also

- [aria2-methods.md](aria2-methods.md) - Detailed aria2 RPC method reference
- [Official aria2 documentation](https://aria2.github.io/) - aria2 daemon documentation
