---
name: Humanize CLI - AI Text Detection & Rewriting
description: Detect AI-generated text patterns and get fixes. Score detection risk, find AI vocabulary, suggest improvements. Free CLI for writers and content creators.
---

# Humanize CLI

Analyze text for AI patterns and get actionable fixes. Helps content pass AI detectors by identifying robotic patterns.

## Installation

```bash
npm install -g humanize-cli
```

## Commands

### Score Detection Risk

```bash
humanize score "Your text here"
humanize score -f article.txt
```

Returns 0-100% risk score:

- 0-20%: Low risk (appears human)
- 21-40%: Moderate risk
- 41-70%: High risk (likely flagged)
- 71-100%: Very high risk

### Analyze AI Markers

```bash
humanize analyze "This comprehensive solution leverages cutting-edge technology."
```

Detects:

- AI vocabulary (delve, leverage, comprehensive, robust, seamless)
- Structural patterns (uniform sentences, perfect intro/conclusion)
- Missing human elements (no contractions, no opinions)

### Get Improvement Suggestions

```bash
humanize suggest "It is important to note that our solution utilizes..."
```

Returns prioritized fixes with before/after examples.

### Auto-Transform Text

```bash
humanize transform "The solution utilizes robust methodologies."
# Output: "The solution uses strong methods."
```

Automatically replaces AI vocabulary and adds human elements.

### Watch Directory

```bash
humanize watch ./content --threshold 60
```

Monitor files and alert when detection risk exceeds threshold.

## Common Use Cases

**Check blog post before publishing:**

```bash
humanize score -f blog-post.md
```

**Fix AI-sounding content:**

```bash
humanize transform -f draft.txt > improved.txt
```

**Pipe from clipboard (macOS):**

```bash
pbpaste | humanize suggest
```

## Options

| Flag              | Description             |
| ----------------- | ----------------------- |
| `-f, --file`      | Read from file          |
| `-j, --json`      | JSON output             |
| `-q, --quiet`     | Minimal output          |
| `-t, --threshold` | Alert threshold (0-100) |

## What It Catches

**AI Vocabulary:**

- delve, leverage, utilize, comprehensive, robust, seamless
- stakeholder, synergy, actionable, paradigm
- furthermore, moreover, consequently, nevertheless

**Structural Issues:**

- No contractions (sounds robotic)
- Same-length sentences
- Perfect intro/body/conclusion
- Overuse of transitions

---

**Built by [LXGIC Studios](https://lxgicstudios.com)**

🔗 [GitHub](https://github.com/lxgicstudios/humanize-cli) · [Twitter](https://x.com/lxgicstudios)
