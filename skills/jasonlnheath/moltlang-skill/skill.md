# MoltLang Translator

slug: moltlang-skill
name: MoltLang Translator

AI-optimized language for efficient agent-to-agent communication. Reduces token usage by 50-70% for common AI operations.

## Summary

MoltLang is a compact language designed specifically for AI agents to communicate with each other efficiently. Instead of verbose English instructions like "Fetch data from the API using authentication with timeout 30 seconds," MoltLang expresses the same operation as `[OP:fetch][SRC:api][PARAM:auth][PARAM:timeout=30]` - reducing token count by 50-70%.

This means faster inference, lower API costs, and more context room for actual work rather than parsing language.

**Key Features:**

- 50-70% token reduction vs. natural language
- Bidirectional translation (English ↔ MoltLang)
- Built-in error handling patterns (try/catch, retry, log)
- Type safety and validation
- Async and parallel operation support
- Works via public API or install locally (pip/npm)

## Commands

molt - Translate English to MoltLang
unmolt - Translate MoltLang to English
list_tokens - List available tokens
validate_molt - Validate translation
get_efficiency - Calculate token efficiency

## Example

English: Fetch user data from the API using authentication
MoltLang: [OP:fetch][SRC:api][PARAM:auth]
Savings: 70%

## Links

GitHub: https://github.com/jasonlnheath/moltlang
API: https://moltlang.up.railway.app
Install: pip install moltlang
