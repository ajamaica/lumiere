---
name: ping-monitor
description: "ICMP health check for hosts, phones, and daemons"
metadata:
  {
    "openclaw":
      {
        "emoji": "🏓",
        "requires": { "bins": ["ping"] },
        "install": [],
      },
  }
---

# Ping Monitor

ICMP health check for hosts, phones, and daemons. Uses the standard `ping` utility to verify network reachability of any target host.

## Commands

```bash
# Ping a host with default settings
ping-monitor <host>

# Ping a host with a specific count
ping-monitor check <host> --count 3
```

## Install

No installation needed. `ping` is always present on the system.
