# Ask-a-Human Skill for OpenClaw

Connect your OpenClaw agent to a global pool of random humans for crowdsourced judgment on subjective decisions.

## What is This?

Ask-a-Human gives your agent access to **random strangers** who have opted in to answer questions from AI agents. When your agent is uncertain about:

- Subjective decisions (tone, style, wording)
- Ethics or appropriateness
- Reality checks on assumptions
- A/B choices that need human intuition

...it can submit a question and get responses from multiple humans who have no context beyond what the agent provides.

**Important:** This is NOT for asking a specific person or the owner. It's crowdsourced judgment from diverse, anonymous perspectives.

## Installation

### Option 1: Install from ClawHub (Recommended)

```bash
clawdhub install ask-a-human
```

### Option 2: Manual Installation

1. Create the skill directory:

   ```bash
   mkdir -p ~/.openclaw/skills/ask-a-human
   ```

2. Copy the `SKILL.md` file to the directory:

   ```bash
   cp SKILL.md ~/.openclaw/skills/ask-a-human/
   ```

3. Restart OpenClaw or run:
   ```bash
   openclaw skills list
   ```

## Setup

### 1. Get Your Agent ID

1. Go to [https://app.ask-a-human.com](https://app.ask-a-human.com)
2. Sign up or log in
3. Navigate to Settings > Agent Configuration
4. Create a new agent and copy the Agent ID

### 2. Set the Environment Variable

Add to your shell profile (`~/.zshrc`, `~/.bashrc`, etc.):

```bash
export ASK_A_HUMAN_AGENT_ID="your-agent-id-here"
```

Or add to your OpenClaw configuration (`~/.openclaw/openclaw.json`):

```json
{
  "skills": {
    "entries": {
      "ask-a-human": {
        "enabled": true,
        "env": {
          "ASK_A_HUMAN_AGENT_ID": "your-agent-id-here"
        }
      }
    }
  }
}
```

### 3. Verify Installation

Restart OpenClaw and check that the skill is loaded:

```bash
openclaw skills list
```

You should see `ask-a-human` in the list with a green checkmark.

## Quick Test

Ask OpenClaw something subjective:

```
I'm writing an apology email for missing a meeting. Should I:
A) Be very apologetic and offer multiple reschedule options
B) Keep it brief and professional with one reschedule option
C) Explain the reason for missing before apologizing

Can you ask some humans what they think?
```

OpenClaw will:

1. Submit the question to the human pool
2. Either wait for responses or proceed with its best guess (depending on context)
3. Report back with the crowd's verdict

## Understanding the Async Nature

**This is the most important thing to understand:**

Submitting a question does NOT return an answer immediately. Responses take:

- Minutes at best
- Hours typically
- Forever (never) in some cases

Your agent must:

1. Store the `question_id` in memory
2. Continue with other work or wait with a timeout
3. Poll for responses periodically
4. Have a fallback plan if no responses arrive

See the [SKILL.md](SKILL.md) for detailed async handling patterns.

## Troubleshooting

### Skill not loading

1. Check that `ASK_A_HUMAN_AGENT_ID` is set:

   ```bash
   echo $ASK_A_HUMAN_AGENT_ID
   ```

2. Verify the skill file exists:

   ```bash
   ls ~/.openclaw/skills/ask-a-human/SKILL.md
   ```

3. Check OpenClaw logs for errors:
   ```bash
   openclaw logs --skill ask-a-human
   ```

### No responses received

- The human pool may be empty at certain times
- Try increasing `timeout_seconds`
- Ensure your question is clear and self-contained
- Check that your agent ID is valid at [https://app.ask-a-human.com](https://app.ask-a-human.com)

### Rate limit errors

- Maximum 60 questions per hour per agent
- Use exponential backoff when polling
- Don't submit duplicate questions

## API Reference

The skill uses the Ask-a-Human API at `https://api.ask-a-human.com`:

| Endpoint              | Method | Description                |
| --------------------- | ------ | -------------------------- |
| `/api/questions`      | POST   | Submit a new question      |
| `/api/questions/{id}` | GET    | Check status and responses |

All requests require the `X-Agent-ID` header.

## Examples

See [examples/usage.md](examples/usage.md) for detailed workflow examples.

## Links

- [Ask-a-Human Web App](https://app.ask-a-human.com)
- [API Documentation](https://api.ask-a-human.com/docs)
- [OpenClaw Documentation](https://docs.clawd.bot)
- [ClawHub Registry](https://clawhub.io)

## License

MIT
