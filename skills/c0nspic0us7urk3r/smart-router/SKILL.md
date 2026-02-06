---
name: smart-router
description: >
  Expertise-aware model router with semantic domain scoring, context-overflow protection,
  and security redaction. Automatically selects the optimal AI model using weighted
  expertise scoring (Feb 2026 benchmarks). Supports Claude, GPT, Gemini, Grok with
  automatic fallback chains, HITL gates, and cost optimization.
author: c0nSpIc0uS7uRk3r
version: 2.1.0
license: MIT
metadata:
  openclaw:
    requires:
      bins: ['python3']
      env: ['ANTHROPIC_API_KEY']
    optional_env: ['GOOGLE_API_KEY', 'OPENAI_API_KEY', 'XAI_API_KEY']
  features:
    - Semantic domain detection
    - Expertise-weighted scoring (0-100)
    - Risk-based mandatory routing
    - Context overflow protection (>150K → Gemini)
    - Security credential redaction
    - Circuit breaker with persistent state
    - HITL gate for low-confidence routing
  benchmarks:
    source: 'Feb 2026 MLOC Analysis'
    models:
      - 'Claude Opus 4.5: SWE-bench 80.9%'
      - 'GPT-5.2: AIME 100%, Control Flow 22 errors/MLOC'
      - 'Gemini 3 Pro: Concurrency 69 issues/MLOC'
---

# A.I. Smart-Router

Intelligently route requests to the optimal AI model using tiered classification with automatic fallback handling and cost optimization.

## How It Works (Silent by Default)

The router operates transparently—users send messages normally and get responses from the best model for their task. No special commands needed.

**Optional visibility**: Include `[show routing]` in any message to see the routing decision.

## Tiered Classification System

The router uses a three-tier decision process:

```
┌─────────────────────────────────────────────────────────────────┐
│                    TIER 1: INTENT DETECTION                      │
│  Classify the primary purpose of the request                     │
├─────────────────────────────────────────────────────────────────┤
│  CODE        │ ANALYSIS    │ CREATIVE   │ REALTIME  │ GENERAL   │
│  write/debug │ research    │ writing    │ news/live │ Q&A/chat  │
│  refactor    │ explain     │ stories    │ X/Twitter │ translate │
│  review      │ compare     │ brainstorm │ prices    │ summarize │
└──────┬───────┴──────┬──────┴─────┬──────┴─────┬─────┴─────┬─────┘
       │              │            │            │           │
       ▼              ▼            ▼            ▼           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  TIER 2: COMPLEXITY ESTIMATION                   │
├─────────────────────────────────────────────────────────────────┤
│  SIMPLE (Tier $)        │ MEDIUM (Tier $$)    │ COMPLEX (Tier $$$)│
│  • One-step task        │ • Multi-step task   │ • Deep reasoning  │
│  • Short response OK    │ • Some nuance       │ • Extensive output│
│  • Factual lookup       │ • Moderate context  │ • Critical task   │
│  → Haiku/Flash          │ → Sonnet/Grok/GPT   │ → Opus/GPT-5      │
└──────────────────────────┴─────────────────────┴───────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                TIER 3: SPECIAL CASE OVERRIDES                    │
├─────────────────────────────────────────────────────────────────┤
│  CONDITION                           │ OVERRIDE TO              │
│  ─────────────────────────────────────┼─────────────────────────│
│  Context >100K tokens                │ → Gemini Pro (1M ctx)    │
│  Context >500K tokens                │ → Gemini Pro ONLY        │
│  Needs real-time data                │ → Grok (regardless)      │
│  Image/vision input                  │ → Opus or Gemini Pro     │
│  User explicit override              │ → Requested model        │
└──────────────────────────────────────┴──────────────────────────┘
```

## Intent Detection Patterns

### CODE Intent

- Keywords: write, code, debug, fix, refactor, implement, function, class, script, API, bug, error, compile, test, PR, commit
- File extensions mentioned: .py, .js, .ts, .go, .rs, .java, etc.
- Code blocks in input

### ANALYSIS Intent

- Keywords: analyze, explain, compare, research, understand, why, how does, evaluate, assess, review, investigate, examine
- Long-form questions
- "Help me understand..."

