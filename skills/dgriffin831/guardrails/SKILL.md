# guardrails - Interactive Security Guardrails Configuration

Helps users configure comprehensive security guardrails for their OpenClaw workspace through an interactive interview process.

## Commands

### `guardrails setup`

**Interactive setup mode** - Guides user through creating their GUARDRAILS.md file.

**Workflow:**

1. Run environment discovery: `bash scripts/discover.sh`
2. Classify risks: `bash scripts/discover.sh | python3 scripts/classify-risks.py`
3. Generate tailored questions: `bash scripts/discover.sh | python3 scripts/classify-risks.py | python3 scripts/generate_questions.py`
4. **Conduct interactive interview** with the user:
   - Ask questions from the generated question bank (tailored to discovered environment)
   - Present suggestions for each question
   - Allow custom answers
   - Follow up when appropriate
5. Generate GUARDRAILS.md: `echo '<json>' | python3 scripts/generate_guardrails_md.py /path/to/guardrails-config.json`
   - Stdin JSON format: `{"discovery": {...}, "classification": {...}, "answers": {...}}`
6. **Present the generated GUARDRAILS.md for review**
7. Ask for confirmation before writing to workspace
8. Write `GUARDRAILS.md` to workspace root
9. Save `guardrails-config.json` to workspace root

**Important:**

- Be conversational and friendly during the interview
- Explain why each question matters
- Provide context about discovered risks
- Highlight high-risk skills/integrations
- Allow users to skip or customize any answer
- Review the final output with the user before writing

### `guardrails review`

**Review mode** - Check existing configuration against current environment.

**Workflow:**

1. Run discovery and classification
2. Load existing `guardrails-config.json`
3. Compare discovered skills/integrations against config
4. Identify gaps (new skills not covered, removed skills still in config)
5. Ask user about gaps only - don't re-interview everything
6. Update config and GUARDRAILS.md if changes needed

### `guardrails monitor`

**Monitor mode** - Detect changes and potential violations.

**Workflow:**

1. Run: `bash scripts/monitor.sh`
2. Parse the JSON report
3. If status is "ok": silent or brief acknowledgment
4. If status is "needs-attention": notify user with details
5. If status is "review-recommended": suggest running `guardrails review`

Can be run manually or via cron/heartbeat.

## Files Generated

- **GUARDRAILS.md** - The main guardrails document (workspace root)
- **guardrails-config.json** - Machine-readable config for monitoring (workspace root)

## Notes

- This skill only helps _create_ guardrails - enforcement is up to the agent
- Discovery (`discover.sh`) uses bash + jq; classification (`classify-risks.py`) uses Python standard library only
- Question generation and GUARDRAILS.md generation require an LLM — set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`
- Python scripts require the `requests` library (`pip install requests`)
- Discovery and classification are read-only operations
- Only `setup` and `review` modes write files, and only with user confirmation
