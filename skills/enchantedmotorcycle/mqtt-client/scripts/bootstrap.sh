#!/usr/bin/env bash
source ~/.openclaw/workspace/skills/mqtt-client/venv/bin/activate
exec python3 scripts/run.py "$@"