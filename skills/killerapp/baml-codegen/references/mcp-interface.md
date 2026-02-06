# MCP Interface & Query Strategy

This document describes how the baml-codegen skill queries the BoundaryML repositories via Model Context Protocol (MCP) servers to ensure fresh, validated patterns.

## MCP Servers

### Required: baml_Docs

**Repository**: `BoundaryML/baml` (official documentation)

**Purpose**: Core BAML specification, syntax reference, validation

**Tools**:

- `mcp__baml_Docs__fetch_baml_documentation`: Fetch complete README
- `mcp__baml_Docs__search_baml_documentation`: Semantic search within docs
- `mcp__baml_Docs__search_baml_code`: GitHub code search in repository
- `mcp__baml_Docs__fetch_generic_url_content`: Fetch specific file by URL

### Optional: baml_Examples

**Repository**: `BoundaryML/baml-examples` (production patterns)

**Purpose**: Real-world pattern examples, framework integrations

**Tools**:

- `mcp__baml_Examples__fetch_baml_examples_readme`: Fetch examples README
- `mcp__baml_Examples__search_baml_examples_documentation`: Search examples docs
- `mcp__baml_Examples__search_baml_examples_code`: Search example code
- `mcp__baml_Examples__fetch_generic_url_content`: Fetch example files

## Query Workflow

### Phase 1: Pattern Discovery

**Goal**: Find relevant patterns from real-world examples

```
1. Analyze user requirements
2. Determine pattern category (extraction/classification/rag/agents)
3. Execute: mcp__baml_Examples__search_baml_examples_code
   Query: "{category} extension:baml"
   Returns: List of matching .baml files
4. Score results by relevance (keyword matching, file names)
5. Select top 2-3 candidates
```

**Example Query**:

```javascript
mcp__baml_Examples__search_baml_examples_code({
  query: 'invoice extraction extension:baml',
  page: 1,
})
// Returns: invoice_extractor.baml, receipt_parser.baml, etc.
```

**Observable Output**: `🔍 Found 3 patterns from BoundaryML/baml-examples`

### Phase 2: Pattern Fetch

**Goal**: Retrieve full content of matched patterns

```
1. For each top result from Phase 1:
2. Execute: mcp__baml_Examples__fetch_generic_url_content
   Input: Raw GitHub URL from search result
   Returns: Complete .baml file content
3. Parse file for:
   - Type definitions (class, enum)
   - Function signatures
   - Prompt templates
   - Client configurations
```

**Example Query**:

```javascript
mcp__baml_Examples__fetch_generic_url_content({
  url: 'https://github.com/BoundaryML/baml-examples/blob/main/invoice_extractor.baml',
})
// Returns: Full file content
```

**Observable Output**: `✅ Fetched invoice_extractor.baml from BoundaryML/baml-examples`

### Phase 3: Syntax Validation

**Goal**: Verify example patterns use current BAML syntax

```
1. Extract syntax features from example (e.g., client blocks, function syntax)
2. Execute: mcp__baml_Docs__search_baml_documentation
   Query: "syntax {feature}"
   Returns: Canonical syntax specification
3. Compare example syntax vs. canonical docs
4. If mismatch:
   - Query: mcp__baml_Docs__fetch_generic_url_content(syntax_reference_url)
   - Modernize: Update example pattern to current spec
   - Log: "🔧 Modernized {N} deprecated patterns"
5. If match:
   - Log: "✅ Validated against BoundaryML/baml - syntax current"
```

**Example Query**:

```javascript
mcp__baml_Docs__search_baml_documentation({
  query: 'client syntax anthropic',
  page: 1,
})
// Returns: Current client block specification
```

**Observable Output**: `✅ Validated against BoundaryML/baml` or `🔧 Modernized 2 patterns`

### Phase 4: Code Generation

**Goal**: Adapt validated patterns to user requirements

```
1. Use validated pattern as template
2. Apply user-specific requirements:
   - Field names from requirements
   - Custom descriptions
   - Specific model preferences
   - Framework integration needs
3. Generate complete .baml file
4. Generate tests
5. Generate integration code
```

### Phase 5: Error Recovery

**Goal**: Auto-fix validation errors using canonical docs

```
IF validation fails:
1. Parse error message
2. Execute: mcp__baml_Docs__search_baml_documentation
   Query: "{error_type} syntax"
   Returns: Fix guidance
3. Execute: mcp__baml_Docs__fetch_generic_url_content
   Input: Specific syntax reference URL
   Returns: Current specification
4. Auto-fix: Update generated code to match spec
5. Retry validation (max 2 attempts)
6. Log: "🔧 Fixed {N} errors using BoundaryML/baml docs"
```

**Example**:

```
Error: "Invalid client block syntax"
→ Query: "client syntax specification"
→ Fetch: docs/reference/client-blocks.md
→ Fix: Update client { ... } to match current spec
→ Retry validation
→ Output: "🔧 Fixed 1 error using BoundaryML/baml docs"
```

## MCP Tool Reference

### High Token Cost (Use Sparingly)

**`fetch_baml_documentation`** (~3000 tokens)

- Use: General context, fallback when search fails
- Avoid: Routine queries (too broad)

**`fetch_generic_url_content`** (500-2000 tokens)

- Use: Specific file retrieval
- Pattern: After search identifies target file

### Medium Token Cost (Preferred)

**`search_baml_documentation`** (200-1000 tokens)

- Use: Finding specific features, syntax validation
- Pattern: Targeted queries with specific terms

