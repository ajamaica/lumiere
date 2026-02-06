# Aria2 RPC Methods Reference

Pure technical reference for all aria2 RPC methods. For execution examples, see [execution-guide.md](execution-guide.md).

## Method Index

### Download Operations

- [aria2.addUri](#aria2adduri) - Add download from URLs
- [aria2.addTorrent](#aria2addtorrent) - Add download from torrent file
- [aria2.addMetalink](#aria2addmetalink) - Add download from metalink file
- [aria2.remove](#aria2remove) - Stop and remove download

### Control Operations

- [aria2.pause](#aria2pause) - Pause a download
- [aria2.pauseAll](#aria2pauseall) - Pause all downloads
- [aria2.unpause](#aria2unpause) - Resume a paused download
- [aria2.unpauseAll](#aria2unpauseall) - Resume all paused downloads

### Monitoring Operations

- [aria2.tellStatus](#aria2tellstatus) - Get download status
- [aria2.tellActive](#aria2tellactive) - List active downloads
- [aria2.tellWaiting](#aria2tellwaiting) - List waiting downloads
- [aria2.tellStopped](#aria2tellstopped) - List stopped downloads
- [aria2.getGlobalStat](#aria2getglobalstat) - Get global statistics

### Configuration Operations

- [aria2.getOption](#aria2getoption) - Get download options
- [aria2.changeOption](#aria2changeoption) - Change download options
- [aria2.getGlobalOption](#aria2getglobaloption) - Get global options
- [aria2.changeGlobalOption](#aria2changeglobaloption) - Change global options

### Maintenance Operations

- [aria2.purgeDownloadResult](#aria2purgedownloadresult) - Remove all stopped results
- [aria2.removeDownloadResult](#aria2removedownloadresult) - Remove specific result

### System Operations

- [aria2.getVersion](#aria2getversion) - Get aria2 version info
- [system.listMethods](#systemlistmethods) - List all available methods
- [system.multicall](#systemmulticall) - Execute multiple methods

---

## Download Operations

### aria2.addUri

Add a new download from HTTP/HTTPS/FTP/SFTP/Magnet URIs.

**Parameters:**

- `uris` (array of strings, required): URIs pointing to the same resource
  - **Important:** Multiple URIs are treated as backup/mirror sources for the SAME download
  - aria2 will try each URI in order if one fails (fallback mechanism)
  - To download multiple separate files, call `aria2.addUri` multiple times with one URL each
  - Example: `["http://mirror1.com/file.zip", "http://mirror2.com/file.zip"]` creates ONE download with 2 sources
- `options` (object, optional): Download options (see Options section)
- `position` (integer, optional): Position in download queue (0-based)

**Returns:** `string` - GID of the newly created download (16-character hex)

**Script call:**

```bash
python3 scripts/rpc_client.py aria2.addUri '["http://example.com/file.zip"]'
python3 scripts/rpc_client.py aria2.addUri '["http://mirror1.com/file.zip", "http://mirror2.com/file.zip"]'
```

### aria2.addTorrent

Add a BitTorrent download.

**Parameters:**

- `torrent` (string, required): Base64-encoded torrent file content
- `uris` (array of strings, optional): Web seed URIs
- `options` (object, optional): Download options
- `position` (integer, optional): Position in download queue

**Returns:** `string` - GID of the newly created download

**Script call:**

```bash
python3 scripts/examples/add-torrent.py /path/to/file.torrent
```

### aria2.addMetalink

Add downloads from a Metalink file.

**Parameters:**

- `metalink` (string, required): Base64-encoded metalink file content
- `options` (object, optional): Download options
- `position` (integer, optional): Position in download queue

**Returns:** `array of strings` - GIDs of newly created downloads

**Script call:**

```bash
python3 scripts/rpc_client.py aria2.addMetalink '<base64-encoded-metalink>'
```

### aria2.remove

Remove a download. If the download is active, it will be stopped first.

**Parameters:**

- `gid` (string, required): GID of the download to remove

**Returns:** `string` - GID of the removed download

**Script call:**

```bash
python3 scripts/rpc_client.py aria2.remove 2089b05ecca3d829
```

**When to use:**

- Download is in `active`, `waiting`, or `paused` state
- You want to stop AND remove the download
- Will fail if download is already `complete`, `error`, or `removed`

**See also:** Use [aria2.removeDownloadResult](#aria2removedownloadresult) for completed/error downloads.

---

## Control Operations

### aria2.pause

Pause an active download.

**Parameters:**

- `gid` (string, required): GID of the download to pause

**Returns:** `string` - GID of the paused download

**Script call:**

```bash
python3 scripts/rpc_client.py aria2.pause 2089b05ecca3d829
```

**Notes:**

- Download must be in `active` state
- Returns error if download is already paused or completed

### aria2.pauseAll

Pause all active downloads.

**Parameters:** None

**Returns:** `string` - "OK" on success

**Script call:**

```bash
python3 scripts/rpc_client.py aria2.pauseAll
```

### aria2.unpause

Resume a paused download.

**Parameters:**

- `gid` (string, required): GID of the download to resume

**Returns:** `string` - GID of the resumed download

**Script call:**

```bash
python3 scripts/rpc_client.py aria2.unpause 2089b05ecca3d829
```

### aria2.unpauseAll

Resume all paused downloads.

**Parameters:** None

**Returns:** `string` - "OK" on success

**Script call:**

```bash
python3 scripts/rpc_client.py aria2.unpauseAll
```

---

## Monitoring Operations

### aria2.tellStatus

Get detailed status of a download.

**Parameters:**

- `gid` (string, required): GID of the download
- `keys` (array of strings, optional): Specific keys to retrieve (returns all if omitted)

**Returns:** `object` - Download status with fields:

- `gid` - Download GID
- `status` - "active", "waiting", "paused", "error", "complete", "removed"
- `totalLength` - Total size in bytes (string)
- `completedLength` - Downloaded size in bytes (string)
- `downloadSpeed` - Download speed in bytes/sec (string)
- `uploadSpeed` - Upload speed in bytes/sec (string)
- `files` - Array of file information
- `errorCode` - Error code if status is "error"
- `errorMessage` - Error message if status is "error"

**Script call:**

```bash
python3 scripts/rpc_client.py aria2.tellStatus 2089b05ecca3d829
python3 scripts/rpc_client.py aria2.tellStatus 2089b05ecca3d829 '["status", "totalLength", "completedLength"]'
```

### aria2.tellActive

Get list of all active downloads.

**Parameters:**

- `keys` (array of strings, optional): Specific keys to retrieve for each download

**Returns:** `array of objects` - Array of download status objects (same structure as tellStatus)

**Script call:**

```bash
python3 scripts/rpc_client.py aria2.tellActive
python3 scripts/rpc_client.py aria2.tellActive '["gid", "status", "downloadSpeed"]'
```

### aria2.tellWaiting

Get list of downloads in the waiting queue.

**Parameters:**

- `offset` (integer, required): Starting position in queue (0-based)
- `num` (integer, required): Number of downloads to retrieve
- `keys` (array of strings, optional): Specific keys to retrieve

**Returns:** `array of objects` - Array of download status objects

**Script call:**

```bash
python3 scripts/rpc_client.py aria2.tellWaiting 0 100
python3 scripts/rpc_client.py aria2.tellWaiting 0 10 '["gid", "status"]'
```

### aria2.tellStopped

Get list of stopped downloads (completed, error, or removed).

**Parameters:**

- `offset` (integer, required): Starting position (0-based)
- `num` (integer, required): Number of downloads to retrieve
- `keys` (array of strings, optional): Specific keys to retrieve

**Returns:** `array of objects` - Array of download status objects

**Script call:**

```bash
python3 scripts/rpc_client.py aria2.tellStopped 0 100
python3 scripts/rpc_client.py aria2.tellStopped -1 10  # Get last 10
```

---

### Pagination Best Practices

Both `aria2.tellWaiting` and `aria2.tellStopped` use pagination parameters:

**Common Use Cases:**

| Scenario                    | offset                 | num    | Example                                                 |
| --------------------------- | ---------------------- | ------ | ------------------------------------------------------- |
| Get first page              | `0`                    | `100`  | `python3 scripts/rpc_client.py aria2.tellStopped 0 100` |
| Get all items (small queue) | `0`                    | `1000` | Get up to 1000 items at once                            |
| Get recent items only       | `-1`                   | `10`   | Last 10 stopped downloads                               |
| Paginate large results      | `0`, `100`, `200`, ... | `100`  | Loop with increasing offset                             |
| Quick status check          | `0`                    | `10`   | First 10 items for fast response                        |

**Performance Tips:**

- **Small `num` (10-20)**: Faster response, good for quick checks or UI updates
- **Large `num` (100-1000)**: Fewer requests, good for batch processing
- **Negative offset**: `-1` means start from the end (most recent)

**Example: Get All Stopped Downloads**

```bash
# Start with offset 0
python3 scripts/rpc_client.py aria2.tellStopped 0 100
# If 100 items returned, get next batch
python3 scripts/rpc_client.py aria2.tellStopped 100 100
# Continue until empty array returned
```

---

## Configuration Operations

### aria2.getOption

Get options for a specific download.

**Parameters:**

- `gid` (string, required): GID of the download

**Returns:** `object` - Download options as key-value pairs

**Script call:**

```bash
python3 scripts/rpc_client.py aria2.getOption 2089b05ecca3d829
```

### aria2.changeOption

Change options for an active download.

**Parameters:**

- `gid` (string, required): GID of the download
- `options` (object, required): Options to change

**Returns:** `string` - "OK" on success

**Script call:**

```bash
python3 scripts/rpc_client.py aria2.changeOption 2089b05ecca3d829 '{"max-download-limit":"1048576"}'
```

**Common options:**

- `max-download-limit` - Max download speed in bytes/sec
- `max-upload-limit` - Max upload speed in bytes/sec (for BitTorrent)

**Note:** Not all options can be changed after download starts. See aria2 documentation for changeable options.

### aria2.getGlobalOption

Get global aria2 options.

**Parameters:** None

**Returns:** `object` - Global options as key-value pairs

**Script call:**

```bash
python3 scripts/rpc_client.py aria2.getGlobalOption
```

### aria2.changeGlobalOption

Change global aria2 options.

**Parameters:**

- `options` (object, required): Options to change

**Returns:** `string` - "OK" on success

**Script call:**

```bash
python3 scripts/rpc_client.py aria2.changeGlobalOption '{"max-concurrent-downloads":"5"}'
```

**Common options:**

- `max-concurrent-downloads` - Maximum number of parallel downloads
- `max-overall-download-limit` - Overall download speed limit
- `max-overall-upload-limit` - Overall upload speed limit

---

## Maintenance Operations

### aria2.purgeDownloadResult

Remove completed/error/removed downloads from memory to free up resources.

**Parameters:** None

**Returns:** `string` - "OK" on success

**Script call:**

```bash
python3 scripts/rpc_client.py aria2.purgeDownloadResult
```

**Note:** This only removes download results from memory, not the downloaded files.

### aria2.removeDownloadResult

Remove a specific download result from memory.

**Parameters:**

- `gid` (string, required): GID of the download result to remove

**Returns:** `string` - "OK" on success

**Script call:**

```bash
python3 scripts/rpc_client.py aria2.removeDownloadResult 2089b05ecca3d829
```

**When to use:**

- Download is in `complete`, `error`, or `removed` state
- You want to clear the download record from memory
- Does not affect the downloaded files on disk

**See also:** Use [aria2.remove](#aria2remove) for active/waiting/paused downloads.

---

## Download Removal Guide

### Choosing the Right Removal Method

| Download Status | Use Method                   | What it Does                               |
| --------------- | ---------------------------- | ------------------------------------------ |
| `active`        | `aria2.remove`               | Stops download, then removes from list     |
| `waiting`       | `aria2.remove`               | Cancels queued download, removes from list |
| `paused`        | `aria2.remove`               | Removes paused download from list          |
| `complete`      | `aria2.removeDownloadResult` | Clears completed record from memory        |
| `error`         | `aria2.removeDownloadResult` | Clears failed record from memory           |
| `removed`       | `aria2.removeDownloadResult` | Clears already-removed record from memory  |

**Tip:** If you're unsure, try `aria2.remove` first. If it returns an error like "GID is not active", use `aria2.removeDownloadResult` instead.

**Note:** Neither method deletes downloaded files from disk. They only affect aria2's internal download list.

---

## System Operations

### aria2.getVersion

Get aria2 version and enabled feature information.

**Parameters:** None

**Returns:** `object` with fields:

- `version` - aria2 version string
- `enabledFeatures` - Array of enabled features (e.g., "BitTorrent", "Metalink", "Async DNS")

**Script call:**

```bash
python3 scripts/rpc_client.py aria2.getVersion
```

### system.listMethods

List all available RPC methods.

**Parameters:** None

**Returns:** `array of strings` - Method names

**Script call:**

```bash
python3 scripts/rpc_client.py system.listMethods
```

**Note:** This method does not require authentication.

### system.multicall

Execute multiple RPC methods in a single request (batch operation).

**Parameters:**

- `calls` (array of objects, required): Each object has:
  - `methodName` (string): Method to call
  - `params` (array): Parameters for the method

**Returns:** `array` - Results for each method call in order

**Example (Python):**

```python3
from scripts.rpc_client import Aria2RpcClient
from scripts.config_loader import Aria2Config

config = Aria2Config().load()
client = Aria2RpcClient(config)

calls = [
    {"methodName": "aria2.tellStatus", "params": ["2089b05ecca3d829"]},
    {"methodName": "aria2.getGlobalStat", "params": []},
]

results = client.multicall(calls)
```

---

## Common Option Keys

### Download Options

Options that can be set when adding or changing downloads:

- `dir` - Download directory
- `out` - Output filename
- `max-download-limit` - Speed limit in bytes/sec (0 = unlimited)
- `max-upload-limit` - Upload speed limit for torrents
- `split` - Number of connections per server (1-16)
- `max-connection-per-server` - Max connections per server (1-16)
- `min-split-size` - Minimum size for split downloading (1M-1024M)
- `lowest-speed-limit` - Minimum speed threshold (bytes/sec)
- `referer` - HTTP Referer header
- `user-agent` - HTTP User-Agent header
- `header` - Additional HTTP headers (array of "Header: Value")

### Global Options

Options affecting all downloads:

- `max-concurrent-downloads` - Max parallel downloads (1-unlimited)
- `max-overall-download-limit` - Total download speed limit
- `max-overall-upload-limit` - Total upload speed limit
- `download-result` - How long to keep completed download info ("default", "full", "hide")

---

## Status Values

### Download Status

- `active` - Currently downloading
- `waiting` - In queue, waiting to start
- `paused` - Paused by user
- `error` - Download failed (see errorCode/errorMessage)
- `complete` - Download finished successfully
- `removed` - Removed by user

### Error Codes

- `0` - All downloads successful
- `1` - Unknown error
- `2` - Timeout
- `3` - Resource not found
- `4` - Too many redirects
- `5` - Not enough disk space
- `7` - Duplicated file or duplicate GID
- `8` - Resume failed (cannot resume)
- `9` - No such file or directory
- `19` - File I/O error
- `24` - HTTP/FTP protocol error

For complete error code reference, see aria2 official documentation.

---

## GID Format

GID (Global Identifier) is a 16-character hexadecimal string that uniquely identifies a download.

**Format:** `[0-9a-f]{16}`

**Example:** `2089b05ecca3d829`

**Usage:** GID is returned when adding downloads and used to reference downloads in all other operations.

---

## See Also

- [execution-guide.md](execution-guide.md) - Detailed execution guide for AI agents
- [troubleshooting.md](troubleshooting.md) - Common issues and solutions
- [Official aria2 documentation](https://aria2.github.io/manual/en/html/aria2c.html) - Complete aria2 reference
