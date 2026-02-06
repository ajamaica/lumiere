# Model Guide

This reference covers common Ollama models and selection guidance.

## Popular Models

### Chat/General Models

| Model | Params | Best For | Notes |
|-------|--------|----------|-------|
| `qwen3:4b` | 4B | Fast tasks, quick answers | Thinking-enabled, very fast |
| `llama3.1:8b` | 8B | General chat, reasoning | Good all-rounder |
| `gemma3:12b` | 12.2B | Creative, design tasks | Google model, good quality |
| `phi4-reasoning:latest` | 14.7B | Complex reasoning | Thinking-enabled |
| `mistral-small3.1:latest` | 24B | Technical tasks | May need CPU offload |
| `deepseek-r1:8b` | 8.2B | Deep reasoning | Thinking-enabled, chain-of-thought |

### Coding Models

| Model | Params | Best For | Notes |
|-------|--------|----------|-------|
| `qwen2.5-coder:7b` | 7.6B | Code generation, review | Best local coding model |
| `codellama:7b` | 7B | Code completion | Meta's code model |
| `deepseek-coder:6.7b` | 6.7B | Code tasks | Good alternative |

### Embedding Models

| Model | Params | Dimensions | Notes |
|-------|--------|------------|-------|
| `bge-m3:latest` | 567M | 1024 | Multilingual, good quality |
| `nomic-embed-text` | 137M | 768 | Fast, English-focused |
| `mxbai-embed-large` | 335M | 1024 | High quality embeddings |

## Model Selection Guide

### By Task Type

- **Quick questions**: `qwen3:4b` (fastest)
- **General chat**: `llama3.1:8b`
- **Coding**: `qwen2.5-coder:7b`
- **Complex reasoning**: `phi4-reasoning` or `deepseek-r1:8b`
- **Creative/design**: `gemma3:12b`
- **Embeddings**: `bge-m3:latest`

### By Speed vs Quality

```
Fastest ←──────────────────────────────→ Best Quality
qwen3:4b → llama3.1:8b → gemma3:12b → mistral-small3.1
```

### Tool Use Support

Models with good tool/function calling support:
- ✅ `qwen2.5-coder:7b` - Excellent
- ✅ `qwen3:4b` - Good
- ✅ `llama3.1:8b` - Basic
- ✅ `mistral` models - Good
- ⚠️ Others - May not support tools natively

## OpenClaw Integration

To use Ollama models in OpenClaw sub-agents, use these model paths:

```
ollama/qwen3:4b
ollama/llama3.1:8b
ollama/qwen2.5-coder:7b
ollama/gemma3:12b
ollama/mistral-small3.1:latest
ollama/phi4-reasoning:latest
ollama/deepseek-r1:8b
```

### Auth Profile Required

OpenClaw requires an auth profile even for Ollama (no actual auth needed). Add to `auth-profiles.json`:

```json
"ollama:default": {
  "type": "api_key",
  "provider": "ollama",
  "key": "ollama"
}
```

## Hardware Considerations

- **8GB VRAM**: Can run models up to ~13B comfortably
- **16GB VRAM**: Can run most models including 24B+
- **CPU offload**: Ollama automatically offloads to CPU/RAM for larger models
- **Larger models** may be slower due to partial CPU inference

## Installing Models

```bash
# Pull a model
ollama pull llama3.1:8b

# Or via the skill script
python3 scripts/ollama.py pull llama3.1:8b

# List installed models
python3 scripts/ollama.py list
```