### CREATIVE Intent

- Keywords: write (story/poem/essay), create, brainstorm, imagine, design, draft, compose
- Fiction/narrative requests
- Marketing/copy requests

### REALTIME Intent

- Keywords: now, today, current, latest, trending, news, happening, live, price, score, weather
- X/Twitter mentions
- Stock/crypto tickers
- Sports scores

### GENERAL Intent (Default)

- Simple Q&A
- Translations
- Summaries
- Conversational

### MIXED Intent (Multiple Intents Detected)

When a request contains multiple clear intents (e.g., "Write code to analyze this data and explain it creatively"):

1. **Identify primary intent** — What's the main deliverable?
2. **Route to highest-capability model** — Mixed tasks need versatility
3. **Default to COMPLEX complexity** — Multi-intent = multi-step

**Examples:**

- "Write code AND explain how it works" → CODE (primary) + ANALYSIS → Route to Opus
- "Summarize this AND what's the latest news on it" → REALTIME takes precedence → Grok
- "Creative story using real current events" → REALTIME + CREATIVE → Grok (real-time wins)

## Language Handling

**Non-English requests** are handled normally — all supported models have multilingual capabilities:

| Model             | Non-English Support        |
| ----------------- | -------------------------- |
| Opus/Sonnet/Haiku | Excellent (100+ languages) |
| GPT-5             | Excellent (100+ languages) |
| Gemini Pro/Flash  | Excellent (100+ languages) |
| Grok              | Good (major languages)     |

**Intent detection still works** because:

- Keyword patterns include common non-English equivalents
- Code intent detected by file extensions, code blocks (language-agnostic)
- Complexity estimated by query length (works across languages)

**Edge case:** If intent unclear due to language, default to GENERAL intent with MEDIUM complexity.

## Complexity Signals

### Simple Complexity ($)

- Short query (<50 words)
- Single question mark
- "Quick question", "Just tell me", "Briefly"
- Yes/no format
- Unit conversions, definitions

### Medium Complexity ($$)

- Moderate query (50-200 words)
- Multiple aspects to address
- "Explain", "Describe", "Compare"
- Some context provided

### Complex Complexity ($$$)

- Long query (>200 words) or complex task
- "Step by step", "Thoroughly", "In detail"
- Multi-part questions
- Critical/important qualifier
- Research, analysis, or creative work

## Routing Matrix

| Intent       | Simple | Medium | Complex |
| ------------ | ------ | ------ | ------- |
| **CODE**     | Sonnet | Opus   | Opus    |
| **ANALYSIS** | Flash  | GPT-5  | Opus    |
| **CREATIVE** | Sonnet | Opus   | Opus    |
| **REALTIME** | Grok   | Grok   | Grok-3  |
| **GENERAL**  | Flash  | Sonnet | Opus    |

## Token Exhaustion & Automatic Model Switching

When a model becomes unavailable mid-session (token quota exhausted, rate limit hit, API error), the router automatically switches to the next best available model and **notifies the user**.

### Notification Format

