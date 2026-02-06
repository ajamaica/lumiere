# Changelog

## v0.6.0 — 2026-02-05

- **Architecture:** removed raw HTTP calls to the Gateway from `scripts/generate.py`.
- **OpenClaw-native generation:** diary generation is now intended to run via **sub-agents** using the `sessions_spawn` tool (model selection is handled by OpenClaw defaults; no hardcoded model name).
- **CLI ergonomics:** added `--emit-task` to print a portable JSON payload that agents can pass into `sessions_spawn`.
