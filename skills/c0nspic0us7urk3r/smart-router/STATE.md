# Smart-Router v2.0.0 — State Summary

## Published

- **GitHub:** https://github.com/c0nSpIc0uS7uRk3r/smart-router
- **ClawHub:** https://www.clawhub.ai/c0nSpIc0uS7uRk3r/smart-router
- **Version:** 2.0.0 (Phase G)
- **License:** MIT

## Core Files

| File                 | Purpose                     |
| -------------------- | --------------------------- |
| `router_gateway.py`  | Core routing middleware     |
| `semantic_router.py` | Expertise-weighted scoring  |
| `expert_matrix.json` | Feb 2026 benchmarks         |
| `context_guard.py`   | Phase H overflow prevention |
| `state_manager.py`   | Circuit breaker persistence |
| `executor.py`        | Sub-agent delegation        |
| `dashboard.py`       | /router commands            |

## Routing Agents (openclaw.json)

- `grok` → xai/grok-3
- `gemini` → google/gemini-2.5-pro
- `flash` → google/gemini-2.5-flash
- `gpt` → openai/gpt-5

## Fallback Chain

```
Opus → Haiku → Gemini Pro → GPT-5
```

## Phase H Rules

- **>180K tokens** → Force route to Gemini Pro
- **422/400 errors** → Silent retry with Gemini Pro
