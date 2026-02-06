---
name: stepfun-openrouter
description: Integrates StepFun AI models (Step-3.5 Flash, Step-3) via OpenRouter API. Free tier available. Features visible reasoning, fast responses, and multimodal capabilities.
---

# StepFun via OpenRouter 🚀🧠

> **Fast, visible reasoning AI from StepFun — accessible via OpenRouter**

A complete OpenClaw skill that integrates StepFun's powerful reasoning models through OpenRouter's unified API.

## 🆓 FREE TIER AVAILABLE

Start using Step-3.5 Flash immediately, no credit card required!

## Quick Start

### 1. Get API Key

Visit https://openrouter.ai/keys and create a free API key.

### 2. Configure

```bash
export OPENROUTER_API_KEY="your-key-here"
```

### 3. Use

```bash
stepfun-cli "Hello!"
stepfun-cli --reasoning "Explain quantum computing"
```

## Available Models

| Model                       | Price           | Description               |
| --------------------------- | --------------- | ------------------------- |
| stepfun/step-3.5-flash:free | **FREE**        | Fast, efficient reasoning |
| stepfun/step-3.5-flash      | ~$0.20/M tokens | Production-grade          |
| stepfun-ai/step3            | Variable        | Advanced multimodal       |

## Features

- 🧠 Visible reasoning - see how AI thinks
- ⚡ Streaming responses
- 🖼️ Multimodal support
- 🔧 Full CLI with all options

## Installation

```bash
clawhub install stepfun-openrouter
```

## Links

- GitHub: https://github.com/mig6671/stepfun-openrouter
- ClawHub: https://clawhub.com/skills/stepfun-openrouter
- OpenRouter: https://openrouter.ai/models/stepfun/step-3.5-flash
