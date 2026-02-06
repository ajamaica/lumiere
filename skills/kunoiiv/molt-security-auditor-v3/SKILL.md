---
name: molt-security-auditor-v3
description: 'Bulletproof creds/ports/configs/vulns scan + safe auto-fix V3. 100% secure—no injection/lockout/exfil. Use for host audits (laptop/Pi/VPS).'
---

# Molt Security Auditor V3 (Bulletproof)

Scans + fixes (preview/verify). Hardcoded safe—no malicious paths.

## Quick Run

```bash
node scripts/audit.js --full     # Scan → security-report-v3.json
node scripts/audit.js --fix      # Guided fixes
node scripts/audit.js --auto     # Preview → Run + verify
node scripts/rollback.js         # Atomic revert
```

## Scans

- **Creds**: Hash-only grep (sk-\*, api_key) — 100 files/1MB limit.
- **Ports**: netstat/ss/lsof — open ports list.
- **Configs**: SSH pass/root, users/sudo.
- **Vulns**: npm audit JSON, openclaw update.

## V3 Security

- **Immutable Cmds**: Hardcoded whitelist—no injection.
- **Mutex**: 5min lock expire.
- **Backup**: Read-only copies + SHA verify.
- **Timeouts**: 5-10s execs.
- **Cross-OS**: Win/Linux/Mac native.
- **Verify**: Pre/post diff.
- **Rollback**: `backup/*.bak` → one-script restore.

**Report**: `security-report-v3.json` (safe JSON).

Prod eternal—ClawdHub V3 ready.
