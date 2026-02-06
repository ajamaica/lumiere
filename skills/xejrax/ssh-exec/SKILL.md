---
name: ssh-exec
description: "Run a single command on a remote Tailscale node via SSH without opening an interactive session."
metadata:
  {
    "openclaw":
      {
        "emoji": "🖥️",
        "requires": { "bins": ["ssh"] },
        "install": [],
      },
  }
---

# SSH Exec Skill

Run a single command on a remote Tailscale node via SSH without opening an interactive session. Requires SSH access to the target (key in `~/.ssh/` or `SSH_AUTH_SOCK`) and `SSH_TARGET` env var (e.g., `100.107.204.64:8022`).

## Execute a Remote Command

Run a command on the target and return stdout/stderr:

```bash
ssh -p 8022 user@100.107.204.64 "uname -a"
```

## Execute with Custom Port

Use the `SSH_TARGET` env var:

```bash
ssh -p "${SSH_PORT:-22}" "$SSH_HOST" "df -h"
```

## Run a Script Remotely

Pipe a local script to the remote host:

```bash
ssh -p 8022 user@100.107.204.64 'bash -s' < local-script.sh
```
