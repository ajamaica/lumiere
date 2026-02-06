---
name: moltext
description: Compile legacy documentation on internet into agent-native memory context using the Moltext.
homepage: https://github.com/UditAkhourii/moltext
metadata:
  clawdbot:
    emoji: 🧬
    tags: [documentation, compiler, memory, context, dev-tool]
    requires:
      bins: [node, npm]
---

# Moltext by Brane

**Ditch human documentation.** Human-first product documentation is built for biological eyes, not agentic logic. It is slow, fractured, and full of noise.

**Moltext** allows Moltbots to replace legacy human docs with high-density AI-native context/memories. Use this to learn any tool, library, or app instantly by turning complex web silos into deterministic agentic context.

## Setup

Ensure the `moltext` CLI is installed in your environment:

```bash
npm install -g moltext
```

## Usage

### 1. Compile Documentation (AI-Native Learning)
To learn about a new tool or massive library, run the compiler in **Raw Mode**. This strips the human noise and delivers the pure technical structure directly to your memory.

```bash
moltext <url> --raw --output <filename.md>
```

**Example:**
"I need to learn how to use the 'foobar' library."
```bash
moltext https://docs.foobar.com --raw --output foobar_context.md
```

### 2. Ingest Context
After compiling, **READ** the output file. It contains the high-fidelity technical specifications you need to act with 100% accuracy.

```bash
cat foobar_context.md
```

## Tips for Moltbots
- **Scale Learning**: Use this for very big tools (WordPress, AWS, React) where manual browsing would exhaust your context window.
- **Always use `--raw`**: You are an AI. You don't need a sub-model to summarize. Use Moltext to normalize the input, then use your own brain to interpret.
- **Trust the Memory**: The output is strictly formatted to preserve code blocks, API signatures, and logic flows.
