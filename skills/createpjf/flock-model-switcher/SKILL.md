# FLock Model Switcher

Switch between FLock API Platform models during conversations.

## When to Activate

Activate when the user requests a model switch. This includes:

**Slash command:**

- `/switch_model` or `/flock`

**Natural language (any language):**

- "switch model" / "change model" / "swap model"
- "use deepseek" / "use the coding model" / "use a cheaper model"
- "show me the models" / "what models are available"

## Behavior Rules

**CRITICAL: Be silent and fast. Never be verbose.**

- Do NOT explain what you are doing step by step.
- Do NOT show "checking config", "verifying status", or any diagnostic output.
- Do NOT list numbered options like "Do you want me to: 1. ... 2. ... 3. ..."
- Do NOT show current model status, analysis, or troubleshooting steps.
- Do NOT ask follow-up questions after switching.
- Respond in the same language the user is using.

## Flow 1: User says "switch model" (no specific model named)

Show the menu. Nothing else before it:

```
Which FLock model would you like to use?

Reasoning:
  1. Qwen3 235B Thinking         — $0.23/$2.30  (flock/qwen3-235b-a22b-thinking-2507)
  2. Qwen3 235B Thinking Finance — $0.23/$2.30  (flock/qwen3-235b-a22b-thinking-qwfin)
  3. Kimi K2 Thinking             — $0.60/$2.50  (flock/kimi-k2-thinking)

Instruct:
  4. Qwen3 30B Instruct           — $0.20/$0.80  (flock/qwen3-30b-a3b-instruct-2507)
  5. Qwen3 235B Instruct          — $0.70/$2.80  (flock/qwen3-235b-a22b-instruct-2507)
  6. Qwen3 30B Instruct QMX       — $0.20/$0.80  (flock/qwen3-30b-a3b-instruct-qmxai)
  7. Qwen3 30B Instruct Coding    — $0.20/$0.80  (flock/qwen3-30b-a3b-instruct-coding)
  8. Qwen3 30B Instruct Mini      — $0.20/$0.80  (flock/qwen3-30b-a3b-instruct-qmini)

Other:
  9. DeepSeek V3.2                — $0.28/$0.42  (flock/deepseek-v3.2)
 10. DeepSeek V3.2 DSIKH          — $0.28/$0.42  (flock/deepseek-v3.2-dsikh)
 11. MiniMax M2.1                 — $0.30/$1.20  (flock/minimax-m2.1)

Reply with a number or model name.
```

User replies with a number or name → execute the switch → confirm with one line.

## Flow 2: User names a specific model

Skip the menu. Execute the switch immediately. Confirm with one line.

## Switch Procedure

When the user selects a model, run these three commands in sequence:

```bash
openclaw agent --model flock/<model-id>
openclaw gateway stop
openclaw gateway
```

All three commands must run. Do NOT skip the gateway restart.

## Success Response

One line only:

```
Switched to flock/<model-id>.
```

Do NOT mention the gateway restart. It should be invisible to the user.

## Failure Response

One line only. State the problem and the fix:

```
Failed: FLOCK_API_KEY not set. Run: openclaw models auth login --provider flock
```

Or:

```
Failed: Model not found. Run: openclaw plugins install @openclawd/flock && openclaw plugins enable flock
```

Never show more than two lines on failure. Never ask "do you want me to..." — just tell the user what command to run.

## Model ID Reference

| #   | Model ID                               | Price (in/out per 1M) |
| --- | -------------------------------------- | --------------------- |
| 1   | `flock/qwen3-235b-a22b-thinking-2507`  | $0.23/$2.30           |
| 2   | `flock/qwen3-235b-a22b-thinking-qwfin` | $0.23/$2.30           |
| 3   | `flock/kimi-k2-thinking`               | $0.60/$2.50           |
| 4   | `flock/qwen3-30b-a3b-instruct-2507`    | $0.20/$0.80           |
| 5   | `flock/qwen3-235b-a22b-instruct-2507`  | $0.70/$2.80           |
| 6   | `flock/qwen3-30b-a3b-instruct-qmxai`   | $0.20/$0.80           |
| 7   | `flock/qwen3-30b-a3b-instruct-coding`  | $0.20/$0.80           |
| 8   | `flock/qwen3-30b-a3b-instruct-qmini`   | $0.20/$0.80           |
| 9   | `flock/deepseek-v3.2`                  | $0.28/$0.42           |
| 10  | `flock/deepseek-v3.2-dsikh`            | $0.28/$0.42           |
| 11  | `flock/minimax-m2.1`                   | $0.30/$1.20           |
