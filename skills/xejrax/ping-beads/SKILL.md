---
name: ping-beads
description: "Verify the bead daemon is alive and responsive"
metadata:
  {
    "openclaw":
      {
        "emoji": "🫘",
        "requires": { "bins": ["bd"] },
        "install": [],
      },
  }
---

# Ping Beads

Verify the bead daemon is alive and responsive. Checks the `bd.sock` socket to confirm the bead daemon (`bd`) is running and accepting connections.

## Commands

```bash
# Check if the bead daemon is alive (checks bd.sock)
ping-beads

# Show detailed bead daemon status
ping-beads status
```

## Install

No installation needed. `bd` is expected to be in PATH as part of the beads system.
