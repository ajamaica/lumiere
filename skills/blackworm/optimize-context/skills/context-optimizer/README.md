# Context Optimizer Skill

This skill automatically manages conversation context by summarizing important information and cleaning up old messages to prevent context overflow and save tokens, using the configuration in `task_processing_config.json`.

## Features

- **Automatic Summarization**: Converts lengthy conversations into 10-20 key bullet points
- **Fact Extraction**: Identifies and preserves important facts and information
- **Memory Management**: Updates your main MEMORY.md with important facts
- **Scheduled Cleanup**: Automatically runs to maintain optimal context size
- **History Tracking**: Keeps track of context optimization activities
- **Configurable Settings**: Uses `task_processing_config.json` for customization
- **Output Optimization**: Prevents overflow and optimizes token usage

## How It Works

1. **Analysis**: Scans conversation history for important information
2. **Summarization**: Extracts key points and facts to remember based on configuration
3. **Preservation**: Saves important information to memory files
4. **Cleanup**: Removes old context while keeping essential information
5. **Optimization**: Prevents overflow and optimizes output results

## Configuration

All settings are stored in `task_processing_config.json`:

```json
{
  "context_optimization": {
    "enabled": true,
    "schedule": {
      "enabled": true,
      "interval_minutes": 60,
      "max_context_length": 50,
      "min_messages_for_optimization": 30
    },
    "summarization": {
      "max_bullet_points": 20,
      "include_facts": true,
      "preserve_important_info": true
    },
    "storage": {
      "summary_file_pattern": "context-summary-YYYY-MM-DD.md",
      "memory_file": "MEMORY.md",
      "backup_enabled": true
    },
    "cleanup": {
      "remove_old_context": true,
      "keep_recent_messages": 10,
      "auto_purge": true
    },
    "output_optimization": {
      "prevent_overflow": true,
      "token_saving_mode": true,
      "result_summarization": true
    }
  }
}
```

## Usage

### Manual Execution

Run the optimization manually using the provided script:

```bash
node skills/context-optimizer/run-optimization.js
```

### Integration

The skill can be integrated into automatic workflows that monitor context length and trigger optimization when needed.

## Files Created

- `memory/context-summary-YYYY-MM-DD.md`: Daily context summaries
- `MEMORY.md`: Updated with important facts (configurable)
- `task_processing_config.json`: Configuration for optimization settings

## Benefits

- Prevents context overflow in long conversations
- Reduces token usage by removing unnecessary context
- Preserves important information for future reference
- Maintains optimal performance of AI models
- Automatic optimization based on configuration
- Configurable settings to match your needs
