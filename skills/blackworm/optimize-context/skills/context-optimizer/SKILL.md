# Context Optimizer Skill

Automatically summarizes conversation context and cleans up old messages to prevent context overflow and save tokens.

## Description

This skill periodically summarizes the conversation into 10-20 bullet points plus facts to remember, saves them to memory, then clears the old context while keeping only the summary.

## Triggers

- Manual activation: "optimize context", "clean context", "summarize and clear"
- Scheduled: Can be run periodically via cron to maintain optimal context size

## Process

1. Analyze current conversation context
2. Extract key points into 10-20 bullet points
3. Identify important facts to remember
4. Save summary to memory files
5. Clear old context while preserving essential information

## Files Used

- memory/context-summary-YYYY-MM-DD.md - Stores conversation summaries
- MEMORY.md - Updates with important facts
- memory/context-history.json - Tracks context optimization history

## Configuration

- Summary frequency (manual or scheduled)
- Number of bullet points to generate
- Retention period for context
