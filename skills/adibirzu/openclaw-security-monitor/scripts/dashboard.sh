#!/bin/bash
# OpenClaw Security Monitor - CLI Dashboard
# Displays security overview: skills, scan results, permissions, gateway,
# process trees (witr), network, providers, and cron status.

OPENCLAW_DIR="${OPENCLAW_HOME:-$HOME/.openclaw}"
SKILLS_DIR="$OPENCLAW_DIR/workspace/skills"
export PATH="$HOME/.local/bin:/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:$PATH"

echo "============================================"
echo "  OPENCLAW SECURITY DASHBOARD"
echo "  $(date -u +"%Y-%m-%d %H:%M UTC")"
echo "============================================"
echo ""

# Skills overview
SKILL_COUNT=$(ls -d "$SKILLS_DIR"/*/ 2>/dev/null | wc -l | tr -d " ")
echo "Skills installed: $SKILL_COUNT"
echo "Skills directory: $SKILLS_DIR"
echo ""

# Last scan result
if [ -f "$OPENCLAW_DIR/logs/security-scan.log" ]; then
    LAST_SCAN=$(head -3 "$OPENCLAW_DIR/logs/security-scan.log" | grep "SCAN" | head -1)
    LAST_RESULT=$(grep "^STATUS:" "$OPENCLAW_DIR/logs/security-scan.log" | tail -1)
    LAST_SUMMARY=$(grep "^SCAN COMPLETE:" "$OPENCLAW_DIR/logs/security-scan.log" | tail -1)
    echo "Last scan: $LAST_SCAN"
    echo "Result:    $LAST_RESULT"
    echo "Summary:   $LAST_SUMMARY"
else
    echo "Last scan: NEVER (run /security-scan)"
fi
echo ""

# File permissions
echo "--- File Permissions ---"
for f in "$OPENCLAW_DIR/openclaw.json" "$OPENCLAW_DIR/agents/main/agent/auth-profiles.json"; do
    if [ -f "$f" ]; then
        PERMS=$(stat -f "%Lp" "$f" 2>/dev/null || stat -c "%a" "$f" 2>/dev/null)
        NAME=$(basename "$f")
        if [ "$PERMS" = "600" ]; then
            echo "  OK  $NAME ($PERMS)"
        else
            echo "  BAD $NAME ($PERMS - should be 600)"
        fi
    fi
done
echo ""

# Gateway config
echo "--- Gateway Security ---"
if command -v openclaw &>/dev/null; then
    BIND=$(openclaw config get gateway.bind 2>/dev/null || echo "unknown")
    AUTH=$(openclaw config get gateway.auth.mode 2>/dev/null || echo "unknown")
    ELEVATED=$(openclaw config get tools.elevated.enabled 2>/dev/null || echo "unknown")
    VERSION=$(openclaw --version 2>/dev/null || echo "unknown")
    echo "  Version: $VERSION"
    echo "  Bind: $BIND"
    echo "  Auth: $AUTH"
    echo "  Elevated tools: $ELEVATED"
else
    echo "  openclaw not found in PATH"
fi
echo ""

# Blocked commands
echo "--- Blocked Commands ---"
if command -v openclaw &>/dev/null; then
    openclaw config get tools.deny 2>/dev/null || echo "  none configured"
else
    echo "  openclaw not in PATH"
fi
echo ""

# Process Monitor (witr)
echo "--- Process Monitor (witr) ---"
if command -v witr &>/dev/null; then
    GW_PID=$(pgrep -f "openclaw.*gateway" 2>/dev/null | head -1)
    if [ -n "$GW_PID" ]; then
        echo ""
        echo "[Gateway - pid $GW_PID]"
        witr --pid "$GW_PID" --short --no-color 2>/dev/null || echo "  (unable to inspect)"
        GW_WARN=$(witr --pid "$GW_PID" --warnings --no-color 2>/dev/null)
        if [ -n "$GW_WARN" ]; then
            echo "$GW_WARN"
        fi
    else
        echo "  Gateway: NOT RUNNING"
    fi

    echo ""
    echo "[Node processes]"
    NODE_PIDS=$(pgrep -x node 2>/dev/null | head -10)
    if [ -n "$NODE_PIDS" ]; then
        while IFS= read -r PID; do
            CMD=$(ps -p "$PID" -o args= 2>/dev/null)
            if echo "$CMD" | grep -q "gateway" 2>/dev/null; then
                continue
            fi
            echo "  pid $PID: $(echo "$CMD" | head -c 80)"
        done <<< "$NODE_PIDS"
    else
        echo "  No non-gateway node processes"
    fi

    echo ""
    echo "[Listening Ports]"
    LISTEN_LINES=$(lsof -iTCP -sTCP:LISTEN -n -P 2>/dev/null | awk 'NR>1{printf "  %-20s pid %-8s %s\n", $1, $2, $9}' | sort -u)
    if [ -n "$LISTEN_LINES" ]; then
        echo "$LISTEN_LINES"
        echo ""
        echo "  Port ancestry (witr):"
        LISTEN_PIDS=$(lsof -iTCP -sTCP:LISTEN -n -P 2>/dev/null | awk 'NR>1{print $2}' | sort -u)
        while IFS= read -r PID; do
            PNAME=$(ps -p "$PID" -o comm= 2>/dev/null | xargs)
            CHAIN=$(witr --pid "$PID" --short --no-color 2>/dev/null | head -1)
            if [ -n "$CHAIN" ]; then
                echo "    $PNAME ($PID): $CHAIN"
            fi
        done <<< "$LISTEN_PIDS"
    else
        echo "  No listening ports detected"
    fi

    echo ""
    echo "[Suspicious Process Check]"
    SUSPICIOUS=0
    ROOT_NET=$(lsof -iTCP -n -P 2>/dev/null | awk 'NR>1 && $3=="root" && $1!="launchd" && $1!="mDNSRespon"{printf "  %s (pid %s) %s\n", $1, $2, $9}' | sort -u | head -5)
    if [ -n "$ROOT_NET" ]; then
        echo "  WARNING: Root processes with network access:"
        echo "$ROOT_NET"
        SUSPICIOUS=$((SUSPICIOUS + 1))
    fi
    MANY_CONN=$(lsof -iTCP -n -P 2>/dev/null | awk 'NR>1{print $1, $2}' | sort | uniq -c | sort -rn | head -3)
    if [ -n "$MANY_CONN" ]; then
        echo "  Top processes by connection count:"
        echo "$MANY_CONN" | while read -r line; do echo "    $line"; done
    fi
    if [ "$SUSPICIOUS" -eq 0 ]; then
        echo "  CLEAN: No suspicious processes detected"
    fi
else
    echo "  witr not installed. Run: brew install witr"
fi
echo ""

# Provider status
echo "--- Provider Auth Status ---"
if command -v openclaw &>/dev/null; then
    openclaw models status 2>/dev/null | grep -A1 "^- " | head -12
fi
echo ""

# Audit log
if [ -f "$OPENCLAW_DIR/logs/audit.log" ]; then
    LOG_SIZE=$(du -h "$OPENCLAW_DIR/logs/audit.log" | cut -f1)
    echo "Audit log: $LOG_SIZE"
else
    echo "Audit log: not created yet"
fi

# Cron status
CRON_EXISTS=$(crontab -l 2>/dev/null | grep -c "security-monitor" || true)
if [ "$CRON_EXISTS" -gt 0 ]; then
    echo "Daily scan cron: ACTIVE"
else
    echo "Daily scan cron: NOT SET"
fi
echo ""
echo "============================================"