When a model switch occurs due to exhaustion, the user receives a notification:

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ MODEL SWITCH NOTICE                                         │
│                                                                  │
│  Your request could not be completed on claude-opus-4-5         │
│  (reason: token quota exhausted).                               │
│                                                                  │
│  ✅ Request completed using: anthropic/claude-sonnet-4-5        │
│                                                                  │
│  The response below was generated by the fallback model.        │
└─────────────────────────────────────────────────────────────────┘
```

### Switch Reasons

| Reason                    | Description                       |
| ------------------------- | --------------------------------- |
| `token quota exhausted`   | Daily/monthly token limit reached |
| `rate limit exceeded`     | Too many requests per minute      |
| `context window exceeded` | Input too large for model         |
| `API timeout`             | Model took too long to respond    |
| `API error`               | Provider returned an error        |
| `model unavailable`       | Model temporarily offline         |

### Implementation

```python
def execute_with_fallback(primary_model: str, fallback_chain: list[str], request: str) -> Response:
    """
    Execute request with automatic fallback and user notification.
    """
    attempted_models = []
    switch_reason = None

    # Try primary model first
    models_to_try = [primary_model] + fallback_chain

    for model in models_to_try:
        try:
            response = call_model(model, request)

            # If we switched models, prepend notification
            if attempted_models:
                notification = build_switch_notification(
                    failed_model=attempted_models[0],
                    reason=switch_reason,
                    success_model=model
                )
                return Response(
                    content=notification + "\n\n---\n\n" + response.content,
                    model_used=model,
                    switched=True
                )

            return Response(content=response.content, model_used=model, switched=False)

        except TokenQuotaExhausted:
            attempted_models.append(model)
            switch_reason = "token quota exhausted"
            log_fallback(model, switch_reason)
            continue

        except RateLimitExceeded:
            attempted_models.append(model)
            switch_reason = "rate limit exceeded"
            log_fallback(model, switch_reason)
            continue

        except ContextWindowExceeded:
            attempted_models.append(model)
            switch_reason = "context window exceeded"
            log_fallback(model, switch_reason)
            continue

        except APITimeout:
            attempted_models.append(model)
            switch_reason = "API timeout"
            log_fallback(model, switch_reason)
            continue

        except APIError as e:
            attempted_models.append(model)
            switch_reason = f"API error: {e.code}"
            log_fallback(model, switch_reason)
            continue

    # All models exhausted
    return build_exhaustion_error(attempted_models)


def build_switch_notification(failed_model: str, reason: str, success_model: str) -> str:
    """Build user-facing notification when model switch occurs."""
    return f"""⚠️ **MODEL SWITCH NOTICE**

Your request could not be completed on `{failed_model}` (reason: {reason}).

✅ **Request completed using:** `{success_model}`

The response below was generated by the fallback model."""


def build_exhaustion_error(attempted_models: list[str]) -> Response:
    """Build error when all models are exhausted."""
    models_tried = ", ".join(attempted_models)
    return Response(
        content=f"""❌ **REQUEST FAILED**

Unable to complete your request. All available models have been exhausted.

**Models attempted:** {models_tried}

**What you can do:**
1. **Wait** — Token quotas typically reset hourly or daily
2. **Simplify** — Try a shorter or simpler request
3. **Check status** — Run `/router status` to see model availability

If this persists, your human may need to check API quotas or add additional providers.""",
        model_used=None,
        switched=False,
        failed=True
    )
```

### Fallback Priority for Token Exhaustion

When a model is exhausted, the router selects the next best model for the **same task type**:

| Original Model | Fallback Priority (same capability)     |
| -------------- | --------------------------------------- |
| Opus           | Sonnet → GPT-5 → Grok-3 → Gemini Pro    |
| Sonnet         | GPT-5 → Grok-3 → Opus → Haiku           |
| GPT-5          | Sonnet → Opus → Grok-3 → Gemini Pro     |
| Gemini Pro     | Flash → GPT-5 → Opus → Sonnet           |
| Grok-2/3       | (warn: no real-time fallback available) |

### User Acknowledgment

After a model switch, the agent should note in the response that:

1. The original model was unavailable
2. Which model actually completed the request
3. The response quality may differ from the original model's typical output

This ensures transparency and sets appropriate expectations.

### Streaming Responses with Fallback

When using streaming responses, fallback handling requires special consideration:

```python
async def execute_with_streaming_fallback(primary_model: str, fallback_chain: list[str], request: str):
    """
    Handle streaming responses with mid-stream fallback.

    If a model fails DURING streaming (not before), the partial response is lost.
    Strategy: Don't start streaming until first chunk received successfully.
    """
    models_to_try = [primary_model] + fallback_chain

    for model in models_to_try:
        try:
            # Test with non-streaming ping first (optional, adds latency)
            # await test_model_availability(model)

            # Start streaming
            stream = await call_model_streaming(model, request)
            first_chunk = await stream.get_first_chunk(timeout=10_000)  # 10s timeout for first chunk

            # If we got here, model is responding — continue streaming
            yield first_chunk
            async for chunk in stream:
                yield chunk
            return  # Success

        except (FirstChunkTimeout, StreamError) as e:
            log_fallback(model, str(e))
            continue  # Try next model

    # All models failed
    yield build_exhaustion_error(models_to_try)
