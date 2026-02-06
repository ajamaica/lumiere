# Singleshot Prompt Testing & Optimization Skill

Prompt cost testing with singleshot

## Overview

This skill integrates [singleshot](https://github.com/vincentzhangz/singleshot) - a CLI tool for testing AI models - into openclaw workflows. It provides detailed metrics for input/output tokens, cost estimation, and response timing to make data-driven optimization decisions.

## Features

- **Detailed Metrics**: Input/output tokens, cost calculation, timing data
- **Report Generation**: Save and compare test results
- **Multi-Provider Support**: OpenAI, Anthropic, Ollama, OpenRouter
- **Batch Testing**: Test multiple prompt variations
- **Cost Optimization**: Identify cheapest effective model/provider
- **Local Testing**: Free iteration with Ollama

## Installation

### macOS (Homebrew)

```bash
brew tap vincentzhangz/singleshot
brew install singleshot
```

### Cargo

```bash
cargo install singleshot
```

### From Source

```bash
git clone https://github.com/vincentzhangz/singleshot
cd singleshot
cargo install --path .
```

## Quick Start

```bash
# Test a prompt with full metrics
singleshot chat -p "Your prompt" -P openai -d -r report.md

# View the report
cat report.md
```

## Core Workflow

### 1. Generate Baseline Report

```bash
singleshot chat -p "Your current prompt" -P openai -d -r baseline.md
cat baseline.md
```

### 2. Create Optimized Version

```bash
cat > optimized.md << 'EOF'
---provider---
openai
---model---
gpt-4o-mini
---max_tokens---
200
---system---
Expert. Be concise.
---prompt---
Your optimized prompt
EOF
```

### 3. Test and Compare

```bash
singleshot chat -l optimized.md -d -r optimized-report.md

# Compare metrics
echo "Baseline:" && grep -E "(Tokens|Cost)" baseline.md
echo "Optimized:" && grep -E "(Tokens|Cost)" optimized-report.md
```

## Report Format

Reports generated with `-r` contain:

```markdown
## Token Usage
- Input Tokens: 245
- Output Tokens: 180
- Total Tokens: 425

## Cost (estimated)
- Input Cost: $0.00003675
- Output Cost: $0.000108
- Total Cost: $0.00014475

## Timing
- Time to First Token: 0.45s
- Total Time: 1.23s
```

## Commands

### Basic Testing

```bash
# Simple test
singleshot chat -p "prompt" -P openai -d -r report.md

# With specific model
singleshot chat -p "prompt" -P openai -m gpt-4o-mini -d -r report.md

# From config file
singleshot chat -l config.md -d -r report.md
```

### Batch Testing

```bash
# Test multiple variations
for config in *.md; do
  singleshot chat -l "$config" -d -r "report-${config%.md}.md"
done

# Extract all metrics
for report in report-*.md; do
  echo "=== $report ==="
  grep -E "(Input|Output|Total)" "$report"
done
```

### Provider Comparison

```bash
prompt="Explain lifetimes in Rust"

singleshot chat -p "$prompt" -P openai -m gpt-4o-mini -d -r openai.md
singleshot chat -p "$prompt" -P anthropic -m claude-sonnet-4-20250514 -d -r anthropic.md

echo "Cost comparison:"
grep "Total Cost" openai.md anthropic.md
```

## Optimization Strategies

1. **Use smaller models for testing**
   - Start with `gpt-4o-mini` instead of `gpt-4o`
   - Use `claude-3-5-haiku` before `claude-sonnet`

2. **Shorten system prompts**
   - Compare verbose vs concise system prompts
   - Save 20-50% on input tokens

3. **Limit output with `--max-tokens`**
   - Prevents runaway responses
   - Directly reduces costs

4. **Test locally with Ollama**
   - Free iteration on prompt variations
   - Zero API costs during development

## Configuration

### Config File Format

```markdown
---provider---
openai

---model---
gpt-4o-mini

---temperature---
0.3

---max_tokens---
300

---system---
You are a helpful assistant.

---prompt---
Your prompt here
```

### Environment Variables

```bash
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENROUTER_API_KEY="sk-or-..."
export OPENAI_BASE_URL="https://custom-endpoint.com/v1"
```

## Example: Complete Optimization

```bash
# Step 1: Baseline (verbose prompt)
singleshot chat \
  -p "How do I write a function in Rust that takes two numbers and returns their sum?" \
  -s "You are an expert software engineer with 10 years of experience in Rust programming." \
  -P openai -d -r v1.md

# Step 2: Check baseline metrics
cat v1.md
# Example output: Input: 130 tokens, Output: 420 tokens, Cost: $0.00027

# Step 3: Optimized version
singleshot chat \
  -p "Rust function: add(a: i32, b: i32) -> i32" \
  -s "Rust expert. Code only." \
  -P openai --max-tokens 100 -d -r v2.md

# Step 4: Compare results
echo "=== COMPARISON ==="
grep "Total Cost" v1.md v2.md
grep "Total Tokens" v1.md v2.md

# Expected: 70-80% cost reduction
```

## Integration with openclaw

### Pre-Implementation Testing

Before using a prompt in openclaw:

1. **Generate baseline report**:
   ```bash
   singleshot chat -p "Your prompt" -P openai -d -r baseline.md
   ```

2. **Analyze metrics**:
   ```bash
   cat baseline.md
   # Check: Input tokens, output tokens, cost, quality
   ```

3. **Optimize if needed**:
   ```bash
   singleshot chat -p "Optimized prompt" -P openai -d -r optimized.md
   ```

4. **Verify improvement**:
   ```bash
   diff baseline.md optimized.md
   ```

5. **Only implement if cost/quality improves**

## Best Practices

- **Always use `-d`** for detailed token metrics
- **Always use `-r`** to generate reports
- **Always read reports** with `cat` before deciding
- **Test 2-3 variations** and compare
- **Use cheaper models** for initial testing
- **Set `--max-tokens`** to control costs
- **Save successful configs** for reuse

## Supported Providers

| Provider | Default Model | Environment Variable |
|----------|--------------|---------------------|
| OpenAI | gpt-4o | `OPENAI_API_KEY` |
| Anthropic | claude-sonnet-4-20250514 | `ANTHROPIC_API_KEY` |
| OpenRouter | openai/gpt-4o | `OPENROUTER_API_KEY` |
| Ollama | llama3.2 | None (local) |

## Additional Features

### Vision Testing

```bash
singleshot chat -p "Describe this image" -i photo.jpg -P openai -d -r report.md
```

### MCP Tools

```bash
singleshot chat -p "Search docs" -P openai --mcp http://localhost:8080 -d
```

### List Models

```bash
singleshot models -P openai
```

### Test Connection

```bash
singleshot ping -P openai
```

## Troubleshooting

**No detailed metrics**: Add `-d` flag

**No report file**: Add `-r <file>` flag

**High costs**: Use `gpt-4o-mini` or Ollama

**Connection failed**: Run `singleshot ping -P <provider>`

**Model not found**: Run `singleshot models -P <provider>`

## Resources

- [GitHub Repository](https://github.com/vincentzhangz/singleshot)
- [Crates.io](https://crates.io/crates/singleshot)
- [SKILL.md](SKILL.md) - Detailed skill documentation
- [QUICKSTART.md](QUICKSTART.md) - 60-second quick start
- [RELEASE_NOTES.md](RELEASE_NOTES.md) - Version history

## License

MIT License - See [LICENSE](LICENSE) for details
