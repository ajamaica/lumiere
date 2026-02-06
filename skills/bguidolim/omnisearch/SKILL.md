---
name: omnisearch
description: |
  MANDATORY web search tool for current information, news, prices, facts, or any data not in your training.
  This is THE ONLY way to search the internet in this OpenClaw environment.
  ALWAYS use this skill when the user asks for web searches or when you need up-to-date information.
---

# OmniSearch Skill - Web Search Tool

## CRITICAL: When to Use This Skill

**ALWAYS use OmniSearch when:**

- User explicitly asks to "search", "google", "look up", "find online"
- User asks about current events, news, or recent developments
- User requests prices, product specs, reviews, or comparisons
- User asks "what's the latest..." or "what's happening with..."
- You need to verify current facts, statistics, or data
- User asks about people, companies, or organizations you don't know
- Information might have changed since your training cutoff
- User needs sources or citations for factual claims

**Examples of queries requiring OmniSearch:**

- "What's the weather in Hamburg today?"
- "Search for iPhone 16 reviews"
- "What happened in the tech industry this week?"
- "Find the current price of Bitcoin"
- "Look up restaurants near me"
- "What are people saying about the new Tesla model?"

## DO NOT Use OmniSearch When:

- Answering from your existing knowledge is sufficient and current
- User is asking for creative content, code, or analysis
- Question is about concepts, definitions, or timeless information

---

## How to Execute Search

**IMPORTANT**: Run the script from the omnisearch skill directory using the relative path `./scripts/omnisearch.sh`

### Method 1: Recommended (Wrapper Script)

Use the wrapper script for all searches:

```bash
# AI-enhanced search (includes summarization) - USE THIS FOR MOST QUERIES
./scripts/omnisearch.sh ai "your search query here"

# Raw web search results (when you need direct source material)
./scripts/omnisearch.sh web "your search query here"
```

**Available providers:**

- **ai** type: `perplexity` (default - recommended for most queries)
- **web** type: `perplexity` (default), `brave`, `kagi`, `tavily`, `exa`

**Optional provider override:**

```bash
./scripts/omnisearch.sh ai "query" perplexity
./scripts/omnisearch.sh web "query" brave
./scripts/omnisearch.sh web "query" kagi
./scripts/omnisearch.sh web "query" tavily
./scripts/omnisearch.sh web "query" exa
```

**Practical examples:**

```bash
# Current weather
./scripts/omnisearch.sh ai "weather in Hamburg today"

# Product research
./scripts/omnisearch.sh web "iPhone 16 Pro reviews 2024"

# News search
./scripts/omnisearch.sh ai "latest AI developments this week"

# Price comparison
./scripts/omnisearch.sh web "DJI Mini 4 Pro price Germany" brave

# Research with premium provider
./scripts/omnisearch.sh web "machine learning papers 2024" kagi
```

### Method 2: Fallback (Direct mcporter)

Only use if the wrapper script fails:

```bash
mcporter call omnisearch.ai_search query="your search query" provider="perplexity"
mcporter call omnisearch.web_search query="your search query" provider="brave"
```

---

## Response Format

After receiving search results, ALWAYS:

1. **Summarize**: Present 2-5 key bullet points with the most relevant findings
2. **Cite sources**: Include 2-6 source URLs formatted as clickable links
3. **Add context**: Note if information is time-sensitive or has low confidence
4. **Answer directly**: Don't just dump results - synthesize and answer the user's question

**Example response structure:**

```
Based on my search, here's what I found:

- [Key finding 1]
- [Key finding 2]
- [Key finding 3]

Sources:
- [Title 1](URL1)
- [Title 2](URL2)

Note: This information is from [date/timeframe] and may change.
```

---

## Search Query Best Practices

- Keep queries concise and specific (3-8 words ideal)
- Use natural language, not keyword stuffing
- Include location when relevant: "restaurants Hamburg"
- Include timeframe when needed: "iPhone 16 reviews 2024"
- For prices, include currency/region if specific: "iPhone 16 price Germany"

---

## Troubleshooting

**If the wrapper script fails:**

1. Check if you're in the correct directory (should contain `scripts/` folder)
2. Verify the script has execution permissions: `chmod +x ./scripts/omnisearch.sh`
3. Try the fallback method (direct mcporter call)
4. Check if mcporter is properly installed and configured

**Common issues:**

- **"command not found"**: Script path is incorrect or you're not in the skill directory
- **"No such file"**: The script may not have been copied to `scripts/` folder yet
- **Empty results**: Try different provider or rephrase query

**Query formatting:**

- Queries with spaces are automatically handled (no need to escape)
- Use quotes in the command: `./scripts/omnisearch.sh ai "query with spaces"`
- Special characters should work fine within the quoted string

---

## Important Notes

- **Directory structure**: This SKILL.md file is in the omnisearch skill folder, with the script in `./scripts/omnisearch.sh` relative to this file
- **Script validation**: The wrapper script automatically validates that a query is provided and will show usage help if missing
- **Provider selection**:
  - **Perplexity** (default): Best for AI-enhanced results with summarization and context
  - **Brave**: Good for privacy-focused, unfiltered web results
  - **Kagi**: Premium search with advanced filtering and ranking
  - **Tavily**: Optimized for research and comprehensive coverage
  - **Exa**: Semantic search with AI-powered relevance
- This is a LOCAL tool - it runs on this OpenClaw instance
- ALWAYS run the search immediately when user requests it - don't ask permission
- The wrapper script (omnisearch.sh) is designed to work reliably even with basic LLMs
