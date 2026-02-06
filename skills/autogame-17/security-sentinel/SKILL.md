---
name: security-sentinel
description: Scan the workspace for security vulnerabilities, exposed secrets, and misconfigurations.
tags: [security, scan, audit]
---

# Security Sentinel

A security scanning tool for the OpenClaw workspace.

## Usage

```bash
node skills/security-sentinel/scan.js
```

## Features

- Scans for exposed API keys in text files.
- Checks file permissions (basic).
- Reports findings to stdout.
