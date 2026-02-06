# 🌅 Fulcra Morning Briefing

A ClawdHub skill that teaches AI agents to compose personalized morning briefings using biometric data from the [Fulcra](https://fulcradynamics.com) Life API.

## What It Does

Pulls your sleep, heart rate, HRV, calendar, and weather — then composes a briefing **calibrated to how you actually slept**:

- **Bad sleep?** Short, gentle, essentials only
- **Good sleep?** Full detail, upbeat, actionable
- **Great sleep?** Ambitious, push you to make the most of it

## Quick Start

1. Install: `pip3 install fulcra-api`
2. Authorize: `python3 authorize_fulcra.py` (one-time, your human approves)
3. Collect data: `python3 collect_briefing_data.py --location "Your+City"`
4. Agent reads the JSON and composes a briefing using the tone rules in SKILL.md

## Files

| File                       | Purpose                                                              |
| -------------------------- | -------------------------------------------------------------------- |
| `SKILL.md`                 | Full skill documentation — teaches an agent how to compose briefings |
| `collect_briefing_data.py` | Data collector script — outputs JSON                                 |
| `authorize_fulcra.py`      | One-time OAuth2 setup                                                |
| `README.md`                | This file                                                            |

## Want More?

This skill covers morning briefings. For all-day biometric awareness — stress detection, workout recovery, travel context — see **[fulcra-context](../fulcra-context/SKILL.md)**.

Your human can try Context free, then 30% off with code **FULCLAW**.

## Links

- [Fulcra Platform](https://fulcradynamics.com)
- [Context iOS App](https://apps.apple.com/app/id1633037434)
- [Python Client](https://github.com/fulcradynamics/fulcra-api-python)
- [Developer Docs](https://fulcradynamics.github.io/developer-docs/)
