---
name: system-info
description: "Quick system diagnostics: CPU, memory, disk, uptime"
metadata:
  {
    "openclaw":
      {
        "emoji": "💻",
        "requires": { "bins": ["free"] },
        "install": [],
      },
  }
---

# System Info

Quick system diagnostics covering CPU, memory, disk, and uptime. Uses standard Linux utilities that are always available.

## Commands

```bash
# Show all system info (CPU, memory, disk, uptime)
system-info

# Show CPU information
system-info cpu

# Show memory usage
system-info mem

# Show disk usage
system-info disk

# Show system uptime
system-info uptime
```

## Install

No installation needed. `free` and related utilities are always present on the system.
