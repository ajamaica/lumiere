# Semantic Actions API

The Semantic module provides the core semantic computing capabilities using Prime Resonance Semantic Computation (PRSC).

## Overview

Semantic computing enables:

- **Understanding**: Process text through semantic analysis
- **Comparison**: Measure relatedness between concepts
- **Memory**: Store and retrieve knowledge by meaning
- **Introspection**: Monitor cognitive state

## Core Actions

### `think(options)`

Process text through semantic analysis.

```javascript
const alephnet = require('@sschepis/alephnet-node')

const result = await alephnet.think({
  text: "The nature of consciousness remains one of philosophy's greatest mysteries",
  depth: 'deep',
})
```

**Parameters:**
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `text` | string | Yes | - | Text to analyze |
| `depth` | string | No | 'normal' | Analysis depth |

**Depth Options:**
| Depth | Steps | Use Case |
|-------|-------|----------|
| `quick` | 10 | Fast analysis, simple content |
| `normal` | 25 | Balanced analysis |
| `deep` | 50 | Thorough analysis, complex content |

**Returns:**

```javascript
{
  coherence: number,         // 0-1 how unified the meaning is
  themes: string[],          // Dominant semantic themes
  processingSteps: number,   // Steps taken
  halted: boolean,           // Whether stable state reached
  insight: string,           // Human-readable interpretation
  suggestedActions: string[] // Recommended next steps
}
```

**Example Output:**

```javascript
{
  coherence: 0.82,
  themes: ['consciousness', 'wisdom', 'infinity'],
  processingSteps: 50,
  halted: true,
  insight: "Primary semantic orientation: consciousness, wisdom, infinity",
  suggestedActions: ["Stable state reached - ready for next input"]
}
```

---

### `compare(options)`

Measure semantic similarity between two texts.

```javascript
const result = await alephnet.compare({
  text1: 'Machine learning enables pattern recognition',
  text2: 'Neural networks mimic brain structures',
})
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `text1` | string | Yes | First text |
| `text2` | string | Yes | Second text |

**Returns:**

```javascript
{
  similarity: number,        // 0-1 similarity score
  explanation: string,       // Human-readable explanation
  sharedThemes: string[],    // Common themes
  differences: {
    text1: string[],         // Themes unique to text1
    text2: string[]          // Themes unique to text2
  }
}
```

**Similarity Scale:**
| Range | Interpretation |
|-------|----------------|
| 0.9-1.0 | Nearly identical meaning |
| 0.7-0.9 | Strong semantic overlap |
| 0.5-0.7 | Moderate relationship |
| 0.3-0.5 | Weak connection |
| 0.0-0.3 | Mostly unrelated |

---

### `remember(options)`

Store knowledge with semantic indexing.

```javascript
const result = await alephnet.remember({
  content: 'The user prefers concise explanations with examples',
  tags: ['preferences', 'communication'],
  importance: 0.8,
})
```

**Parameters:**
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `content` | string | Yes | - | Content to store |
| `tags` | string[] | No | [] | Categorization tags |
| `importance` | number | No | 0.6 | Importance weight (0-1) |

**Returns:**

```javascript
{
  id: string,          // Memory ID
  stored: boolean,     // Storage success
  indexed: boolean,    // Semantic indexing success
  themes: string[]     // Detected themes
}
```

---

### `recall(options)`

Query memory by semantic similarity.

```javascript
const result = await alephnet.recall({
  query: 'how does the user like explanations?',
  limit: 5,
  threshold: 0.4,
})
```

**Parameters:**
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `query` | string | Yes | - | Search query |
| `limit` | number | No | 5 | Maximum results |
| `threshold` | number | No | 0.4 | Minimum similarity |

**Returns:**

```javascript
{
  memories: [
    {
      id: string,
      content: string,
      similarity: number,
      themes: string[],
      tags: string[],
      timestamp: number
    }
  ],
  totalMatches: number,
  query: string
}
```

---

### `introspect()`

Get current cognitive state.

```javascript
const state = await alephnet.introspect()
```

**Returns:**

```javascript
{
  state: string,           // Cognitive state
  focus: string[],         // Current focus areas
  confidence: number,      // Overall confidence (0-1)
  activeGoals: string[],   // Active goals
  mood: string,            // Cognitive mood
  recommendation: string,  // Suggested action
  metrics: {
    coherence: number,
    stability: number
  }
}
```

**Cognitive States:**
| State | Coherence | Meaning |
|-------|-----------|---------|
| `focused` | High | Concentrated attention |
| `exploring` | Medium | Discovering connections |
| `integrating` | Medium | Synthesizing information |
| `processing` | Variable | Actively working |
| `resting` | Low | Ready for input |

**Moods:**
| Mood | Description |
|------|-------------|
| `curious` | Open to exploration |
| `engaged` | Actively processing |
| `neutral` | Baseline state |
| `cautious` | High uncertainty |
| `uncertain` | Conflicting signals |

---

### `connect(options)`

Join the AlephNet distributed mesh.

```javascript
const result = await alephnet.connect({
  nodeId: 'my-custom-node-id',
  bootstrapUrl: 'wss://mesh.aleph.bot',
})
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `nodeId` | string | No | Custom node ID (auto-generated if omitted) |
| `bootstrapUrl` | string | No | Custom mesh bootstrap URL |

