---
name: jasper-configguard
version: 1.0.0
description: Safe config changes for OpenClaw with automatic rollback. Backs up before patching, health-checks after restart, auto-rolls back on failure. Commands: patch, restore, list, diff, validate, doctor.
---

# Jasper ConfigGuard v1.0.0

Safe config changes for OpenClaw with automatic rollback. Never brick your gateway again.

## Setup

```bash
npm install -g jasper-configguard
```

## Usage

### Apply a config change safely

```bash
jasper-configguard patch '{"gateway":{"bind":"tailnet"}}'
```

The tool will:

1. Back up your current config
2. Apply the patch (deep merge)
3. Restart the gateway
4. Wait for health check
5. **Auto-rollback** if gateway fails

### Preview changes

```bash
jasper-configguard patch --dry-run '{"agents":{"defaults":{"model":{"primary":"opus"}}}}'
```

### Restore from backup

```bash
jasper-configguard restore
```

### List backups

```bash
jasper-configguard list
```

### Check health

```bash
jasper-configguard doctor
```

## Agent Integration

Use from your agent to safely modify OpenClaw config:

```bash
# Safe model switch
jasper-configguard patch '{"agents":{"defaults":{"model":{"primary":"anthropic/claude-opus-4-5"}}}}'

# Enable a plugin safely
jasper-configguard patch '{"plugins":{"entries":{"my-plugin":{"enabled":true}}}}'

# If something breaks, restore
jasper-configguard restore
```

## API

```javascript
const { ConfigGuard } = require('jasper-configguard')
const guard = new ConfigGuard()

// Safe patch
const result = await guard.patch({ gateway: { bind: 'tailnet' } })
if (!result.success) console.log('Rolled back:', result.error)

// Dry run
const preview = guard.dryRun({ agents: { defaults: { model: { primary: 'opus' } } } })
console.log(preview.diff)
```
