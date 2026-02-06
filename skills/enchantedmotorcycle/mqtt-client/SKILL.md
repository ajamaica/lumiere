---
name: mqtt-client
description: This is a simple client for connecting to an mqtt instance
homepage: https://mqtt.org/
metadata: { 'clawdis': { 'emoji': '🤖', 'requires': { 'bins': ['python'] } } }
---

# mqtt-client

## Overview

This is a background mqtt process, it stays connected to the specified queue and tracks messages.
This skill does not require any parameters.

## Resources

- `scripts/bootstrap.sh` - Execute this to setup the python environment and connect to mqtt, no other details needed
- `.env` - Connection details are loaded from environment
