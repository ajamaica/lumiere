# Troubleshooting Guide

Common issues and solutions when using the aria2-json-rpc skill.

**⚠️ NOTE: All commands use `python3`, not `python`** (especially important on macOS where `python` symlink doesn't exist)

## Script Execution Errors

### Python Command Not Found

**Error:** `command not found: python`

**Cause:** On macOS and some Linux systems, only `python3` is available

**Solution:**

```bash
# Always use python3
python3 scripts/rpc_client.py aria2.getVersion

# NOT python (this will fail on macOS)
```

### File Not Found

**Error:** `File not found: scripts/rpc_client.py`

**Causes:**

- Not in the correct directory
- Script path is incorrect
- Skill not properly installed

**Solutions:**

1. Change to the skill directory first:

   ```bash
   cd /path/to/skills/aria2-json-rpc
   python3 scripts/rpc_client.py aria2.getVersion
   ```

2. Or use absolute path:

   ```bash
   python3 /full/path/to/skills/aria2-json-rpc/scripts/rpc_client.py aria2.getVersion
   ```

3. Verify the script exists:
   ```bash
   ls -l skills/aria2-json-rpc/scripts/rpc_client.py
   ```

### Permission Denied

**Error:** `Permission denied: scripts/rpc_client.py`

**Solution:**

```bash
chmod +x scripts/rpc_client.py
# Or run with python3 explicitly
python3 scripts/rpc_client.py aria2.getVersion
```

## Connection Errors

### Cannot Connect to aria2 RPC Server

**Error:** `Cannot connect to aria2 RPC server` or `Connection refused`

**Causes:**

- aria2 daemon is not running
- Wrong host/port configuration
- Firewall blocking connection
- aria2 not started with RPC enabled

**Solutions:**

1. **Check if aria2 is running:**

   ```bash
   ps aux | grep aria2c
   # Or on macOS
   pgrep -fl aria2c
   ```

2. **Start aria2 with RPC enabled:**

   ```bash
   aria2c --enable-rpc --rpc-listen-port=6800
   ```

3. **Test connection:**

   ```bash
   python3 scripts/rpc_client.py aria2.getVersion
   ```

4. **Verify configuration:**

   ```bash
   # Check what host/port the scripts are using
   python3 scripts/config_loader.py
   ```

5. **Try with curl:**
   ```bash
   curl -X POST http://localhost:6800/jsonrpc \
     -d '{"jsonrpc":"2.0","id":"test","method":"aria2.getVersion","params":[]}'
   ```

### Connection Timeout

**Error:** `Connection timeout` or script hangs

**Causes:**

- aria2 server is slow or overloaded
- Network issues
- Firewall dropping packets

**Solutions:**

- Increase timeout in config.json:
  ```json
  {
    "timeout": 60000
  }
  ```
- Check network connectivity
- Try a local connection first (localhost)

## Authentication Errors

### Authentication Failed

**Error:** `Authentication failed` or `Unauthorized`

**Causes:**

- Wrong or missing secret token
- Token mismatch between skill and aria2

**Solutions:**

1. **Check aria2's secret:**

   ```bash
   # If you started aria2 with:
   aria2c --enable-rpc --rpc-secret=your-secret-here
   ```

2. **Set the matching secret in environment:**

   ```bash
   export ARIA2_RPC_SECRET=your-secret-here
   ```

3. **Or in config.json:**

   ```json
   {
     "secret": "your-secret-here"
   }
   ```

4. **Verify configuration loaded correctly:**

   ```bash
   python3 scripts/config_loader.py
   # Should show: secret: ****** (hidden)
   ```

5. **Note:** `system.listMethods` doesn't require authentication - use it to test:
   ```bash
   python3 scripts/rpc_client.py system.listMethods
   ```

## Parameter Errors

### Invalid JSON Parameter

**Error:** `Invalid JSON parameter` or `Parse error`

**Causes:**

- Incorrect JSON formatting
- Missing quotes around JSON in bash
- Wrong parameter structure

**Solutions:**

1. **Use single quotes around JSON arrays:**

   ```bash
   # Correct
   python3 scripts/rpc_client.py aria2.addUri '["http://example.com/file.zip"]'

   # Wrong - bash will interpret the quotes
   python3 scripts/rpc_client.py aria2.addUri ["http://example.com/file.zip"]
   ```

2. **Don't forget the array brackets:**

   ```bash
   # Correct
   '["http://example.com/file.zip"]'

   # Wrong - not an array
   '"http://example.com/file.zip"'
   ```

3. **Escape quotes in complex JSON:**
   ```bash
   python3 scripts/rpc_client.py aria2.changeOption 2089b05ecca3d829 '{"max-download-limit":"1M"}'
   ```

### Wrong Number of Parameters

**Error:** `Missing required parameter` or `Too many parameters`

**Solution:** Check the method signature in [aria2-methods.md](aria2-methods.md)

**Examples:**

```bash
# tellWaiting needs offset and num
python3 scripts/rpc_client.py aria2.tellWaiting 0 100

# tellStatus needs only GID
python3 scripts/rpc_client.py aria2.tellStatus 2089b05ecca3d829

# getGlobalStat needs no parameters
python3 scripts/rpc_client.py aria2.getGlobalStat
```

## Download Errors

### GID Not Found

**Error:** `GID not found` or code `1`

**Causes:**

- Download already completed and removed from memory
- Invalid GID format
- Download was purged
- Typo in GID

**Solutions:**

1. **Check GID format (16 hex characters):**

   ```bash
   # Valid: 2089b05ecca3d829
   # Invalid: 2089b05 (too short)
   # Invalid: 2089b05ecca3d82g (contains 'g' - not hex)
   ```

2. **Search in stopped downloads:**

   ```bash
   python3 scripts/rpc_client.py aria2.tellStopped 0 100
   ```

3. **List all current downloads:**

   ```bash
   python3 scripts/examples/list-downloads.py
   ```

4. **Note:** aria2 automatically purges old results based on its configuration

### Download Not Active

**Error:** `Download not active` when trying to pause

**Causes:**

- Download is already paused
- Download is completed
- Download is in error state

**Solutions:**

1. **Check current status:**

   ```bash
   python3 scripts/rpc_client.py aria2.tellStatus 2089b05ecca3d829
   ```

2. **Status field shows the state:**
   - `active` - can be paused
   - `paused` - can be resumed
   - `complete` - finished, cannot pause
   - `error` - failed, cannot pause
   - `removed` - deleted, cannot pause

3. **Use appropriate command:**
   - If paused: use `unpause` instead
   - If complete: no action needed
   - If error: check error message in status

### Invalid URI

**Error:** `Invalid URI` or `Unsupported scheme`

**Causes:**

- Malformed URL
- Unsupported protocol
- Server unreachable

**Solutions:**

1. **Check URL format:**

   ```bash
   # Valid URLs
   http://example.com/file.zip
   https://example.com/file.zip
   ftp://ftp.example.com/file.tar.gz
   magnet:?xt=urn:btih:...

   # Invalid
   example.com/file.zip  # Missing protocol
   htp://example.com     # Typo in protocol
   ```

2. **Verify aria2 supports the protocol:**

   ```bash
   python3 scripts/rpc_client.py aria2.getVersion
   # Check "enabledFeatures" array
   ```

3. **Test URL accessibility:**
   ```bash
   curl -I http://example.com/file.zip
   ```

## Performance Issues

### Slow Downloads

**Symptoms:**

- Download speed slower than expected
- Frequent pauses/resumes
- High CPU usage

**Solutions:**

1. **Increase connections per server:**

   ```bash
   python3 scripts/rpc_client.py aria2.changeOption 2089b05ecca3d829 \
     '{"max-connection-per-server":"16"}'
   ```

2. **Enable split downloading:**

   ```bash
   python3 scripts/rpc_client.py aria2.changeOption 2089b05ecca3d829 \
     '{"split":"10"}'
   ```

3. **Adjust concurrent downloads:**

   ```bash
   python3 scripts/rpc_client.py aria2.changeGlobalOption \
     '{"max-concurrent-downloads":"3"}'
   ```

4. **Check disk I/O:**
   - Slow disk can bottleneck downloads
   - Change download directory to faster disk

### Script Runs Slowly

**Symptoms:**

- Scripts take long time to execute
- No error but delayed response

**Causes:**

- High network latency
- aria2 server is busy
- Default timeout too high

**Solutions:**

1. **Check aria2 server load:**

   ```bash
   python3 scripts/rpc_client.py aria2.getGlobalStat
   # Check numActive - too many concurrent downloads?
   ```

2. **Reduce timeout if on localhost:**

   ```json
   {
     "timeout": 5000
   }
   ```

3. **Use helper scripts instead of multiple calls:**
   ```bash
   # Instead of multiple tellStatus calls
   python3 scripts/examples/list-downloads.py
   ```

## Configuration Issues

### Configuration Not Loading

**Error:** Config file exists but settings not applied

**Solutions:**

1. **Check JSON syntax:**

   ```bash
   python3 -m json.tool config.json
   ```

2. **Verify file location:**

   ```bash
   ls -l skills/aria2-json-rpc/config.json
   ```

3. **Check environment variables override:**

   ```bash
   env | grep ARIA2_RPC
   # Environment variables take priority over config.json
   ```

4. **Test configuration loading:**
   ```bash
   python3 scripts/config_loader.py
   ```

### Secret Token Not Working

**Error:** Authentication fails despite correct token

**Solutions:**

1. **Check for whitespace in token:**

   ```bash
   # Bad
   export ARIA2_RPC_SECRET=" your-token "  # Has spaces

   # Good
   export ARIA2_RPC_SECRET="your-token"
   ```

2. **Verify token in config.json has no special characters issue:**

   ```json
   {
     "secret": "plain-token-here"
   }
   ```

3. **Restart aria2 after changing its secret:**
   ```bash
   killall aria2c
   aria2c --enable-rpc --rpc-secret=new-token
   ```

## Helper Script Issues

### Script Output Not as Expected

**Issue:** Helper scripts produce unexpected output

**Solutions:**

1. **Check script dependencies:**

   ```bash
   python3 --version  # Should be 3.6+
   ```

2. **Run with verbose mode if available:**

   ```bash
   python3 scripts/examples/list-downloads.py --verbose
   ```

3. **Check for errors in stderr:**
   ```bash
   python3 scripts/examples/list-downloads.py 2>&1 | grep -i error
   ```

### Import Errors

**Error:** `ModuleNotFoundError` or `ImportError`

**Solutions:**

1. **Verify Python path:**

   ```bash
   # Scripts should be run from skill directory or with proper paths
   cd skills/aria2-json-rpc
   python3 scripts/examples/list-downloads.py
   ```

2. **Check script imports:**
   ```python
   # Scripts use relative imports
   sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
   ```

## Getting Debug Information

### Enable Verbose Logging

Add debug output to help diagnose issues:

```python
# In rpc_client.py, temporarily add:
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Capture Full Error Details

```bash
# Get full traceback
python3 scripts/rpc_client.py aria2.getGlobalStat 2>&1 | tee error.log
```

### Test aria2 Directly

```bash
# Bypass skill scripts to test aria2 itself
curl -X POST http://localhost:6800/jsonrpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "test",
    "method": "aria2.getVersion",
    "params": []
  }' | python3 -m json.tool
```

## Common Workflow Issues

### Downloads Don't Start

**Possible causes:**

1. aria2's max-concurrent-downloads reached
2. Download directory doesn't exist or no write permission
3. Not enough disk space

**Check:**

```bash
# Global stats
python3 scripts/rpc_client.py aria2.getGlobalStat

# Download options
python3 scripts/rpc_client.py aria2.getOption <GID>
```

### Cannot Resume Paused Download

**Possible causes:**

1. Download file was deleted
2. Original server no longer available
3. Session expired

**Solutions:**

- Check file still exists in download directory
- Try restarting the download with same URL
- Check aria2 error message in tellStatus

## Need More Help?

1. **Check aria2 official documentation:** https://aria2.github.io/
2. **Review method reference:** [aria2-methods.md](aria2-methods.md)
3. **Check execution guide:** [execution-guide.md](execution-guide.md)
4. **Enable aria2 logging:** Start aria2 with `--log=/path/to/aria2.log --log-level=debug`
