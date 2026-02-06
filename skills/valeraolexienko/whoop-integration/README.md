# 🏃‍♀️ WHOOP Integration Skill

Complete WHOOP fitness tracker integration for OpenClaw agents with adaptive behavior based on sleep quality.

## Features

- **OAuth 2.0 authentication** with WHOOP API
- **Sleep monitoring** (performance, efficiency, duration, sleep stages)  
- **Recovery tracking** (HRV, resting heart rate, recovery score)
- **Adaptive behavior** - AI assistant adjusts communication style based on sleep quality
- **Automated morning checks** via cron jobs
- **Memory integration** - saves health context for long-term tracking

## Quick Setup

1. Configure WHOOP OAuth credentials:
   ```bash
   openclaw configure --section skills
   ```

2. Run OAuth setup:
   ```bash
   cd ~/.openclaw/workspace/skills/whoop-integration
   python3 scripts/oauth_setup.py
   ```

3. Test integration:
   ```bash
   python3 scripts/whoop_client.py
   ```

## Adaptive Behavior Modes

| Sleep Performance | Mode | Communication Style |
|-------------------|------|-------------------|
| 90%+ (Excellent) | `high_energy` | Enthusiastic, proactive |
| 80-89% (Good) | `optimistic` | Positive, engaging |
| 70-79% (Fair) | `steady` | Supportive, measured |
| <70% (Poor) | `gentle` | Caring, minimal complexity |

## Requirements

- WHOOP device with active subscription
- WHOOP Developer Account ([developer-dashboard.whoop.com](https://developer-dashboard.whoop.com))
- Python 3.7+ with `requests` library

Built with ❤️ for OpenClaw agents by @voltron2