---
name: ollama-local
description: Manage and use local Ollama models. Use for model management (list/pull/remove), chat/completions, embeddings, and tool-use with local LLMs. Covers OpenClaw sub-agent integration and model selection guidance.
---

# Ollama Local

Work with local Ollama models for inference, embeddings, and tool use.

## Configuration

Set your Ollama host (defaults to `http://localhost:11434`):

```bash
export OLLAMA_HOST="http://localhost:11434"
# Or for remote server:
export OLLAMA_HOST="http://192.168.1.100:11434"
```

## Quick Reference

```bash
# List models
python3 scripts/ollama.py list

# Pull a model
python3 scripts/ollama.py pull llama3.1:8b

# Remove a model
python3 scripts/ollama.py rm modelname

# Show model details
python3 scripts/ollama.py show qwen3:4b

# Chat with a model
python3 scripts/ollama.py chat qwen3:4b "What is the capital of France?"

# Chat with system prompt
python3 scripts/ollama.py chat llama3.1:8b "Review this code" -s "You are a code reviewer"

# Generate completion (non-chat)
python3 scripts/ollama.py generate qwen3:4b "Once upon a time"

# Get embeddings
python3 scripts/ollama.py embed bge-m3 "Text to embed"
```

## Model Selection

See [references/models.md](references/models.md) for full model list and selection guide.

**Quick picks:**
- Fast answers: `qwen3:4b`
- Coding: `qwen2.5-coder:7b`
- General: `llama3.1:8b`
- Reasoning: `deepseek-r1:8b`

## Tool Use

Some local models support function calling. Use `ollama_tools.py`:

```bash
# Single request with tools
python3 scripts/ollama_tools.py single qwen2.5-coder:7b "What's the weather in Amsterdam?"

# Full tool loop (model calls tools, gets results, responds)
python3 scripts/ollama_tools.py loop qwen3:4b "Search for Python tutorials and summarize"

# Show available example tools
python3 scripts/ollama_tools.py tools
```

**Tool-capable models:** qwen2.5-coder, qwen3, llama3.1, mistral

## OpenClaw Sub-Agents

Spawn local model sub-agents with `sessions_spawn`:

```python
# Example: spawn a coding agent
sessions_spawn(
    task="Review this Python code for bugs",
    model="ollama/qwen2.5-coder:7b",
    label="code-review"
)
```

Model path format: `ollama/<model-name>`

### Parallel Agents (Think Tank Pattern)

Spawn multiple local agents for collaborative tasks:

```python
agents = [
    {"label": "architect", "model": "ollama/gemma3:12b", "task": "Design the system architecture"},
    {"label": "coder", "model": "ollama/qwen2.5-coder:7b", "task": "Implement the core logic"},
    {"label": "reviewer", "model": "ollama/llama3.1:8b", "task": "Review for bugs and improvements"},
]

for a in agents:
    sessions_spawn(task=a["task"], model=a["model"], label=a["label"])
```

## Direct API

For custom integrations, use the Ollama API directly:

```bash
# Chat
curl $OLLAMA_HOST/api/chat -d '{
  "model": "qwen3:4b",
  "messages": [{"role": "user", "content": "Hello"}],
  "stream": false
}'

# Generate
curl $OLLAMA_HOST/api/generate -d '{
  "model": "qwen3:4b",
  "prompt": "Why is the sky blue?",
  "stream": false
}'

# List models
curl $OLLAMA_HOST/api/tags

# Pull model
curl $OLLAMA_HOST/api/pull -d '{"name": "phi3:mini"}'
```

## Troubleshooting

**Connection refused?**
- Check Ollama is running: `ollama serve`
- Verify OLLAMA_HOST is correct
- For remote servers, ensure firewall allows port 11434

**Model not loading?**
- Check VRAM: larger models may need CPU offload
- Try a smaller model first

**Slow responses?**
- Model may be running on CPU
- Use smaller quantization (e.g., `:7b` instead of `:30b`)

**OpenClaw sub-agent falls back to default model?**
- Ensure `ollama:default` auth profile exists in OpenClaw config
- Check model path format: `ollama/modelname:tag`
