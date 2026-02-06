# LangCache Best Practices

Optimization techniques for effective semantic caching with Redis LangCache.

## 1. Choose the Right Similarity Threshold

The threshold directly impacts cache hit rate vs. relevance:

| Threshold | Hit Rate  | Relevance | Best For                                   |
| --------- | --------- | --------- | ------------------------------------------ |
| 0.98+     | Very Low  | Very High | Safety-critical, exact answers only        |
| 0.93-0.97 | Low       | High      | Factual Q&A, documentation lookups         |
| 0.88-0.92 | Medium    | Good      | General queries, support questions         |
| 0.83-0.87 | High      | Moderate  | Exploratory queries, suggestions           |
| < 0.83    | Very High | Low       | Not recommended (too many false positives) |

**Recommendation:** Start at `0.90` and adjust based on observed quality.

## 2. Use Attributes Strategically

### Partition by Model

Different models produce different responses. Always include the model:

```json
{ "attributes": { "model": "gpt-5.2" } }
```

### Partition by User (When Appropriate)

For personalized responses, include user ID:

```json
{ "attributes": { "user_id": "123" } }
```

For shared knowledge (FAQs, docs), omit user ID to maximize cache hits.

### Version Your Cache

When prompts or system behavior changes, bump the version:

```json
{ "attributes": { "version": "2.1" } }
```

This prevents stale responses from old prompt formats.

## 3. Normalize Prompts Before Caching

Semantic similarity helps, but normalizing prompts improves hit rates:

**Before storing/searching:**

- Trim whitespace
- Lowercase (if case doesn't matter)
- Remove filler words ("um", "uh", "please", "can you")
- Standardize punctuation

```python
def normalize_prompt(prompt):
    prompt = prompt.strip().lower()
    prompt = re.sub(r'\s+', ' ', prompt)  # Collapse whitespace
    prompt = re.sub(r'^(please |can you |could you )', '', prompt)
    return prompt
```

## 4. Don't Cache Everything

### Good Candidates for Caching

- **Factual queries:** "What is X?", "How does Y work?"
- **Documentation lookups:** "Show me the API for Z"
- **Repeated patterns:** Common skill invocations
- **Static information:** Help text, feature descriptions

### Bad Candidates for Caching

- **Time-sensitive:** "What's the weather?", "What's on my calendar?"
- **Context-dependent:** Responses that depend on conversation history
- **Personalized:** Responses tailored to user preferences/state
- **Creative:** Tasks where variation is desired
- **Stateful:** Responses that modify system state

## 5. Implement Cache-Aside Pattern

The standard pattern for integrating LangCache:

```python
async def get_response(prompt: str, context: dict) -> str:
    # 1. Normalize prompt
    normalized = normalize_prompt(prompt)

    # 2. Check cache
    cached = await langcache.search(
        prompt=normalized,
        similarity_threshold=0.9,
        attributes={"model": MODEL_ID}
    )

    if cached.hit:
        log_cache_hit(cached.similarity)
        return cached.response

    # 3. Call LLM on cache miss
    response = await llm.complete(prompt, context)

    # 4. Store in cache (async, don't block response)
    asyncio.create_task(
        langcache.store(
            prompt=normalized,
            response=response,
            attributes={"model": MODEL_ID}
        )
    )

    return response
```

## 6. Use Hybrid Search for Exact + Semantic

For maximum efficiency, check exact match first:

```json
{
  "prompt": "What is Redis?",
  "searchStrategies": ["exact", "semantic"],
  "similarityThreshold": 0.9
}
```

Exact matches are faster and guaranteed relevant. Semantic search is fallback.

## 7. Monitor and Tune

### Key Metrics to Track

- **Hit rate:** `cache_hits / total_requests`
- **Similarity distribution:** Histogram of similarity scores for hits
- **Miss reasons:** Why queries miss (no similar entry vs. below threshold)
- **Latency:** Cache lookup time vs. LLM call time

### Tuning Workflow

1. Start with threshold `0.90`
2. Log all cache hits with similarity scores
3. Review hits with similarity `0.85-0.92` - are they relevant?
4. If too many irrelevant hits: raise threshold
5. If too many misses on similar queries: lower threshold
6. Repeat weekly as usage patterns evolve

## 8. Handle Cache Invalidation

### Time-Based (TTL)

Configure TTL at the cache level for automatic expiration:

- Short TTL (hours): Fast-changing information
- Medium TTL (days): General knowledge
- Long TTL (weeks): Stable documentation

### Event-Based

Invalidate when underlying data changes:

```python
# When documentation is updated
await langcache.delete_query(attributes={"category": "docs", "version": "1.0"})
```

### Version-Based

Instead of deleting, bump the version attribute:

```python
# Old entries remain but won't match new searches
attributes = {"version": "2.0"}  # was "1.0"
```

## 9. Warm the Cache

For predictable queries, pre-populate the cache:

```python
# Warm cache with common questions
faqs = [
    ("What is OpenClaw?", "OpenClaw is an AI agent platform..."),
    ("How do I create a skill?", "To create a skill, create a SKILL.md file..."),
]

for prompt, response in faqs:
    await langcache.store(
        prompt=prompt,
        response=response,
        attributes={"category": "faq", "version": "1.0"}
    )
```

## 10. Cost-Benefit Analysis

### When Caching Saves Money

```
Savings = (LLM_cost_per_call × cache_hits) - LangCache_cost
```

Caching is worthwhile when:

- LLM calls are expensive (GPT-4, Claude Opus)
- Queries are repetitive
- Hit rate > 20-30% (depends on relative costs)

### When Caching Adds Complexity Without Benefit

- Low query volume (< 100/day)
- Highly unique queries (< 10% potential hit rate)
- Cheap LLM model (caching overhead not worth it)
- Real-time requirements where stale data is unacceptable