**`search_baml_code`** (~500 tokens per page)

- Use: Finding implementation examples
- Pattern: Pattern discovery phase
- Note: Returns 30 results per page

### Query Optimization

**Best Practices**:

1. **Search before fetch**: Use search to find targets, then fetch specific files
2. **Specific queries**: "client syntax" not "BAML syntax"
3. **Extension filters**: "extension:baml" to filter file types
4. **Pagination**: Start with page 1, fetch more only if needed
5. **Combine results**: Make multiple targeted queries vs. one broad query

**Anti-patterns**:

- ❌ Fetching full README for every query
- ❌ Broad searches returning 100+ results
- ❌ Repeated queries for same content
- ❌ Fetching files without searching first

## Caching Strategy

### Multi-Tier Architecture

**Tier 1: Embedded Cache** (Never expires)

- Content: Core syntax patterns
- Size: ~500 tokens
- Use: Offline fallback
- Update: Manual with skill updates

**Tier 2: Session Cache** (15 min TTL)

- Content: Recently queried patterns
- Size: ~10 patterns, ~5000 tokens
- Eviction: LRU (Least Recently Used)
- Use: Avoid duplicate queries in same session

**Tier 3: Persistent Cache** (7 day TTL)

- Content: Top 20 most-used patterns
- Size: ~20 patterns, ~15000 tokens
- Update: Refreshed weekly
- Use: Common patterns without MCP query

**Tier 4: Live MCP** (No cache)

- Content: Direct queries to GitHub
- Freshness: Real-time
- Use: Primary source, always current

### Cache Lookup Flow

```
1. Check Tier 2 (Session) - Hit? Return immediately
2. Check Tier 3 (Persistent) - Hit? Return, promote to Tier 2
3. Query Tier 4 (MCP) - Store in Tier 2 and Tier 3
4. If MCP fails: Fall back to Tier 1 (Embedded)
```

### Cache Invalidation

**Session End**:

- Clear Tier 2 completely
- Tier 3 persists across sessions

**7 Day Expiry**:

- Refresh Tier 3 from MCP
- Keep top 20 patterns by usage

**Commit Hash Change**:

- Detected via MCP repository metadata
- Invalidate all caches
- Requery patterns

**Manual Refresh**:

- User command: "refresh BAML patterns"
- Clear all tiers except Tier 1
- Repopulate from MCP

### Cache Key Design

**Format**: `{repository}:{category}:{pattern_name}:{commit_hash}`

**Example**: `baml-examples:extraction:invoice:a1b2c3d`

**Benefits**:

- Unique per pattern version
- Auto-invalidate on repository updates
- Support multiple repositories

## Observable Indicators

Always show users when MCP queries are executed:

**Success Indicators**:

- 🔍 "Found {X} patterns from BoundaryML/baml-examples"
- ✅ "Fetched {file} from BoundaryML/baml"
- ✅ "Validated against BoundaryML/baml - syntax current"
- 🔧 "Modernized {N} deprecated patterns from example"
- 🔧 "Fixed {N} errors using BoundaryML/baml docs"

**Fallback Indicators**:

- 📦 "Using cached pattern (MCP unavailable)"
- ⚠️ "MCP unavailable, using fallback templates"
- ℹ️ "Pattern from cache (validated 2 days ago)"

**Why Observable?**:

1. **Transparency**: Users know data freshness
2. **Debugging**: Easy to diagnose MCP issues
3. **Trust**: Clear when using live vs cached data
4. **Feedback**: Confirm queries are actually happening

## Error Handling

### MCP Server Unavailable

**Symptom**: Connection timeout, authentication failure

**Response**:

1. Fall back to Tier 3 → Tier 2 → Tier 1 caches
2. Use generic templates for pattern category
3. Warn user: "⚠️ MCP unavailable, using cached templates (validated 5 days ago)"
4. Continue with best-effort generation
5. Suggest: "Refresh cache when MCP available"

### Pattern Not Found

**Symptom**: No matching results from search

**Response**:

1. Broaden search query (remove filters)
2. Try alternate category patterns
3. Use generic template for category
4. Ask user for more specific requirements
5. Suggest similar patterns: "Found similar: {alternatives}"

### Invalid/Deprecated Syntax

**Symptom**: Validation fails, example uses old syntax

**Response**:

1. Auto-query canonical docs
2. Compare pattern syntax vs. current spec
3. Auto-modernize to current syntax
4. Retry validation
5. Report: "🔧 Modernized deprecated client block syntax"

### Rate Limiting

**Symptom**: HTTP 429 from GitHub API

**Response**:

1. Immediate fallback to cache
2. Exponential backoff for retry
3. Prioritize essential queries only
4. Warn user: "Rate limited, using cache"
5. Resume MCP queries after cooldown

## Performance Targets

**Query Latency**:

- Single search: <2s
- File fetch: <1s
- Full workflow (discover + fetch + validate): <5s

**Cache Hit Rates**:

- Session cache: >60% (same patterns, same session)
- Persistent cache: >40% (common patterns)
- Combined: >70% (avoid MCP query)

**Token Efficiency**:

- Average query: 300-800 tokens
- Full workflow: <3000 tokens
- With cache: <100 tokens

---

**References**:

- [MCP Specification](https://modelcontextprotocol.io)
- [BoundaryML Repository](https://github.com/BoundaryML/baml)
- [BAML Examples](https://github.com/BoundaryML/baml-examples)
