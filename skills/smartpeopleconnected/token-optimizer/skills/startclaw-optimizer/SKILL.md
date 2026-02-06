# OpenClaw Optimizer Skill

> Comprehensive performance and cost optimization for Clawdbot workflows

## Overview

The OpenClaw Optimizer provides intelligent resource management and cost reduction for AI agent workflows. It implements automatic context compaction, model routing, and budget monitoring.

## Main Features

### Task Router

- Intelligent model selection across Haiku, Sonnet, and Opus
- Automatic task classification and routing
- Cost prediction before execution

### Scheduler

- Retry strategies with exponential backoff
- Pre/post execution hooks
- Concurrent task management

### Browser Governor

- Tab management and process control
- Resource cleanup automation
- Memory optimization

### Context Compaction

- Automatic summarization at 50,000 token threshold
- Preserves critical context and task intent
- Uses Claude 3.5 Haiku for cost-effective summarization

### Real-time Dashboard

- Budget and performance monitoring
- Token usage tracking
- Cost analytics

## Financial Impact

| Metric      | Before | After   | Reduction |
| ----------- | ------ | ------- | --------- |
| Daily Cost  | ~$90   | $3-5    | 95%       |
| Token Waste | High   | Minimal | 70-90%    |

## Installation

```bash
npm install startclaw-optimizer
```

## Usage

```javascript
const { TaskRouter, OptimizerScheduler, BrowserGovernor } = require('startclaw-optimizer')

// Initialize components
const router = new TaskRouter()
const scheduler = new OptimizerScheduler()
const governor = new BrowserGovernor()

// Route task to optimal model
const result = await router.execute(task)
```

## Configuration

```yaml
optimizer:
  token_threshold: 50000
  summary_model: claude-3-5-haiku
  budget:
    daily: 5.00
    monthly: 150.00
  routing:
    default: haiku
    complex: sonnet
    critical: opus
```

## License

StartClaw Internal Use License
