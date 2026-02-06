---
name: aimlapi-llm-reasoning
description: Run AIMLAPI (OpenAI-compatible) LLM and reasoning workflows, including chat completions, tool-style prompts, and structured outputs. Use when Codex needs to craft prompts, run LLM calls, or script reasoning/analysis via the AIMLAPI endpoint.
---

# AIMLAPI LLM + Reasoning

## Overview

Use reusable scripts to call AIMLAPI chat completions, pass model-specific reasoning parameters, and capture structured outputs.

## Quick start

```bash
export AIMLAPI_API_KEY="sk-aimlapi-..."
python3 {baseDir}/scripts/run_chat.py --model aimlapi/openai/gpt-5-nano-2025-08-07 --user "Summarize this in 3 bullets."
```

## Tasks

### Run a basic chat completion

```bash
python3 {baseDir}/scripts/run_chat.py \
  --model aimlapi/openai/gpt-5-nano-2025-08-07 \
  --system "You are a concise assistant." \
  --user "Draft a project kickoff checklist."
```

### Add reasoning or provider-specific parameters

Use `--extra-json` to pass fields such as reasoning effort, response format, or tool configs without editing the script.

```bash
python3 {baseDir}/scripts/run_chat.py \
  --model aimlapi/openai/gpt-5-nano-2025-08-07 \
  --user "Plan a 5-step rollout for a new chatbot feature." \
  --extra-json '{"reasoning": {"effort": "medium"}, "temperature": 0.3}'
```

### Structured JSON output

```bash
python3 {baseDir}/scripts/run_chat.py \
  --model aimlapi/openai/gpt-5-nano-2025-08-07 \
  --user "Return a JSON array of 3 project risks with mitigation." \
  --extra-json '{"response_format": {"type": "json_object"}}'
```

## References

- `references/aimlapi-llm.md`: payload fields and troubleshooting notes.
