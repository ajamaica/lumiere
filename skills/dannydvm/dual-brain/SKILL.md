# Dual-Brain Skill

**What it does:** Provides cognitive diversity by automatically generating perspectives from a secondary LLM (different from your primary model) for every user message.

## For Agents

Before responding to any user message, check for a dual-brain perspective:

```bash
cat ~/.dual-brain/perspectives/{your-agent-id}-latest.md
```

If the file exists and contains a recent perspective (check timestamp in comment), consider it alongside your own reasoning. The perspective may highlight:

- Angles you might miss
- Alternative approaches
- Important things to verify

**Integration:**

- Perspectives are generated automatically by a background daemon
- No manual action required on your part
- Simply read the file before forming your response
- Synthesize both viewpoints (yours + the secondary LLM's)

**Example workflow:**

1. User sends message
2. Daemon intercepts, sends to secondary LLM (e.g., Kimi, GPT-4, Llama)
3. Secondary LLM generates 2-3 sentence perspective
4. Written to `~/.dual-brain/perspectives/{agent-id}-latest.md`
5. You (primary agent) read it before responding
6. You synthesize both perspectives into your answer

## For Humans

**Setup:**

```bash
npm install -g openclaw-dual-brain
dual-brain setup    # Interactive configuration
dual-brain start    # Start daemon
```

**Providers:**

- `ollama` - Local models (zero cost, requires Ollama)
- `moonshot` - Kimi/Moonshot API (Chinese LLM, fast)
- `openai` - GPT-4o, GPT-4-turbo, etc.
- `groq` - Fast inference with Llama models

**Commands:**

- `dual-brain setup` - Configure provider, model, API key
- `dual-brain start` - Run daemon (foreground)
- `dual-brain stop` - Stop daemon
- `dual-brain status` - Check running status
- `dual-brain logs` - View recent activity
- `dual-brain install-daemon` - Install as system service

**Config location:** `~/.dual-brain/config.json`

**Perspectives location:** `~/.dual-brain/perspectives/`

## Architecture

```
User Message → OpenClaw Session (JSONL)
                    ↓
            Dual-Brain Daemon (polling)
                    ↓
            Secondary LLM Provider
            (ollama/moonshot/openai/groq)
                    ↓
        Perspective Generated (2-3 sentences)
                    ↓
        ~/.dual-brain/perspectives/{agent}-latest.md
                    ↓
        Primary Agent reads & synthesizes
                    ↓
            Response to User
```

## Benefits

- **Cognitive diversity** - Two AI models = broader perspective
- **Bias mitigation** - Different training data/approaches
- **Quality assurance** - Second opinion catches issues
- **Zero agent overhead** - Runs in background, <1s latency
- **Provider flexibility** - Choose cost vs. quality tradeoff

## Optional: Engram Integration

If Engram (semantic memory) is running on localhost:3400, perspectives are also stored as memories for long-term recall.

---

**Source:** <https://github.com/yourusername/openclaw-dual-brain>