```

**Key insight:** Wait for the first chunk before committing to a model. If the first chunk times out, fall back before any partial response is shown to the user.

### Retry Timing Configuration

```python
RETRY_CONFIG = {
    "initial_timeout_ms": 30_000,     # 30s for first attempt
    "fallback_timeout_ms": 20_000,    # 20s for fallback attempts (faster fail)
    "max_retries_per_model": 1,       # Don't retry same model
    "backoff_multiplier": 1.5,        # Not used (no same-model retry)
    "circuit_breaker_threshold": 3,   # Failures before skipping model entirely
    "circuit_breaker_reset_ms": 300_000  # 5 min before trying failed model again
}
```

**Circuit breaker:** If a model fails 3 times in 5 minutes, skip it entirely for the next 5 minutes. This prevents repeatedly hitting a down service.

## Fallback Chains

When the preferred model fails (rate limit, API down, error), cascade to the next option:

### Code Tasks

```
Opus → Sonnet → GPT-5 → Gemini Pro
```

### Analysis Tasks

```
Opus → GPT-5 → Gemini Pro → Sonnet
```

### Creative Tasks

```
Opus → GPT-5 → Sonnet → Gemini Pro
```

### Real-time Tasks

```
Grok-2 → Grok-3 → (warn: no real-time fallback)
```

### General Tasks

```
Flash → Haiku → Sonnet → GPT-5
```

### Long Context (Tiered by Size)

```
┌─────────────────────────────────────────────────────────────────┐
│                  LONG CONTEXT FALLBACK CHAIN                     │
├─────────────────────────────────────────────────────────────────┤
│  TOKEN COUNT        │ FALLBACK CHAIN                            │
│  ───────────────────┼───────────────────────────────────────────│
│  128K - 200K        │ Opus (200K) → Sonnet (200K) → Gemini Pro  │
│  200K - 1M          │ Gemini Pro → Flash (1M) → ERROR_MESSAGE   │
│  > 1M               │ ERROR_MESSAGE (no model supports this)    │
└─────────────────────┴───────────────────────────────────────────┘
```

**Implementation:**

```python
def handle_long_context(token_count: int, available_models: dict) -> str | ErrorMessage:
    """Route long-context requests with graceful degradation."""

    # Tier 1: 128K - 200K tokens (Opus/Sonnet can handle)
    if token_count <= 200_000:
        for model in ["opus", "sonnet", "haiku", "gemini-pro", "flash"]:
            if model in available_models and get_context_limit(model) >= token_count:
                return model

    # Tier 2: 200K - 1M tokens (only Gemini)
    elif token_count <= 1_000_000:
        for model in ["gemini-pro", "flash"]:
            if model in available_models:
                return model

    # Tier 3: > 1M tokens (nothing available)
    # Fall through to error

    # No suitable model found — return helpful error
    return build_context_error(token_count, available_models)


def build_context_error(token_count: int, available_models: dict) -> ErrorMessage:
    """Build a helpful error message when no model can handle the input."""

    # Find the largest available context window
    max_available = max(
        (get_context_limit(m) for m in available_models),
        default=0
    )

    # Determine what's missing
    missing_models = []
    if "gemini-pro" not in available_models and "flash" not in available_models:
        missing_models.append("Gemini Pro/Flash (1M context)")
    if token_count <= 200_000 and "opus" not in available_models:
        missing_models.append("Opus (200K context)")

    # Format token count for readability
    if token_count >= 1_000_000:
        token_display = f"{token_count / 1_000_000:.1f}M"
    else:
        token_display = f"{token_count // 1000}K"

    return ErrorMessage(
        title="Context Window Exceeded",
        message=f"""Your input is approximately **{token_display} tokens**, which exceeds the context window of all currently available models.

**Required:** Gemini Pro (1M context) {"— currently unavailable" if "gemini-pro" not in available_models else ""}
**Your max available:** {max_available // 1000}K tokens

**Options:**
1. **Wait and retry** — Gemini may be temporarily down
2. **Reduce input size** — Remove unnecessary content to fit within {max_available // 1000}K tokens
3. **Split into chunks** — I can process your input sequentially in smaller pieces

Would you like me to help split this into manageable chunks?""",

        recoverable=True,
        suggested_action="split_chunks"
    )
