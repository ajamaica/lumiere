---
name: opensysinfo-skill
version: 0.1.0
author: Privateer <85460639+pr1vateer@users.noreply.github.com>
description: Small skill that reports basic system information (OS, uptime, CPU, memory, disk). Implemented in Bash.
entrypoint: scripts/sysinfo.sh
# metadata must be a single-line JSON object per OpenClaw parser requirements.
metadata:
  {
    'openclaw':
      { 'emoji': '🧰', 'short': 'Basic system info (bash)', 'requires': { 'bins': ['bash'] } },
  }
user-invocable: true
command-dispatch: tool
command-tool: sysinfo
commands:
  - name: sysinfo
    usage: sysinfo [--format text|json] [--disk PATH]
    description: |
      Emit basic system information.
      Options:
        --format json   -> produce machine-readable JSON
        --format text   -> (default) human readable text
        --disk PATH     -> report disk usage for PATH (default '/')
---

# sysinfo-skill

A tiny OpenClaw skill that reports host system information. The implementation is pure Bash and requires `bash` to run.

Entrypoint: `{baseDir}/scripts/sysinfo.sh`
