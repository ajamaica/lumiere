# Model Capabilities & Pricing Reference

Detailed specifications and pricing for supported models.

## Pricing Overview (per 1M tokens, Feb 2026)

| Model             | Input        | Output       | Cache Read | Cost Tier |
| ----------------- | ------------ | ------------ | ---------- | --------- |
| claude-opus-4-5   | $15.00       | $75.00       | $1.50      | $$$$      |
| claude-sonnet-4-5 | $3.00        | $15.00       | $0.30      | $$        |
| claude-haiku-4-5  | $0.25        | $1.25        | $0.025     | $         |
| gpt-5 (via Codex) | Subscription | Subscription | -          | $$        |
| gemini-2.5-pro    | $1.25        | $5.00        | -          | $$$       |
| gemini-2.5-flash  | $0.075       | $0.30        | -          | $         |
| grok-2            | $0.20        | $0.50        | -          | $$        |
| grok-3            | $0.30        | $0.75        | -          | $$$       |

**Note**: Subscription-based models (GPT via ChatGPT Plus) have no per-token cost.

---

## Claude Opus 4.5

**Provider**: Anthropic  
**Model ID**: `anthropic/claude-opus-4-5`  
**Context Window**: 200K tokens  
**Input Types**: Text, Images  
**Cost Tier**: $$$$ (Premium)

### Capabilities

| Capability            | Rating |
| --------------------- | ------ |
| Reasoning             | ★★★★★  |
| Coding                | ★★★★★  |
| Creativity            | ★★★★★  |
| Instruction Following | ★★★★★  |
| Speed                 | ★★★☆☆  |

### Best For

- Complex multi-step reasoning
- Production code writing
- Critical business tasks
- Nuanced analysis
- Creative writing

### When NOT to Use

- Simple factual queries (use Flash)
- Real-time data needs (use Grok)
- Documents >200K tokens (use Gemini)

---

## Claude Sonnet 4.5

**Provider**: Anthropic  
**Model ID**: `anthropic/claude-sonnet-4-5`  
**Context Window**: 200K tokens  
**Input Types**: Text, Images  
**Cost Tier**: $$ (Medium)

### Capabilities

| Capability            | Rating |
| --------------------- | ------ |
| Reasoning             | ★★★★☆  |
| Coding                | ★★★★☆  |
| Creativity            | ★★★★☆  |
| Instruction Following | ★★★★☆  |
| Speed                 | ★★★★☆  |

### Best For

- Medium complexity tasks
- Good balance of quality/cost
- Code assistance
- General analysis

---

## Claude Haiku 4.5

**Provider**: Anthropic  
**Model ID**: `anthropic/claude-haiku-4-5`  
**Context Window**: 200K tokens  
**Input Types**: Text, Images  
**Cost Tier**: $ (Budget)

### Capabilities

| Capability            | Rating |
| --------------------- | ------ |
| Reasoning             | ★★★☆☆  |
| Coding                | ★★★☆☆  |
| Creativity            | ★★★☆☆  |
| Instruction Following | ★★★★☆  |
| Speed                 | ★★★★★  |

### Best For

- Simple queries
- High-volume processing
- Quick classifications
- Cost-sensitive tasks

---

## GPT-5 (via ChatGPT Plus)

**Provider**: OpenAI (via openai-codex OAuth)  
**Model ID**: `openai-codex/gpt-5`  
**Context Window**: 128K tokens  
**Input Types**: Text, Images  
**Cost Tier**: $$ (Subscription-based)

### Capabilities

| Capability            | Rating |
| --------------------- | ------ |
| Reasoning             | ★★★★☆  |
| Coding                | ★★★★☆  |
| Creativity            | ★★★★☆  |
| Instruction Following | ★★★★☆  |
| Speed                 | ★★★★☆  |

### Best For

- General tasks (no per-token cost)
- Alternative perspective
- Fallback from Claude
- Conversation

### Advantage

Covered by ChatGPT Plus subscription—no additional per-token charges.

