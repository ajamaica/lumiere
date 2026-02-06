# Context Optimizer

Advanced context management tool optimized for DeepSeek's 64k token window. Employs intelligent pruning to prevent overflow while maintaining critical information.

## Key Capabilities

- **Multiple pruning strategies**: semantic, temporal, and extractive compression
- **Adaptive approaches** based on current usage levels
- **Priority preservation** for system messages and high-priority content
- **Continuous health monitoring** with four status levels

## Core Features

### Semantic Deduplication

Uses embeddings to eliminate redundant messages with high semantic similarity.

### Temporal Pruning

Preserves recent exchanges while removing older, less relevant messages.

### Extractive Summarization

Compresses message groups into concise summaries without losing key information.

### Real-time Health Monitoring

Four status levels: Healthy, Warning, Prune, Emergency

### Token Counting

Accurate counting via tiktoken with local semantic analysis.

## Installation

```bash
npm install context-optimizer
cd ~/.clawdbot/skills/context-optimizer
npm install
```

## Usage

### Programmatic API

```javascript
const { ContextOptimizer } = require('context-optimizer')

const optimizer = new ContextOptimizer({
  contextLimit: 64000,
  strategy: 'adaptive',
  thresholds: {
    warning: 0.7,
    prune: 0.8,
    emergency: 0.95,
  },
})

// Get current status
const status = optimizer.getHealth(messages)
console.log(`Status: ${status.level}, Usage: ${status.percentage}%`)

// Prune messages
const optimized = await optimizer.prune(messages, {
  strategy: 'semantic',
  preserveRecent: 10,
})
```

### CLI Interface

```bash
# Check health status
node context-optimizer.js status --file conversation.json

# Run optimization
node context-optimizer.js prune --input chat.json --output optimized.json

# Test different strategies
node context-optimizer.js test --strategy semantic
```

## Configuration Options

| Parameter          | Default | Description                     |
| ------------------ | ------- | ------------------------------- |
| contextLimit       | 64000   | Maximum tokens allowed          |
| autoPrune          | true    | Enable automatic pruning        |
| warningThreshold   | 0.70    | Percentage to show warning      |
| pruneThreshold     | 0.80    | Percentage to trigger prune     |
| emergencyThreshold | 0.95    | Percentage for aggressive prune |
| relevanceDecay     | 0.05    | Decay rate per time step        |
| batchSize          | 5       | Messages per batch              |
| maxCompactionRatio | 0.50    | Max compression per operation   |

## Integration with Clawdbot

Add to your skill configuration:

```yaml
skills:
  - name: context-optimizer
    enabled: true
    config:
      auto_prune: true
      strategy: adaptive
```

## Performance

- Lightweight architecture
- Configurable caching for real-time processing
- Minimal latency impact

## License

MIT
