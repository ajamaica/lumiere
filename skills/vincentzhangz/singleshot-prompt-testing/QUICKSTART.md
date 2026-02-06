# Quick Start

Get started with prompt cost testing with singleshot CLI

## Install

```bash
brew tap vincentzhangz/singleshot
brew install singleshot
```

Or use cargo: `cargo install singleshot`

## Test Your First Prompt

```bash
# Test with detailed metrics and save report
singleshot chat -p "Explain Rust ownership" -P openai -d -r report.md

# View the report
cat report.md
```

## Compare Two Prompts

```bash
# Baseline (verbose)
singleshot chat \
  -p "How do I write a function in Rust?" \
  -s "You are an expert Rust programmer" \
  -P openai -d -r baseline.md

# Optimized (concise)
singleshot chat \
  -p "Rust function to add two i32" \
  -s "Rust expert. Code only." \
  -P openai -d -r optimized.md

# Compare costs
grep "Total Cost" baseline.md optimized.md
```

## Next Steps

- Read [SKILL.md](SKILL.md) for detailed usage
- See [README.md](README.md) for full documentation
- Check [RELEASE_NOTES.md](RELEASE_NOTES.md) for updates