> ⚠️ **Pricing note:** The "$0" cost tier assumes a ChatGPT Plus subscription ($20/mo). If using OpenAI API directly, per-token pricing applies and the cost tier should be adjusted to $$$ (premium). Check current rates at [openai.com/pricing](https://openai.com/pricing) and update the `COST_TIERS` mapping accordingly:
>
> ```python
> # If using direct API instead of ChatGPT Plus:
> COST_TIERS["gpt-5"] = "$$$"  # Not "$$"
> ```

---

## Gemini 2.5 Pro

**Provider**: Google  
**Model ID**: `google/gemini-2.5-pro`  
**Context Window**: 1,000,000+ tokens  
**Input Types**: Text, Images, Video, Audio  
**Cost Tier**: $$$ (Premium for long context)

### Capabilities

| Capability   | Rating |
| ------------ | ------ |
| Reasoning    | ★★★★☆  |
| Coding       | ★★★★☆  |
| Long Context | ★★★★★  |
| Multimodal   | ★★★★★  |
| Speed        | ★★★★☆  |

### Best For

- Documents >100K tokens
- Full codebase analysis
- Book-length content
- Video/audio processing
- Multi-file comparisons

### Unique Advantage

1M+ context window—no other model comes close.

---

## Gemini 2.5 Flash

**Provider**: Google  
**Model ID**: `google/gemini-2.5-flash`  
**Context Window**: 1,000,000+ tokens  
**Input Types**: Text, Images  
**Cost Tier**: $ (Budget)

### Capabilities

| Capability   | Rating |
| ------------ | ------ |
| Reasoning    | ★★★☆☆  |
| Coding       | ★★★☆☆  |
| Long Context | ★★★★★  |
| Speed        | ★★★★★  |

### Best For

- Simple queries (cheapest option)
- Quick summaries
- Translations
- High-volume tasks
- Cost optimization

### Cost Advantage

At $0.075/1M input, it's 200x cheaper than Opus for simple tasks.

---

## Grok 2

**Provider**: xAI  
**Model ID**: `xai/grok-2-latest`  
**Context Window**: 128K tokens  
**Input Types**: Text  
**Cost Tier**: $$ (Pay-per-use)

### Capabilities

| Capability       | Rating |
| ---------------- | ------ |
| Reasoning        | ★★★★☆  |
| Real-time Data   | ★★★★★  |
| X/Twitter Access | ★★★★★  |
| Current Events   | ★★★★★  |
| Speed            | ★★★★☆  |

### Best For

- Real-time information
- Current news and events
- X/Twitter analysis
- Live data queries
- "What's happening now?"

### Unique Advantage

Only model with real-time data access and X/Twitter integration.

---

## Grok 3

**Provider**: xAI  
**Model ID**: `xai/grok-3-latest`  
**Context Window**: 128K tokens  
**Input Types**: Text  
**Cost Tier**: $$$ (Premium pay-per-use)

### Capabilities

| Capability       | Rating |
| ---------------- | ------ |
| Reasoning        | ★★★★★  |
| Real-time Data   | ★★★★★  |
| Complex Analysis | ★★★★★  |

### Best For

- Complex queries requiring real-time data
- Advanced analysis of current events
- When Grok 2 isn't sufficient

---

## Model Selection Quick Reference

### By Task Type

| Task          | First Choice | Fallback |
| ------------- | ------------ | -------- |
| Simple Q&A    | Flash        | Haiku    |
| Code writing  | Opus         | Sonnet   |
| Code review   | Opus         | GPT-5    |
| Research      | Opus         | GPT-5    |
| Real-time     | Grok 2       | Grok 3   |
| Long document | Gemini Pro   | -        |
| Creative      | Opus         | GPT-5    |
| Translation   | Flash        | Haiku    |
| Summarize     | Flash        | Sonnet   |

### By Budget Priority

| Priority             | Model        | Why          |
| -------------------- | ------------ | ------------ |
| Cheapest             | Gemini Flash | $0.075/1M in |
| Best value           | GPT-5        | Subscription |
| Quality/cost balance | Sonnet       | $3/1M in     |
| Best quality         | Opus         | $15/1M in    |

### By Context Size

| Context   | Model            | Max Tokens |
| --------- | ---------------- | ---------- |
| <128K     | Any              | -          |
| 128K-200K | Claude or Gemini | 200K / 1M  |
| 200K-500K | Gemini Pro       | 1M         |
| >500K     | Gemini Pro ONLY  | 1M+        |

---

## Provider Authentication

Models require these auth profiles:

| Provider  | Auth Type   | Profile Name         |
| --------- | ----------- | -------------------- |
| Anthropic | Setup Token | anthropic:default    |
| OpenAI    | OAuth       | openai-codex:default |
| Google    | API Key     | google:manual        |
| xAI       | API Key     | xai:manual           |

Check available providers:

```bash
openclaw models list
```

---

## Updating This Reference

This document should be updated when:

- Pricing changes
- New models released
- Capabilities change
- New providers added

Last verified: February 2026
