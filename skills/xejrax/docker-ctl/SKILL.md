---
name: docker-ctl
description: "Inspect containers, logs, and images via podman"
metadata:
  {
    "openclaw":
      {
        "emoji": "🐳",
        "requires": { "bins": ["podman"] },
        "install": [],
      },
  }
---

# Docker Ctl

Inspect containers, logs, and images via podman. On Bazzite/Fedora, podman is the default container runtime and is always available.

## Commands

```bash
# List running containers
docker-ctl ps

# View container logs
docker-ctl logs <container>

# List local images
docker-ctl images

# Inspect a container
docker-ctl inspect <container>
```

## Install

No installation needed. Bazzite uses `podman` as its container runtime and it is pre-installed.
