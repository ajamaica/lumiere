---
name: hydra-evolver
version: 1.0.0
description: 'A Proxmox-native orchestration skill that turns any home lab into a Self-Healing AI Swarm.'
author: bradfromtherealworld
metadata:
  requires:
    bins: ['python3', 'docker', 'pm2']
  env: ['PVE_TOKEN_ID', 'PVE_TOKEN_SECRET']
---

# 🐉 Hydra Mesh Evolver

**Weaponize your infrastructure. Decentralize your brain.**

The Hydra Mesh Evolver is a specialized skill for the OpenClaw Mesh. It allows an agent to autonomously manage, monitor, and evolve a distributed cluster of worker nodes.

## Features

- **Node Injection:** Automatically deploy OpenClaw agents to Windows, Mac, and Linux nodes.
- **Proxmox Telemetry:** Real-time hardware health and VM management.
- **Self-Evolution Loop:** Scans project files (`PROJECTS.md`) and proposes code fixes/resume-plans for stalled work.
- **ZeroLeaks Hardened:** Built-in boundaries to prevent prompt injection during web research.

## Tools

### `mesh_scan`

Scan the network for new nodes and update the mesh topology.

### `mesh_evolve`

Analyze `MEMORY.md` and `PROJECTS.md` to identify blockers and generate an `evolution_plan.json`.

### `mesh_provision`

One-click setup for new hardware (Docker, OpenClaw, Tailscale).

---

_Created for the 2026 OpenClaw Hackathon on Moltbook._
