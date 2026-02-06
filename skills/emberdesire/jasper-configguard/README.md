# 🛡️ jasper-configguard

Safe config changes for [OpenClaw](https://openclaw.ai) with automatic rollback. Never brick your gateway again.

## The Problem

One bad config change can take down your OpenClaw gateway. Missing a comma, wrong model name, invalid plugin path — and suddenly your AI agent is unreachable. You're SSH-ing in at 3am to manually restore a backup you hope exists.

## The Solution

`jasper-configguard` wraps every config change in a safety net:

1. **Backup** current config
2. **Apply** your patch (deep merge)
3. **Restart** the gateway
4. **Health check** (waits up to 30s)
5. **Auto-rollback** if gateway fails to come up

## Install

```bash
npm install -g jasper-configguard
```

Or use directly:

```bash
npx jasper-configguard patch '{"gateway":{"bind":"tailnet"}}'
```

## Usage

### Apply a config change safely

```bash
jasper-configguard patch '{"gateway":{"controlUi":{"enabled":true}}}'
```

### Preview changes (dry run)

```bash
jasper-configguard patch --dry-run '{"agents":{"defaults":{"model":{"primary":"anthropic/claude-sonnet-4-5"}}}}'
```

### From a file

```bash
jasper-configguard patch --file my-changes.json
```

### Restore last backup

```bash
jasper-configguard restore
```

### List backups

```bash
jasper-configguard list
```

### Show config diff

```bash
jasper-configguard diff
```

### Validate config

```bash
jasper-configguard validate
```

### Health check

```bash
jasper-configguard doctor
```

## Programmatic Usage

```javascript
const { ConfigGuard } = require('jasper-configguard')

const guard = new ConfigGuard({
  configPath: '~/.openclaw/openclaw.json', // auto-detected
  timeout: 30, // health check timeout in seconds
})

// Safe patch with rollback
const result = await guard.patch({
  gateway: { bind: 'tailnet' },
})

if (result.success) {
  console.log('Applied! Backup:', result.backupId)
} else {
  console.log('Rolled back:', result.error)
}

// Dry run
const preview = guard.dryRun({ agents: { defaults: { model: { primary: 'opus' } } } })
console.log(preview.diff)

// List backups
const backups = guard.listBackups()

// Restore
await guard.restore(backups[0].id)
```

## How It Works

### Deep Merge

Patches are deep-merged, not replaced. This means:

```bash
# This ONLY changes bind, preserving port, auth, etc.
jasper-configguard patch '{"gateway":{"bind":"tailnet"}}'
```

### Arrays Replace

Arrays are **replaced entirely** (not merged). This matches OpenClaw's `config.patch` behavior:

```bash
# This replaces the ENTIRE agents.list — include all agents!
jasper-configguard patch '{"agents":{"list":[{"id":"main"},{"id":"worker"}]}}'
```

### Auto-Rollback

If the gateway doesn't respond within 30 seconds after restart:

1. Previous config is restored from backup
2. Gateway is restarted again
3. Script reports the failure

### Backups

- Stored in `~/.openclaw/config-backups/`
- Timestamped: `openclaw.json.<unix-timestamp>`
- Last 20 kept (auto-pruned)
- Manual restore: `jasper-configguard restore <timestamp>`

## Options

| Flag               | Description                           |
| ------------------ | ------------------------------------- |
| `--config <path>`  | Path to openclaw.json (auto-detected) |
| `--timeout <secs>` | Health check timeout (default: 30)    |
| `--dry-run`        | Preview changes without applying      |
| `--no-restart`     | Apply without restarting gateway      |
| `--verbose`        | Detailed output                       |

## Requirements

- Node.js 18+
- OpenClaw gateway running on localhost:18789
- Write access to `~/.openclaw/`

## License

MIT — [E.x.O. Entertainment Studios](https://exohaven.online)