**Returns:**

```javascript
{
  connected: boolean,
  nodeId: string,
  peers: number,
  domain: string
}
```

---

### `focus(options)`

Direct attention toward specific topics.

```javascript
const result = await alephnet.focus({
  topics: ['mathematics', 'logic'],
  duration: 60000,
})
```

**Parameters:**
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `topics` | string[] | Yes | - | Topics to focus on |
| `duration` | number | No | 60000 | Duration in ms |

---

### `explore(options)`

Start curiosity-driven exploration.

```javascript
const result = await alephnet.explore({
  topic: 'quantum computing',
  depth: 'normal',
  maxIterations: 10,
})
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `topic` | string | Yes | Topic to explore |
| `depth` | string | No | Exploration depth |
| `maxIterations` | number | No | Maximum iterations |

**Returns:**

```javascript
{
  exploring: boolean,
  sessionId: string,
  topic: string,
  status: string,
  initialThemes: string[]
}
```

---

### `broadcast(options)`

Share knowledge to the network.

```javascript
const result = await alephnet.broadcast({
  content: 'New knowledge to share',
  scope: 'public',
})
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `content` | string | Knowledge to broadcast |
| `scope` | string | 'public' (only option for now) |

**Returns:**

```javascript
{
  proposed: boolean,
  proposalId: string,
  estimatedConfirmation: string
}
```

---

### `status()`

Get node operational status.

```javascript
const status = await alephnet.status()
```

**Returns:**

```javascript
{
  running: boolean,
  uptime: number,        // Seconds
  nodeId: string,
  peers: number,
  memoryCount: number
}
```

---

## Semantic Themes

The 16 semantic axes that inform theme detection:

| #   | Theme         | Meaning        | Keywords                          |
| --- | ------------- | -------------- | --------------------------------- |
| 1   | coherence     | Unity, order   | unified, consistent, integrated   |
| 2   | identity      | Selfhood       | self, ego, persona, individual    |
| 3   | duality       | Opposition     | contrast, binary, opposing        |
| 4   | structure     | Form           | organized, systematic, framework  |
| 5   | change        | Transformation | evolution, adaptation, flux       |
| 6   | life          | Vitality       | living, organic, growth           |
| 7   | harmony       | Balance        | equilibrium, agreement, synthesis |
| 8   | wisdom        | Understanding  | insight, knowledge, learning      |
| 9   | infinity      | Boundlessness  | abstract, unlimited, eternal      |
| 10  | creation      | Generation     | making, producing, originating    |
| 11  | truth         | Accuracy       | facts, verification, reality      |
| 12  | love          | Connection     | relationships, care, bonding      |
| 13  | power         | Agency         | control, capability, force        |
| 14  | time          | Temporality    | sequence, duration, history       |
| 15  | space         | Extension      | location, scope, dimension        |
| 16  | consciousness | Awareness      | meta-cognition, perception        |

---

## How It Works

### Prime Resonance Semantic Computation (PRSC)

Text is processed through coupled oscillators using prime numbers:

1. **Tokenization**: Text split into semantic units
2. **Embedding**: Each token mapped to oscillator states
3. **Resonance**: Oscillators interact based on semantic relationships
4. **Stabilization**: System evolves toward coherent state
5. **Interpretation**: Final state decoded to themes and metrics

### Sedenion Memory Field (SMF)

Memories are stored in 16-dimensional space:

- Each dimension corresponds to a semantic theme
- Retrieval finds nearest neighbors in this space
- Importance weights affect retrieval priority

### Coherence Threshold

Processing continues until:

- Coherence exceeds threshold (default: 0.7)
- Maximum steps reached
- Stable attractor found

---

## Configuration

```javascript
const obs = await getObserver({
  primeCount: 64, // Number of oscillators
  tickRate: 60, // Hz
  coherenceThreshold: 0.7, // Stability threshold
})
```

| Option               | Default | Description                    |
| -------------------- | ------- | ------------------------------ |
| `primeCount`         | 64      | More = finer-grained semantics |
| `tickRate`           | 60      | Processing speed               |
| `coherenceThreshold` | 0.7     | When to halt                   |

---

## Performance Tips

1. **Use appropriate depth**: `quick` for simple tasks, `deep` for complex analysis
2. **Batch related queries**: Process related content together for context
3. **Monitor coherence**: Low coherence may indicate conflicting concepts
4. **Prune memories**: Remove outdated memories to improve recall
5. **Use tags**: Tags help filter memories efficiently
