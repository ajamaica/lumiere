# Security Best Practices for Model Routing

Comprehensive security guidance for multi-model routing systems.

---

## Security Guarantees

This skill makes the following security guarantees:

| Guarantee                         | Status         | Verification                                        |
| --------------------------------- | -------------- | --------------------------------------------------- |
| No API keys stored in skill files | ✅ Enforced    | Grep for patterns; none found                       |
| Credentials via environment only  | ✅ Enforced    | Keys read from env/auth-profiles only               |
| Input sanitization before routing | ✅ Implemented | See [Input Sanitization](#input-sanitization)       |
| No arbitrary code execution       | ✅ By design   | See [Code Execution Safety](#code-execution-safety) |
| Rate limiting support             | ✅ Documented  | See [Rate Limiting](#rate-limiting-for-self-hosted) |

---

## API Key Handling

### ✅ DO

- Store API keys in OpenClaw auth profiles (`~/.openclaw/agents/<id>/agent/auth-profiles.json`)
- Use environment variables when needed (`ANTHROPIC_API_KEY`, `XAI_API_KEY`, etc.)
- Rotate keys periodically (quarterly recommended)
- Use separate keys for development vs production
- Monitor key usage for anomalies

### ❌ NEVER

- Hardcode API keys in skill files
- Commit keys to version control
- Share keys in chat messages
- Log keys in plaintext
- Store keys in SKILL.md or any skill file

### Key Storage Locations (Correct)

```
~/.openclaw/agents/main/agent/auth-profiles.json  ← Keys go here
~/.openclaw/openclaw.json                          ← Config only, no secrets
```

### Environment Variables (Alternative)

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export XAI_API_KEY="xai-..."
export GEMINI_API_KEY="AIza..."
```

---

## Data Classification Before Routing

### Level 1: PUBLIC

- General knowledge questions
- Public documentation
- Open source code
- News and current events

**Routing**: Any model OK

### Level 2: INTERNAL

- Business documents (non-confidential)
- Internal code (proprietary but not secret)
- Meeting notes
- Project plans

**Routing**: Trusted providers only (Anthropic, OpenAI, Google)

### Level 3: CONFIDENTIAL

- Customer data
- Financial records
- Strategic plans
- Unreleased products

**Routing**: Evaluate provider data policies first

### Level 4: RESTRICTED

- PII (names, SSN, addresses)
- Passwords, API keys, tokens
- Health records (PHI)
- Payment card data (PCI)

**Routing**: LOCAL MODELS ONLY or do not process

---

## Sensitive Data Detection

The router should scan for and BLOCK routing of:

### Automatic Block Patterns

```
API Keys:       sk-[a-zA-Z0-9]{20,}
                xai-[a-zA-Z0-9]{20,}
                AIza[a-zA-Z0-9]{35}
AWS Keys:       AKIA[A-Z0-9]{16}
Private Keys:   -----BEGIN.*PRIVATE KEY-----
SSN:            \d{3}-\d{2}-\d{4}
Credit Cards:   \d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}
```

### Warning Patterns (Prompt User)

```
Email addresses
Phone numbers
Physical addresses
Names with "password" nearby
```

---

## Input Sanitization

**All user input is sanitized before being passed to any model API.**

### Sanitization Pipeline

```python
def sanitize_input(raw_input: str) -> SanitizedInput:
    """
    Sanitize user input before routing classification and model execution.
    Returns sanitized input + any warnings/blocks.
    """
    result = SanitizedInput(text=raw_input, warnings=[], blocked=False)

    # 1. LENGTH VALIDATION
    if len(raw_input) > MAX_INPUT_LENGTH:
        result.text = raw_input[:MAX_INPUT_LENGTH]
        result.warnings.append("Input truncated to max length")

    # 2. NULL BYTE REMOVAL (prevents injection)
    result.text = result.text.replace('\x00', '')

    # 3. UNICODE NORMALIZATION (prevents homograph attacks)
    result.text = unicodedata.normalize('NFKC', result.text)

    # 4. CONTROL CHARACTER STRIPPING (except newlines/tabs)
    result.text = ''.join(
        c for c in result.text
        if c in '\n\t' or not unicodedata.category(c).startswith('C')
    )

    # 5. SENSITIVE DATA DETECTION
    for pattern, name in SENSITIVE_PATTERNS.items():
        if re.search(pattern, result.text):
            result.warnings.append(f"Potential {name} detected")
            # Optionally redact: result.text = re.sub(pattern, f'[REDACTED_{name}]', result.text)

    # 6. BLOCK IF CONTAINS SECRETS
    for pattern in BLOCK_PATTERNS:
        if re.search(pattern, result.text):
            result.blocked = True
            result.block_reason = "Input contains sensitive credentials"
            break

    return result

# Configuration
MAX_INPUT_LENGTH = 500_000  # 500K chars max
SENSITIVE_PATTERNS = {
    r'\b\d{3}-\d{2}-\d{4}\b': 'SSN',
    r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b': 'CREDIT_CARD',
    r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b': 'EMAIL',
}
BLOCK_PATTERNS = [
    r'sk-ant-[a-zA-Z0-9]{20,}',      # Anthropic keys
    r'sk-[a-zA-Z0-9]{48,}',          # OpenAI keys
    r'xai-[a-zA-Z0-9]{20,}',         # xAI keys
    r'AIza[a-zA-Z0-9]{35}',          # Google keys
    r'AKIA[A-Z0-9]{16}',             # AWS access keys
    r'-----BEGIN.*PRIVATE KEY-----', # Private keys
]
```

### What Gets Sanitized

| Input Type         | Action      | Reason                              |
| ------------------ | ----------- | ----------------------------------- |
| Null bytes         | Removed     | Prevents string termination attacks |
| Unicode homoglyphs | Normalized  | Prevents visual spoofing            |
| Control characters | Stripped    | Prevents terminal injection         |
| Excessive length   | Truncated   | Prevents resource exhaustion        |
| API keys/secrets   | **Blocked** | Prevents credential leakage         |
| PII patterns       | Warned      | User notified, optional redaction   |

### Sanitization Happens BEFORE

1. Intent classification
2. Complexity estimation
3. Model selection
4. API request to any provider

**No unsanitized user input ever reaches a model API.**

---

## Code Execution Safety

**The router contains NO arbitrary code execution paths.**

### Design Principles

```
┌─────────────────────────────────────────────────────────────────┐
│                   CODE EXECUTION SAFETY                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ✅ ALLOWED                        ❌ NEVER                      │
│  ─────────────────────────────────────────────────────────────  │
│  • String pattern matching         • eval() on user input       │
│  • Dictionary lookups              • exec() on user input       │
│  • Static configuration            • Dynamic imports from input │
│  • Pre-defined model lists         • Shell commands from input  │
│  • Hardcoded fallback chains       • Code generation + execution│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Verification

The routing logic uses ONLY:

1. **Pattern matching** — Regex against known intent keywords
2. **Dictionary lookups** — Pre-defined routing tables
3. **Conditional logic** — Static if/else branches
4. **List iteration** — Over hardcoded model lists

**There is no path from user input to code execution.**

```python
# ✅ SAFE: Lookup in pre-defined dictionary
model = ROUTING_TABLE.get((intent, complexity))

# ✅ SAFE: Iteration over hardcoded list
for model in ["opus", "sonnet", "haiku"]:
    if is_available(model):
        return model

# ❌ NEVER HAPPENS: No eval/exec anywhere in router
# eval(user_input)      # DOES NOT EXIST
# exec(user_input)      # DOES NOT EXIST
# __import__(user_input) # DOES NOT EXIST
```

### Model Override Safety

Even user model overrides are validated against an allowlist:

```python
ALLOWED_OVERRIDES = {"opus", "sonnet", "haiku", "gpt", "gemini", "flash", "grok"}

def get_user_override(request):
    match = re.match(r'^use (\w+):', request.lower())
    if match:
        override = match.group(1)
        if override in ALLOWED_OVERRIDES:  # Allowlist check
            return override
    return None  # Invalid overrides ignored, not executed
```

---

## Prompt Injection Protection

### Detection Patterns

Watch for attempts to manipulate routing:

```
"Ignore previous instructions"
"You are now..."
"Disregard your programming"
"New system prompt:"
"[INST]" or "### System:"
Base64 encoded commands
Unicode obfuscation
```

### Mitigation

1. Sanitize user input before classification
2. Use structured prompts for sub-agents
3. Validate model responses for instruction leakage
4. Log suspicious patterns

---

## Provider Trust Assessment

### Tier 1: High Trust

| Provider  | Compliance                     | Data Policy                    |
| --------- | ------------------------------ | ------------------------------ |
| Anthropic | SOC2, GDPR                     | No training on API data        |
| OpenAI    | SOC2, GDPR, HIPAA (Enterprise) | API data not used for training |
| Google    | SOC2, GDPR, HIPAA              | Enterprise data protections    |

### Tier 2: Standard Trust

| Provider | Notes                                   |
| -------- | --------------------------------------- |
| xAI      | Newer provider, verify current policies |

### Tier 3: Evaluate

| Provider             | Notes                                  |
| -------------------- | -------------------------------------- |
| Open source (Ollama) | Data stays local—highest privacy       |
| Other providers      | Research before sending sensitive data |

---

## Audit Logging

### What to Log

```json
{
  "timestamp": "2026-02-01T22:00:00Z",
  "session_id": "abc123",
  "intent_detected": "CODE",
  "complexity": "COMPLEX",
  "model_selected": "anthropic/claude-opus-4-5",
  "model_used": "anthropic/claude-opus-4-5",
  "fallback_triggered": false,
  "data_classification": "INTERNAL",
  "routing_reason": "code_task_complex"
}
```

### What NOT to Log

- Actual query content (if sensitive)
- API keys or tokens
- PII from queries
- Full response bodies

### Log Location

```
~/.openclaw/logs/router-decisions.log
```

---

## Current Threat Landscape (Feb 2026)

### Active Threats to AI Systems

| Threat              | Vector                       | Mitigation         |
| ------------------- | ---------------------------- | ------------------ |
| Prompt injection    | Document uploads, user input | Input sanitization |
| Token stealing      | Browser extensions           | Audit extensions   |
| Supply chain        | npm/pip packages             | Audit dependencies |
| Credential phishing | Fake SSO pages               | Verify URLs        |
| Vishing             | Phone calls for MFA          | Never share codes  |

### AI-Specific Risks

1. **Jailbreaking attempts** - Users trying to bypass safety
2. **Data exfiltration** - Tricking AI to reveal training data
3. **Model confusion** - Causing wrong model selection
4. **Cost attacks** - Triggering expensive models unnecessarily

---

## Incident Response

### If Compromise Suspected

1. **Immediate**
   - Disable affected API keys
   - Stop routing to compromised provider
   - Alert user/admin

2. **Investigation**
   - Review audit logs
   - Check for unusual routing patterns
   - Identify scope of exposure

3. **Recovery**
   - Rotate all potentially exposed keys
   - Update affected auth profiles
   - Document incident

4. **Prevention**
   - Implement additional monitoring
   - Update detection patterns
   - Review security policies

---

## Rate Limiting for Self-Hosted

**Critical for preventing abuse and cost overruns in self-hosted deployments.**

### Recommended Rate Limits

| Limit Type                   | Recommended | Purpose             |
| ---------------------------- | ----------- | ------------------- |
| Requests/minute/user         | 20          | Prevent spam        |
| Requests/hour/user           | 200         | Sustained abuse     |
| Premium model requests/hour  | 20          | Cost control        |
| Max concurrent requests      | 5           | Resource protection |
| Max input tokens/request     | 100K        | Memory protection   |
| Max requests/day (free tier) | 100         | Quota management    |

### Implementation

```python
from collections import defaultdict
import time

class RateLimiter:
    def __init__(self):
        self.requests = defaultdict(list)  # user_id -> [timestamps]
        self.premium_requests = defaultdict(list)

    def check_rate_limit(self, user_id: str, model: str) -> tuple[bool, str]:
        """
        Check if request is allowed under rate limits.
        Returns (allowed, reason).
        """
        now = time.time()

        # Clean old entries
        self.requests[user_id] = [t for t in self.requests[user_id] if now - t < 3600]
        self.premium_requests[user_id] = [t for t in self.premium_requests[user_id] if now - t < 3600]

        # Per-minute limit
        recent = [t for t in self.requests[user_id] if now - t < 60]
        if len(recent) >= 20:
            return False, "Rate limit: max 20 requests/minute"

        # Per-hour limit
        if len(self.requests[user_id]) >= 200:
            return False, "Rate limit: max 200 requests/hour"

        # Premium model limit
        if is_premium_model(model):
            if len(self.premium_requests[user_id]) >= 20:
                return False, "Rate limit: max 20 premium model requests/hour"
            self.premium_requests[user_id].append(now)

        self.requests[user_id].append(now)
        return True, "OK"

def is_premium_model(model: str) -> bool:
    """
    Check if model should be rate-limited as premium.

    Note: GPT-5 is $$ tier (subscription-based, no per-token cost) but is
    included here because it consumes a paid ChatGPT Plus subscription
    allocation. Excessive use could hit OpenAI's usage caps or degrade
    the user's subscription experience for other purposes.
    """
    # GPT-5 included despite $$ cost tier — consumes paid ChatGPT Plus subscription allocation
    return model in ["opus", "gemini-pro", "gpt-5"]
```

### Cost Protection

| Model       | Cost/1M tokens | Daily cap suggestion |
| ----------- | -------------- | -------------------- |
| Opus        | $15.00 input   | $10/user/day         |
| Gemini Pro  | $1.25 input    | $5/user/day          |
| Sonnet      | $3.00 input    | $5/user/day          |
| Flash/Haiku | <$0.30 input   | $1/user/day          |

### Self-Hosted Configuration

Add to your OpenClaw config:

```yaml
# openclaw.yaml
router:
  rate_limits:
    enabled: true
    requests_per_minute: 20
    requests_per_hour: 200
    premium_per_hour: 20
    max_input_tokens: 100000

  cost_limits:
    enabled: true
    daily_per_user_usd: 10.00
    monthly_total_usd: 500.00
    alert_threshold_percent: 80
```

### Abuse Detection

Monitor for these patterns:

| Pattern                  | Indicator           | Action           |
| ------------------------ | ------------------- | ---------------- |
| Rapid-fire requests      | >50 in 5 min        | Temp ban         |
| Repeated premium routing | Forcing Opus        | Warn + downgrade |
| Large input spam         | Max size repeatedly | Investigate      |
| Off-hours activity       | 3-6 AM local        | Flag for review  |
| Failed auth attempts     | >5 in 10 min        | Block IP         |

### Response to Abuse

```python
def handle_rate_limit_exceeded(user_id: str, limit_type: str):
    """Handle rate limit violations."""

    # Log the violation
    log_security_event({
        "event": "rate_limit_exceeded",
        "user_id": user_id,
        "limit_type": limit_type,
        "timestamp": now()
    })

    # Escalating response
    violations = get_recent_violations(user_id, hours=24)

    if violations < 3:
        # Soft warning
        return {"status": "limited", "retry_after": 60}
    elif violations < 10:
        # Temporary cooldown
        return {"status": "cooldown", "retry_after": 300}
    else:
        # Require admin review
        notify_admin(f"User {user_id} exceeded rate limits {violations} times")
        return {"status": "blocked", "reason": "excessive_violations"}
```

---

## Compliance Considerations

### GDPR (EU Data)

- Verify provider has EU data processing agreements
- Consider data residency requirements
- Implement data subject request handling

### HIPAA (Health Data)

- Use only BAA-covered providers
- Encrypt PHI in transit and at rest
- Audit access to health data

### PCI-DSS (Payment Data)

- NEVER route cardholder data through AI
- If required, use dedicated compliant infrastructure
- Document all data flows

### SOC 2

- Maintain audit logs
- Document security controls
- Regular access reviews

---

## Token Exhaustion Security

When models become unavailable due to token exhaustion or rate limits, additional security considerations apply.

### Fallback Trust Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│              FALLBACK TRUST VERIFICATION                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Before falling back to a different model/provider:             │
│                                                                  │
│  1. VERIFY the fallback model meets the same trust tier         │
│     - Don't fall from Tier 1 (Anthropic) to Tier 3 (unknown)   │
│     - Maintain data classification requirements                  │
│                                                                  │
│  2. RE-EVALUATE data sensitivity                                 │
│     - Original model may have had special compliance (HIPAA)    │
│     - Fallback may not — BLOCK if compliance required           │
│                                                                  │
│  3. LOG the fallback event for audit trail                      │
│     - Which model failed, why, what was the fallback            │
│     - Essential for incident response                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Fallback Chain Security Rules

| Original Model Trust | Allowed Fallback Trust | Action if Violated         |
| -------------------- | ---------------------- | -------------------------- |
| Tier 1 (High)        | Tier 1 only            | Block request, notify user |
| Tier 2 (Standard)    | Tier 1 or 2            | Allow with warning         |
| Tier 3 (Evaluate)    | Any tier               | Allow (already low trust)  |

### Token Exhaustion Attack Vectors

| Attack                  | Vector                                                                        | Mitigation                            |
| ----------------------- | ----------------------------------------------------------------------------- | ------------------------------------- |
| Forced downgrade        | Exhaust premium model tokens to force cheaper (possibly less secure) fallback | Maintain trust tier in fallback chain |
| Cost amplification      | Trigger expensive model repeatedly to drain quota                             | Rate limiting + cost caps             |
| Availability exhaustion | Flood requests to exhaust all fallback options                                | Circuit breaker + queue management    |
| Timing attack           | Measure response time differences to infer model                              | Normalize response timing             |

### Notification Security

When notifying users of model switches:

```python
def build_secure_switch_notification(failed_model: str, reason: str, success_model: str) -> str:
    """
    Build notification without leaking sensitive details.
    """
    # SAFE: Generic model names only
    safe_failed = sanitize_model_name(failed_model)
    safe_success = sanitize_model_name(success_model)

    # SAFE: Generic reason categories only
    safe_reason = {
        "token quota exhausted": "quota limit reached",
        "rate limit exceeded": "rate limit reached",
        "API timeout": "request timeout",
        "API error: 401": "authentication issue",  # Don't expose error codes
        "API error: 500": "provider error",
    }.get(reason, "temporary unavailability")

    # DON'T include:
    # - Specific error codes or messages from provider
    # - Token counts or quota details
    # - Internal system paths or configurations
    # - API key identifiers or account details

    return f"Model switched from {safe_failed} to {safe_success} due to {safe_reason}."
```

### Circuit Breaker Security

The circuit breaker prevents repeated failures but must be secured:

```python
CIRCUIT_BREAKER_CONFIG = {
    "threshold": 3,              # Failures before opening
    "reset_ms": 300_000,         # 5 min cooldown
    "max_open_duration_ms": 600_000,  # Force re-check after 10 min

    # Security additions:
    "log_all_trips": True,       # Audit trail
    "alert_on_cascade": True,    # Notify if multiple circuits open
    "preserve_trust_tier": True, # Don't bypass trust checks when circuit resets
}
```

---

## Security Checklist

Before deploying the router:

- [ ] API keys stored in auth-profiles only (not in code)
- [ ] No secrets in skill files
- [ ] Audit logging enabled
- [ ] Sensitive data patterns blocked
- [ ] Provider trust levels documented
- [ ] Incident response plan ready
- [ ] Compliance requirements identified
- [ ] Key rotation schedule set
- [ ] Fallback chains respect trust boundaries
- [ ] Token exhaustion notifications sanitized
- [ ] Circuit breaker configured with security settings

---

## Updating This Document

Update when:

- New vulnerabilities discovered
- Provider policies change
- Compliance requirements update
- New threat patterns emerge

Last updated: February 2026
