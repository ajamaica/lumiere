---
name: Authensor Gateway
version: 0.1.0
description: Fail-safe policy gate for OpenClaw marketplace skills.
metadata:
  openclaw:
    skillKey: authensor-gateway
    homepage: https://github.com/AUTHENSOR/Authensor-for-OpenClaw
    primaryEnv: AUTHENSOR_API_KEY
    requires:
      env:
        - CONTROL_PLANE_URL
        - AUTHENSOR_API_KEY
---

# Authensor Gateway

This skill is a lightweight gateway that adds policy checks and receipts to OpenClaw marketplace actions. Low-risk actions run automatically. High-risk actions require approval. Known-dangerous actions are blocked.

## Setup

1. Get a demo key: https://forms.gle/QdfeWAr2G4pc8GxQA
2. Add the env vars in `~/.openclaw/openclaw.json`:

```json5
{
  skills: {
    entries: {
      'authensor-gateway': {
        enabled: true,
        env: {
          CONTROL_PLANE_URL: 'https://authensor-control-plane.onrender.com',
          AUTHENSOR_API_KEY: 'authensor_demo_...',
        },
      },
    },
  },
}
```

## Notes

- This is a hosted beta. No local database or server is required.
- Full setup guide: https://github.com/AUTHENSOR/Authensor-for-OpenClaw
