# IsItWater AgentSkill

An [AgentSkills](https://agentskills.io)-compatible skill for the [IsItWater](https://isitwater.com) API. Works with [OpenClaw](https://docs.openclaw.ai/tools/skills) and other AgentSkills-compatible frameworks.

This skill teaches AI agents how to check whether geographic coordinates are over water or land using the IsItWater REST API.

## Installation

### Via ClawHub

```bash
clawhub install isitwater
```

### Manual

Clone this repository into your skills directory:

```bash
# Global (available to all agents)
git clone https://github.com/noreaster-group/isitwater-agentskill.git ~/.openclaw/skills/isitwater

# Or workspace-local (available to one agent)
git clone https://github.com/noreaster-group/isitwater-agentskill.git ./skills/isitwater
```

## Configuration

The skill requires an API key from [isitwater.com](https://isitwater.com).

**Option A** — Set the environment variable directly:

```bash
export ISITWATER_API_KEY=your_api_key_here
```

**Option B** — Configure via `~/.openclaw/openclaw.json`:

```json
{
  "skills": {
    "entries": {
      "isitwater": {
        "apiKey": "your_api_key_here"
      }
    }
  }
}
```

If the key is not configured, the skill will guide you through the setup process when invoked.

## API Endpoints

| Endpoint                              | Method | Description                         | Cost     |
| ------------------------------------- | ------ | ----------------------------------- | -------- |
| `/v1/locations/water?lat=LAT&lon=LON` | GET    | Check if coordinates are over water | 1 credit |
| `/v1/accounts/me`                     | GET    | Account info and balance            | Free     |

## Links

- [IsItWater](https://isitwater.com) — Get your API key
- [AgentSkills Spec](https://agentskills.io) — The skill format standard
- [OpenClaw Skills Docs](https://docs.openclaw.ai/tools/skills) — How skills work in OpenClaw
- [ClawHub](https://clawhub.com) — Browse and install skills

## License

[MIT](LICENSE)