```

**Example Error Output:**

```
⚠️ Context Window Exceeded

Your input is approximately **340K tokens**, which exceeds the context
window of all currently available models.

Required: Gemini Pro (1M context) — currently unavailable
Your max available: 200K tokens

Options:
1. Wait and retry — Gemini may be temporarily down
2. Reduce input size — Remove unnecessary content to fit within 200K tokens
3. Split into chunks — I can process your input sequentially in smaller pieces

Would you like me to help split this into manageable chunks?
```

## Dynamic Model Discovery

The router auto-detects available providers at runtime:

```
1. Check configured auth profiles
2. Build available model list from authenticated providers
3. Construct routing table using ONLY available models
4. If preferred model unavailable, use best available alternative
```

**Example**: If only Anthropic and Google are configured:

- Code tasks → Opus (Anthropic available ✓)
- Real-time tasks → ⚠️ No Grok → Fall back to Opus + warn user
- Long docs → Gemini Pro (Google available ✓)

## Cost Optimization

The router considers cost when complexity is LOW:

| Model         | Cost Tier | Use When                      |
| ------------- | --------- | ----------------------------- |
| Gemini Flash  | $         | Simple tasks, high volume     |
| Claude Haiku  | $         | Simple tasks, quick responses |
| Claude Sonnet | $$        | Medium complexity             |
| Grok 2        | $$        | Real-time needs only          |
| GPT-5         | $$        | General fallback              |
| Gemini Pro    | $$$       | Long context needs            |
| Claude Opus   | $$$$      | Complex/critical tasks        |

**Rule**: Never use Opus ($$$) for tasks that Flash ($) can handle.

## User Controls

### Show Routing Decision

Add `[show routing]` to any message:

```
[show routing] What's the weather in NYC?
```

Output includes:

```
[Routed → xai/grok-2-latest | Reason: REALTIME intent detected | Fallback: none available]
```

### Force Specific Model

Explicit overrides:

- "use grok: ..." → Forces Grok
- "use claude: ..." → Forces Opus
- "use gemini: ..." → Forces Gemini Pro
- "use flash: ..." → Forces Gemini Flash
- "use gpt: ..." → Forces GPT-5

### Check Router Status

Ask: "router status" or "/router" to see:

- Available providers
- Configured models
- Current routing table
- Recent routing decisions

## Implementation Notes

### For Agent Implementation

When processing a request:

```
1. DETECT available models (check auth profiles)
2. CLASSIFY intent (code/analysis/creative/realtime/general)
3. ESTIMATE complexity (simple/medium/complex)
4. CHECK special cases (context size, vision, explicit override)
5. FILTER by cost tier based on complexity ← BEFORE model selection
6. SELECT model from filtered pool using routing matrix
7. VERIFY model available, else use fallback chain (also cost-filtered)
8. EXECUTE request with selected model
9. IF failure, try next in fallback chain
10. LOG routing decision (for debugging)
```

### Cost-Aware Routing Flow (Critical Order)

```python
def route_with_fallback(request):
    """
    Main routing function with CORRECT execution order.
    Cost filtering MUST happen BEFORE routing table lookup.
    """

    # Step 1: Discover available models
    available_models = discover_providers()

    # Step 2: Classify intent
    intent = classify_intent(request)

    # Step 3: Estimate complexity
    complexity = estimate_complexity(request)

    # Step 4: Check special-case overrides (these bypass cost filtering)
    if user_override := get_user_model_override(request):
        return execute_with_fallback(user_override, [])  # No cost filter for explicit override

    if token_count > 128_000:
        return handle_long_context(token_count, available_models)  # Special handling

    if needs_realtime(request):
        return execute_with_fallback("grok-2", ["grok-3"])  # Realtime bypasses cost

    # ┌─────────────────────────────────────────────────────────────┐
    # │  STEP 5: FILTER BY COST TIER — THIS MUST COME FIRST!       │
    # │                                                             │
    # │  Cost filtering happens BEFORE the routing table lookup,   │
    # │  NOT after. This ensures "what's 2+2?" never considers     │
    # │  Opus even momentarily.                                    │
    # └─────────────────────────────────────────────────────────────┘

    allowed_tiers = get_allowed_tiers(complexity)
    # SIMPLE  → ["$"]
    # MEDIUM  → ["$", "$$"]
    # COMPLEX → ["$", "$$", "$$$"]

    cost_filtered_models = {
        model: meta for model, meta in available_models.items()
        if COST_TIERS.get(model) in allowed_tiers
    }

    # Step 6: NOW select from cost-filtered pool using routing preferences
    preferences = ROUTING_PREFERENCES.get((intent, complexity), [])

    for model in preferences:
        if model in cost_filtered_models:  # Only consider cost-appropriate models
            selected_model = model
            break
    else:
        # No preferred model in cost-filtered pool — use cheapest available
        selected_model = select_cheapest(cost_filtered_models)

    # Step 7: Build cost-filtered fallback chain
    task_type = get_task_type(intent, complexity)
    full_chain = MASTER_FALLBACK_CHAINS.get(task_type, [])
    filtered_chain = [m for m in full_chain if m in cost_filtered_models and m != selected_model]

    # Step 8-10: Execute with fallback + logging
    return execute_with_fallback(selected_model, filtered_chain)


