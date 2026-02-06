# Agent Implementation Guide

When asked to set up auto-updates, follow this procedure.

## Step 1: Detect Installation Type

```bash
# Check if installed via npm globally
npm list -g openclaw 2>/dev/null && echo "npm-global"

# Check if installed via source (git)
[ -d ~/.openclaw/.git ] || [ -f /opt/openclaw/.git/config ] && echo "source-install"

# Check pnpm
pnpm list -g openclaw 2>/dev/null && echo "pnpm-global"

# Check bun
bun pm ls -g 2>/dev/null | grep openclaw && echo "bun-global"
```

## Step 2: Create the Update Script (Optional)

For complex setups, create a helper script at `~/.openclaw/scripts/auto-update.sh`:

```bash
#!/bin/bash
set -e
LOG_FILE="${HOME}/.openclaw/logs/auto-update.log"
mkdir -p "$(dirname "$LOG_FILE")"
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"; }

log "Starting auto-update..."

# Capture starting versions
OPENCLAW_VERSION_BEFORE=$(openclaw --version 2>/dev/null || echo "unknown")

# Update OpenClaw
log "Updating OpenClaw..."
if command -v npm &> /dev/null && npm list -g openclaw &> /dev/null; then
  npm update -g openclaw@latest 2>&1 | tee -a "$LOG_FILE"
elif command -v pnpm &> /dev/null && pnpm list -g openclaw &> /dev/null; then
  pnpm update -g openclaw@latest 2>&1 | tee -a "$LOG_FILE"
elif command -v bun &> /dev/null; then
  bun update -g openclaw@latest 2>&1 | tee -a "$LOG_FILE"
else
  log "Running openclaw update (source install)"
  openclaw update 2>&1 | tee -a "$LOG_FILE" || true
fi

# Run doctor for migrations
log "Running doctor..."
openclaw doctor --yes 2>&1 | tee -a "$LOG_FILE" || true

# Capture new version
OPENCLAW_VERSION_AFTER=$(openclaw --version 2>/dev/null || echo "unknown")

# Update skills
log "Updating skills via ClawHub..."
SKILL_OUTPUT=$(clawdhub update --all 2>&1) || true

echo "$SKILL_OUTPUT" >> "$LOG_FILE"
log "Auto-update complete."

# Output summary for agent to parse

echo "---UPDATE_SUMMARY_START---"
echo "openclaw_before: $OPENCLAW_VERSION_BEFORE"
echo "openclaw_after: $OPENCLAW_VERSION_AFTER"
echo "skill_output: $SKILL_OUTPUT"
echo "---UPDATE_SUMMARY_END---"
```

## Step 3: Add Cron Job

Recommended: built-in cron with an isolated session:

```bash
openclaw cron add \
  --name "Daily Auto-Update" \
  --cron "0 4 * * *" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --wake now \
  --deliver \
  --message "Run the daily auto-update routine: 1. Check and update OpenClaw (npm/pnpm/bun/global or source). 2. Run openclaw doctor --yes. 3. Update all skills: clawdhub update --all. 4. Report version before/after, updated skills, and any errors."
```

## Step 4: Verify Setup

```bash
openclaw cron list
openclaw --version
clawdhub list
```

## Customization Prompts

**Different time:**

```bash
--cron "0 6 * * *"
```

**Different timezone:**

```bash
--tz "Europe/London"
```

**Weekly instead of daily:**

```bash
--cron "0 4 * * 0"
```

## Error Handling

If updates fail:

1. Log the error clearly
2. Still report partial success
3. Suggest manual intervention if needed

Common errors to handle:

- `EACCES`: permission denied → fix permissions
- Network timeouts → retry once, then report
- Git conflicts (source installs) → suggest `openclaw update --yes` or manual cleanup
