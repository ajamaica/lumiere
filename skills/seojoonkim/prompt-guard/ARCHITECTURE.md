# 🏗️ Prompt Guard Architecture

> Internal architecture documentation for contributors and maintainers.

---

## Overview

Prompt Guard는 **다층 방어(Defense in Depth)** 원칙으로 설계됨. 단일 패턴이 아닌 여러 레이어의 검사를 통해 false positive를 줄이면서 공격을 효과적으로 탐지.

```
┌─────────────────────────────────────────────────────────────────┐
│                        INPUT MESSAGE                            │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Layer 1: Rate Limiting                                         │
│  • Per-user request tracking                                    │
│  • Sliding window algorithm                                     │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Layer 2: Text Normalization                                    │
│  • Homoglyph detection & replacement                            │
│  • Zero-width character removal                                 │
│  • Unicode normalization                                        │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Layer 3: Pattern Matching Engine                               │
│  • Critical patterns (immediate block)                          │
│  • Secret/Token requests                                        │
│  • Multi-language injection patterns                            │
│  • Scenario jailbreaks                                          │
│  • Social engineering                                           │
│  • Indirect injection                                           │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Layer 4: Encoding Detection                                    │
│  • Base64 suspicious content                                    │
│  • URL encoding tricks                                          │
│  • HTML entity abuse                                            │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Layer 5: Behavioral Analysis                                   │
│  • Repetition detection (token overflow)                        │
│  • Context hijacking patterns                                   │
│  • Multi-turn manipulation                                      │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Layer 6: Context-Aware Decision                                │
│  • Sensitivity adjustment                                       │
│  • Owner bypass rules                                           │
│  • Group context restrictions                                   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DetectionResult                             │
│  • severity: SAFE → LOW → MEDIUM → HIGH → CRITICAL              │
│  • action: ALLOW | LOG | WARN | BLOCK | BLOCK_NOTIFY            │
│  • reasons: [matched pattern categories]                        │
│  • recommendations: [human-readable suggestions]                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Severity Levels

| Level    | Value | Description                | Typical Trigger              |
| -------- | ----- | -------------------------- | ---------------------------- |
| SAFE     | 0     | No threat detected         | Normal conversation          |
| LOW      | 1     | Minor suspicious signal    | Output manipulation          |
| MEDIUM   | 2     | Clear manipulation attempt | Role manipulation, urgency   |
| HIGH     | 3     | Dangerous command          | Jailbreaks, system access    |
| CRITICAL | 4     | Immediate threat           | Secret exfil, code execution |

### 2. Action Types

| Action         | Description         | When Used                    |
| -------------- | ------------------- | ---------------------------- |
| `allow`        | No intervention     | SAFE severity                |
| `log`          | Record only         | Owner requests, LOW severity |
| `warn`         | Notify user         | MEDIUM severity              |
| `block`        | Refuse request      | HIGH severity                |
| `block_notify` | Block + alert owner | CRITICAL severity            |

### 3. Pattern Categories

#### 🔴 Critical (Immediate Block)

- `CRITICAL_PATTERNS` - rm -rf, fork bombs, SQL injection, XSS
- `SECRET_PATTERNS` - API key/token/password requests

#### 🟠 v2.6.0 Social Engineering Defense

- `APPROVAL_EXPANSION` - "아까 허락했잖아" scope creep
- `CREDENTIAL_PATH_PATTERNS` - credentials.json, .env 경로
- `BYPASS_COACHING` - "작동되게 만들어" bypass help
- `DM_SOCIAL_ENGINEERING` - DM 조작 패턴

#### 🟡 v2.5.x Advanced Patterns

- `INDIRECT_INJECTION` - URL/file/image-based injection
- `CONTEXT_HIJACKING` - Fake memory/history manipulation
- `MULTI_TURN_MANIPULATION` - Gradual trust building
- `TOKEN_SMUGGLING` - Invisible Unicode characters
- `SYSTEM_PROMPT_MIMICRY` - `<claude_*>`, `[INST]` 등

#### 🟢 v2.4.0 Red Team Patterns

- `SCENARIO_JAILBREAK` - Dream/story/cinema/academic
- `EMOTIONAL_MANIPULATION` - Moral dilemmas, threats
- `AUTHORITY_RECON` - Fake admin, capability probing
- `COGNITIVE_MANIPULATION` - Hypnosis/trance patterns
- `PHISHING_SOCIAL_ENG` - Password reset templates

#### 🔵 Language-Specific

- `PATTERNS_EN` - English patterns
- `PATTERNS_KO` - 한국어 패턴
- `PATTERNS_JA` - 日本語パターン
- `PATTERNS_ZH` - 中文模式

---

## Detection Flow

```python
def analyze(message, context):
    # 1. Rate limit check
    if check_rate_limit(user_id):
        return BLOCK

    # 2. Text normalization
    normalized, has_homoglyphs = normalize(message)

    # 3. Critical patterns (highest priority)
    for pattern in CRITICAL_PATTERNS:
        if match(pattern, normalized):
            return CRITICAL

    # 4. Secret request patterns
    for lang, patterns in SECRET_PATTERNS:
        for pattern in patterns:
            if match(pattern, text):
                return CRITICAL

    # 5. Versioned pattern sets (newest first)
    pattern_sets = [
        (v2.6.0_patterns, severity),  # Social engineering
        (v2.5.2_patterns, severity),  # Moltbook attacks
        (v2.5.0_patterns, severity),  # Indirect injection
        (v2.4.0_patterns, severity),  # Red team patterns
    ]

    # 6. Language-specific patterns
    for lang in [EN, KO, JA, ZH]:
        check_language_patterns(lang)

    # 7. Base64 detection
    suspicious = detect_base64(message)

    # 8. Behavioral analysis
    check_repetition()
    check_invisible_chars()

    # 9. Context-aware adjustment
    adjust_for_sensitivity()
    apply_owner_rules()
    apply_group_restrictions()

    return DetectionResult(...)