def get_allowed_tiers(complexity: str) -> list[str]:
    """Return allowed cost tiers for a given complexity level."""
    return {
        "SIMPLE":  ["$"],                      # Budget only — no exceptions
        "MEDIUM":  ["$", "$$"],                # Budget + standard
        "COMPLEX": ["$", "$$", "$$$", "$$$$"], # All tiers — complex tasks deserve the best
    }.get(complexity, ["$", "$$"])


# Example flow for "what's 2+2?":
#
# 1. available_models = {opus, sonnet, haiku, flash, grok-2, ...}
# 2. intent = GENERAL
# 3. complexity = SIMPLE
# 4. (no special cases)
# 5. allowed_tiers = ["$"]  ← SIMPLE means $ only
#    cost_filtered_models = {haiku, flash, grok-2}  ← Opus/Sonnet EXCLUDED
# 6. preferences for (GENERAL, SIMPLE) = [flash, haiku, grok-2, sonnet]
#    first match in cost_filtered = flash ✓
# 7. fallback_chain = [haiku, grok-2]  ← Also cost-filtered
# 8. execute with flash
#
# Result: Opus is NEVER considered, not even momentarily.
```

### Cost Optimization: Two Approaches

```
┌─────────────────────────────────────────────────────────────────┐
│           COST OPTIMIZATION IMPLEMENTATION OPTIONS               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  APPROACH 1: Explicit filter_by_cost() (shown above)            │
│  ─────────────────────────────────────────────────────────────  │
│  • Calls get_allowed_tiers(complexity) explicitly               │
│  • Filters available_models BEFORE routing table lookup         │
│  • Most defensive — impossible to route wrong tier              │
│  • Recommended for security-critical deployments                │
│                                                                  │
│  APPROACH 2: Preference ordering (implicit)                     │
│  ─────────────────────────────────────────────────────────────  │
│  • ROUTING_PREFERENCES lists cheapest capable models first      │
│  • For SIMPLE tasks: [flash, haiku, grok-2, sonnet]            │
│  • First available match wins → naturally picks cheapest        │
│  • Simpler code, relies on correct preference ordering          │
│                                                                  │
│  This implementation uses BOTH for defense-in-depth:            │
│  • Preference ordering provides first line of cost awareness    │
│  • Explicit filter_by_cost() guarantees tier enforcement        │
│                                                                  │
│  For alternative implementations that rely solely on            │
│  preference ordering, see references/models.md for the          │
│  filter_by_cost() function if explicit enforcement is needed.   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Spawning with Different Models

Use sessions_spawn for model routing:

```
sessions_spawn(
  task: "user's request",
  model: "selected/model-id",
  label: "task-type-query"
)
```

## Security

- Never send sensitive data to untrusted models
- API keys handled via environment/auth profiles only
- See `references/security.md` for full security guidance

## Model Details

See `references/models.md` for detailed capabilities and pricing.
