# Release Notes

## Version 0.1.0 - 2026-02-04

### Initial Release

prompt cost testing with single shot

#### Features

- **Comprehensive Testing**: Test prompts with detailed token metrics and cost analysis
- **Multi-Provider Support**: OpenAI, Anthropic, Ollama, OpenRouter
- **Report Generation**: Save and compare test results in markdown format
- **Batch Testing**: Test multiple prompt variations efficiently
- **Cost Optimization**: Identify cheapest effective models and prompts
- **Local Testing**: Free iteration with Ollama integration

#### Commands

All commands support the `-d` (detail) and `-r` (report) flags for comprehensive analysis:

```bash
# Basic testing
singleshot chat -p "prompt" -P openai -d -r report.md

# Config-based testing
singleshot chat -l config.md -d -r report.md

# Provider comparison
singleshot chat -p "test" -P openai -d -r openai.md
singleshot chat -p "test" -P anthropic -d -r anthropic.md
```

#### Report Metrics

Reports include:
- Input/Output token counts
- Total token usage
- Cost estimation (per provider pricing)
- Timing metrics (latency and duration)
- Full response content

#### Integration

- Homebrew tap: `vincentzhangz/singleshot`
- Cargo install: `cargo install singleshot`
- openclaw skill triggers: prompt testing, optimization, benchmarking

#### Documentation

- `SKILL.md` - Core skill documentation
- `README.md` - Comprehensive guide
- `QUICKSTART.md` - 60-second quick start
- `metadata.json` - Skill metadata for openclaw

---

## Future Releases

### Planned for 1.1.0

- [ ] Automated optimization suggestions based on report analysis
- [ ] Historical tracking of prompt performance
- [ ] Integration with openclaw cost tracking
- [ ] Support for additional providers (Gemini, Cohere, etc.)

### Planned for 1.2.0

- [ ] Visual comparison charts in reports
- [ ] Prompt template library
- [ ] A/B testing framework
- [ ] CI/CD integration examples

---

## Contributing

Contributions are welcome! Please see the [GitHub repository](https://github.com/vincentzhangz/singleshot) for guidelines.

## Support

- GitHub Issues: [vincentzhangz/singleshot/issues](https://github.com/vincentzhangz/singleshot/issues)
- Documentation: See README.md and SKILL.md
