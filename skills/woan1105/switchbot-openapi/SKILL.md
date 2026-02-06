---
name: switchbot-openapi
description: Control and query SwitchBot devices using the official OpenAPI (v1.1). Use when the user asks to list SwitchBot devices, get device status, or send commands (turn on/off, press, set mode, lock/unlock, set temperature, curtain open %, etc.). Requires SWITCHBOT_TOKEN and SWITCHBOT_SECRET.
---

# SwitchBot OpenAPI Skill

This skill equips the agent to operate SwitchBot devices via HTTPS requests to the official OpenAPI. It includes ready-to-run scripts and curl templates; use these instead of re-deriving the HMAC signature each time.

## Quick Start (Operator)

1) Set environment variables in the OpenClaw Gateway/container:
- SWITCHBOT_TOKEN: your OpenAPI token
- SWITCHBOT_SECRET: your OpenAPI secret
- SWITCHBOT_REGION (optional): default `global` (api.switch-bot.com). Options: `global`, `na`, `eu`, `jp`.

2) Test a call (list devices):
- Bash: `scripts/list_devices.sh`
- Node: `node scripts/switchbot_cli.js list`

3) Common tasks:
- Get a device status: `node scripts/switchbot_cli.js status <deviceId>`
- Turn on: `node scripts/switchbot_cli.js cmd <deviceId> turnOn`
- Turn off: `node scripts/switchbot_cli.js cmd <deviceId> turnOff`
- Press (bot): `node scripts/switchbot_cli.js cmd <deviceId> press`
- Curtain 50%: `node scripts/switchbot_cli.js cmd <deviceId> setPosition --pos 50`
- Lock/Unlock (Lock): `node scripts/switchbot_cli.js cmd <deviceId> lock` / `unlock`

## API Notes (concise)

Base URL by region:
- global: https://api.switch-bot.com
- na:     https://api.switch-bot.com
- eu:     https://api.switch-bot.com
- jp:     https://api.switch-bot.com

Use path prefix `/v1.1`.

Headers (required):
- Authorization: <SWITCHBOT_TOKEN>
- sign: HMAC-SHA256 of (token + timestamp + nonce) using SECRET, Base64-encoded
- t: milliseconds epoch as string
- nonce: random UUID
- Content-Type: application/json

Key endpoints:
- GET /v1.1/devices
- GET /v1.1/devices/{deviceId}/status
- POST /v1.1/devices/{deviceId}/commands
  - body: { "command": "turnOn|turnOff|press|lock|unlock|setPosition|setTemperature|setMode|setVolume", "parameter": "<string>", "commandType": "command" }
- Scenes (fallback when a model has no public commands):
  - GET /v1.1/scenes
  - POST /v1.1/scenes/{sceneId}/execute

Notes on limitations:
- Some models (e.g., certain Robot Vacuum lines) do NOT expose direct commands in OpenAPI v1.1. When a command returns {statusCode:160, message:"unknown command"}, create a Scene in the SwitchBot app (e.g., "Vacuum Start") and execute it via the Scenes API.

For command parameters, see references/commands.md. Scenes usage examples are in references/examples.md.

## How the Agent Should Use This Skill

- Prefer running the provided scripts. They compute signatures and handle retries.
- Preflight guard: the CLI checks device capabilities before sending commands. For Bluetooth-class devices (e.g., Bot/Lock/Curtain), it requires `enableCloudService=true` and a non-empty `hubDeviceId`. If missing, it aborts with a clear fix (bind a Hub and enable Cloud Services in the SwitchBot app).
- If environment variables are missing, ask the user to provide/define them securely (do not log secrets).
- For sensitive actions (e.g., unlock), require explicit confirmation and optionally a one-time code if the user enables it.
- On errors with code 190/TokenInvalid or 100/Unauthorized: re-check token/secret, time drift, or signature composition.

## Files

- scripts/switchbot_cli.js — Node CLI for list/status/commands
- scripts/list_devices.sh — curl listing
- scripts/get_status.sh — curl status
- scripts/send_command.sh — curl command
- references/commands.md — parameters for common devices
- references/examples.md — example invocations and JSON outputs

Keep this SKILL.md lean; consult references/ for details.
