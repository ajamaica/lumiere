# Context Pruner / Context Optimizer

> Advanced context management for DeepSeek's 64k token limit

## Overview

A skill module for Clawdbot that provides intelligent pruning, compression, and token optimization to prevent context overflow while preserving important information.

## Primary Components

### Core Features

- **Multiple compaction strategies**: semantic, temporal, extractive, adaptive
- **Query-aware relevance scoring**
- **Hierarchical memory** with archive retrieval
- **Real-time context health monitoring**
- **Chat event logging**

## Architecture

The tool implements a two-tier memory system:

| Tier                  | Capacity   | Speed  | Behavior       |
| --------------------- | ---------- | ------ | -------------- |
| Current Context (RAM) | 64k tokens | Fast   | Auto-compacted |
| Archive (Storage)     | 100MB      | Slower | Searchable     |

## Pruning Strategies

### 1. Semantic Pruning

Removes semantically similar/duplicate messages using embeddings.

### 2. Temporal Pruning

Removes older messages while preserving recent conversation.

### 3. Extractive Pruning

Summarizes message groups to reduce token count.

### 4. Adaptive Pruning

Automatically selects strategy based on context usage level.

## Configuration

```yaml
context_optimizer:
  context_limit: 64000
  auto_prune: true
  thresholds:
    warning: 0.70 # 70% - show warning
    prune: 0.80 # 80% - trigger pruning
    emergency: 0.95 # 95% - aggressive pruning
  relevance_decay: 0.05
  batch_size: 5
  max_compaction_ratio: 0.50
  archive_search_limit: 10
```

## Health Status Levels

| Status    | Usage  | Action             |
| --------- | ------ | ------------------ |
| Healthy   | < 70%  | Normal operation   |
| Warning   | 70-80% | Alert user         |
| Prune     | 80-95% | Auto-compact       |
| Emergency | > 95%  | Aggressive pruning |

## Installation

```bash
npm install context-optimizer
# Or via ClawHub
clawdhub install context-optimizer
```

## Dependencies

- tiktoken
- @xenova/transformers

## Usage

```javascript
const { ContextOptimizer } = require('context-optimizer')

const optimizer = new ContextOptimizer({
  contextLimit: 64000,
  strategy: 'adaptive',
})

// Check health
const health = optimizer.getHealth()

// Prune if needed
if (health.status === 'prune') {
  const pruned = await optimizer.prune(messages)
}
```

## CLI Usage

```bash
# Check status
context-optimizer status

# Test pruning
context-optimizer test --file conversation.json

# Process file
context-optimizer process --input chat.json --output optimized.json
```

## Chat Logging Format

```
📊 Context optimized: Compacted 15 messages → 8
```

## License

MIT