```

---

## File Structure

```
prompt-guard/
├── README.md              # User documentation
├── ARCHITECTURE.md        # This file
├── SKILL.md               # Clawdbot skill interface
├── config.example.yaml    # Configuration template
└── scripts/
    ├── detect.py          # Core detection engine (~1400 lines)
    │   ├── Severity       # Enum for severity levels
    │   ├── Action         # Enum for action types
    │   ├── DetectionResult# Result dataclass
    │   ├── PromptGuard    # Main detection class
    │   └── Pattern defs   # 349+ regex patterns
    │
    ├── analyze_log.py     # Security log analyzer
    │   └── LogAnalyzer    # Parse and aggregate logs
    │
    └── audit.py           # System security audit
        └── SecurityAudit  # Check permissions, configs
```

---

## Pattern Organization

### Naming Convention

```
{CATEGORY}_{VERSION?} = [
    r"pattern1",
    r"pattern2",
]
```

### Version Tagging in Matches

패턴 매칭 시 버전 태그 추가:

- `new:{category}:{pattern}` - v2.4.0 red team
- `v25:{category}:{pattern}` - v2.5.0 indirect
- `v252:{category}:{pattern}` - v2.5.2 moltbook
- `{lang}:{category}:{pattern}` - language-specific

---

## Configuration Schema

```yaml
prompt_guard:
  # Detection sensitivity
  sensitivity: medium # low | medium | high | paranoid

  # Owner IDs (bypass most restrictions)
  owner_ids:
    - 'USER_ID'

  # Action per severity
  actions:
    LOW: log
    MEDIUM: warn
    HIGH: block
    CRITICAL: block_notify

  # Rate limiting
  rate_limit:
    enabled: true
    max_requests: 30
    window_seconds: 60

  # Logging
  logging:
    enabled: true
    path: memory/security-log.md
```

---

## Key Design Decisions

### 1. Regex over ML

- **Pros**: Deterministic, explainable, no model dependencies
- **Cons**: Manual pattern updates needed
- **Reasoning**: Security requires predictability; ML false negatives unacceptable

### 2. Multi-Language First

- All patterns have EN/KO/JA/ZH variants
- Attack language != user language (multilingual attacks common)

### 3. Severity Graduation

- Not binary block/allow
- Owner context matters (more lenient for owners)
- Group context matters (stricter in groups)

### 4. Versioned Patterns

- Clear provenance for each pattern set
- Credits to contributors (홍민표, Moltbook, etc.)
- Easy to audit and roll back

---

## Extension Points

### Adding New Patterns

```python
# 1. Define pattern list
NEW_ATTACK_CATEGORY = [
    r"pattern1",
    r"pattern2",
]

# 2. Add to analysis loop
new_pattern_sets = [
    ...
    (NEW_ATTACK_CATEGORY, "new_category", Severity.HIGH),
]
```

### Adding New Languages

```python
PATTERNS_XX = {
    "instruction_override": [...],
    "role_manipulation": [...],
    ...
}

# Add to all_patterns
all_patterns.append((PATTERNS_XX, "xx"))
```

---

## Performance Notes

- **Regex compilation**: Patterns are compiled on first use (Python caches)
- **Early exit**: CRITICAL patterns checked first
- **Fingerprinting**: Hash-based dedup for repeated attacks
- **Rate limiting**: O(1) sliding window

---

## Security Considerations

### What We DON'T Do

- ❌ Execute user input
- ❌ Log sensitive data in plaintext
- ❌ Trust any "admin" claims without owner_id verification

### What We DO

- ✅ Fail closed (block on uncertainty)
- ✅ Log all suspicious activity
- ✅ Stricter rules in group contexts

---

## Changelog Location

버전별 변경사항은 `detect.py` 상단 docstring에 기록:

```python
"""
Prompt Guard v2.6.0 - Advanced Prompt Injection Detection

Changelog v2.6.0 (2026-02-01):
- Added Single Approval Expansion detection
- Added Credential Path Harvesting detection
...
"""
```

---

## Credits

- **Core**: @simonkim_nft (김서준)
- **v2.4.0 Red Team**: 홍민표 (@kanfrancisco)
- **v2.4.1 Config Fix**: Junho Yeo (@junhoyeo)
- **v2.5.2 Moltbook Patterns**: Community reports

---

_Last updated: 2026-02-01 | v2.6.0_
