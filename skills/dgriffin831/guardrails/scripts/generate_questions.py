#!/usr/bin/env python3
"""
generate_questions.py — LLM-powered interview question generator.

Reads discovery+classification JSON from stdin and uses an LLM to generate
interview questions tailored to the actual skills, integrations, and risks
found in the workspace. Outputs questions JSON to stdout.

Provider detection order (same as input-guard/scripts/llm_scanner.py):
1. OPENAI_API_KEY  -> OpenAI API (gpt-4o-mini)
2. ANTHROPIC_API_KEY -> Anthropic API (claude-sonnet-4-5)
"""

import os
import sys
import json
import re
import requests

# ---------------------------------------------------------------------------
# LLM provider helpers
# ---------------------------------------------------------------------------

def _detect_provider():
    """Detect available LLM provider. Returns (provider, api_key, model)."""
    openai_key = os.environ.get("OPENAI_API_KEY")
    if openai_key:
        return ("openai", openai_key, "gpt-4o-mini")

    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
    if anthropic_key:
        return ("anthropic", anthropic_key, "claude-sonnet-4-5-20250514")

    return ("none", "", "")


def _call_openai(api_key, model, system_prompt, user_message, timeout=60):
    resp = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            "temperature": 0.4,
            "max_tokens": 4000,
            "response_format": {"type": "json_object"},
        },
        timeout=timeout,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


def _call_anthropic(api_key, model, system_prompt, user_message, timeout=60):
    resp = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": api_key,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01",
        },
        json={
            "model": model,
            "max_tokens": 4000,
            "system": system_prompt,
            "messages": [
                {"role": "user", "content": user_message},
            ],
            "temperature": 0.4,
        },
        timeout=timeout,
    )
    resp.raise_for_status()
    return resp.json()["content"][0]["text"]


def call_llm(system_prompt, user_message):
    """Call LLM with auto-detected provider. Returns raw text response."""
    provider, api_key, model = _detect_provider()

    if provider == "none":
        print("Error: No LLM provider available. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.", file=sys.stderr)
        sys.exit(1)

    print(f"Using {provider} ({model}) to generate questions...", file=sys.stderr)

    if provider == "openai":
        return _call_openai(api_key, model, system_prompt, user_message)
    else:
        return _call_anthropic(api_key, model, system_prompt, user_message)


# ---------------------------------------------------------------------------
# Prompt construction
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You generate security interview questions for an AI agent workspace. Your output is a JSON object consumed directly by an interactive interview flow.

## Output Format

Return ONLY valid JSON with this exact structure:

{
  "categories": {
    "<category_id>": {
      "title": "<Human-readable title>",
      "description": "<One-line description>"
    }
  },
  "questions": [
    {
      "id": "<snake_case unique id>",
      "category": "<category_id from categories above>",
      "question": "<The question to ask the user>",
      "help": "<Why this question matters — 1 sentence>",
      "suggestions": [
        {"label": "<Short display label>", "value": "<machine value — string, array, or object>"}
      ],
      "defaultSuggestion": <0-based index of recommended default>,
      "allowCustom": <true if user can type a freeform answer>
    }
  ]
}

## Rules

1. **Always include these core categories** regardless of what's installed:
   - `identity` — Name, timezone, preferences
   - `data_sensitivity` — Restricted paths, sensitive data types, write containment
   - `external_comms` — Communication policies
   - `destructive_actions` — Deletion policies
   - `data_exfiltration` — Upload and sharing policies
   - `monitoring` — Violation handling, monitoring frequency, incident logging

2. **Always include these core questions** (they apply to every workspace):
   - `user_name` — What should the agent call you?
   - `timezone` — What timezone are you in?
   - `deletion_policy` — How should file/data deletion be handled?
   - `external_comms_policy` — Can the agent send emails/messages on your behalf?
   - `data_exfiltration_policy` — When can the agent upload or share data externally?
   - `sensitive_data_types` — What types of sensitive data should trigger caution?
   - `violation_notification` — How should guardrail violations be handled?
   - `monitoring_frequency` — How often should guardrails be checked?

3. **Only generate skill/integration-specific questions for things actually discovered.** For example:
   - Do NOT ask about financial trading policies if no financial skills are installed.
   - Do NOT ask about Twitter posting if no Twitter/bird integration exists.
   - Do NOT ask about Google Drive folders if no Google integration exists.
   - Do NOT ask about VM snapshots if no virtualization integration exists.

4. **Add a `skill_specific` category** only if there are high-risk skills or integrations that need dedicated policies.

5. **Each question should have 3-4 suggestion options** with sensible defaults. The safest option should generally be the default.

6. **Use `allowCustom: true`** for questions where the user might want to enter their own value (names, paths, service lists).

7. **Question IDs must be snake_case** and descriptive enough to use as config keys.

8. **Suggestions values can be strings, arrays, or objects** depending on what makes sense for the question. Keep them machine-parseable."""


CORE_CATEGORIES = {
    "identity": {
        "title": "Identity & Context",
        "description": "Who you are and how you work",
    },
    "data_sensitivity": {
        "title": "Data Sensitivity",
        "description": "What data is sensitive and how it's handled",
    },
    "external_comms": {
        "title": "External Communications",
        "description": "Control how the agent communicates on your behalf",
    },
    "destructive_actions": {
        "title": "Destructive Actions",
        "description": "Set boundaries around deletion and destructive operations",
    },
    "data_exfiltration": {
        "title": "Data Exfiltration",
        "description": "Control how data can leave your workspace",
    },
    "monitoring": {
        "title": "Monitoring & Enforcement",
        "description": "How guardrails are monitored and enforced",
    },
}

CORE_QUESTIONS = [
    {
        "id": "user_name",
        "category": "identity",
        "question": "What should the agent call you?",
        "help": "Helps the agent maintain appropriate context and tone.",
        "suggestions": [
            {"label": "First name", "value": "first_name"},
            {"label": "Full name", "value": "full_name"},
            {"label": "Nickname", "value": "nickname"},
        ],
        "defaultSuggestion": 0,
        "allowCustom": True,
    },
    {
        "id": "timezone",
        "category": "identity",
        "question": "What timezone are you in?",
        "help": "Used for time-sensitive operations and scheduling.",
        "suggestions": [
            {"label": "Local timezone", "value": "local"},
            {"label": "UTC", "value": "UTC"},
            {"label": "US Eastern", "value": "America/New_York"},
            {"label": "US Pacific", "value": "America/Los_Angeles"},
        ],
        "defaultSuggestion": 0,
        "allowCustom": True,
    },
    {
        "id": "deletion_policy",
        "category": "destructive_actions",
        "question": "How should the agent handle file/data deletion?",
        "help": "Controls deletion across files, emails, and cloud resources.",
        "suggestions": [
            {"label": "Always ask first (safest)", "value": "always-ask"},
            {"label": "Ask unless temporary", "value": "ask-unless-temp"},
            {"label": "Allowed with confirmation", "value": "allowed-with-confirmation"},
            {"label": "Prefer archive/trash", "value": "prefer-archive"},
        ],
        "defaultSuggestion": 0,
    },
    {
        "id": "external_comms_policy",
        "category": "external_comms",
        "question": "Can the agent send emails, posts, or messages on your behalf?",
        "help": "Controls external communications and impersonation risk.",
        "suggestions": [
            {"label": "Never send (drafts only)", "value": "never"},
            {"label": "Drafts only - I send", "value": "drafts-only"},
            {"label": "Ask each time", "value": "ask-each-time"},
            {"label": "Trusted channels only", "value": "trusted-channels"},
        ],
        "defaultSuggestion": 1,
    },
    {
        "id": "data_exfiltration_policy",
        "category": "data_exfiltration",
        "question": "When can the agent upload or share data externally?",
        "help": "Controls uploads to external services and APIs.",
        "suggestions": [
            {"label": "Private workspace only", "value": "private-only"},
            {"label": "Trusted endpoints only", "value": "trusted-endpoints"},
            {"label": "Ask each time", "value": "ask-each-time"},
            {"label": "Allowed with logging", "value": "allowed-with-logging"},
        ],
        "defaultSuggestion": 0,
    },
    {
        "id": "sensitive_data_types",
        "category": "data_sensitivity",
        "question": "What types of sensitive data should trigger extra caution?",
        "help": "Prevents sensitive data from being stored, logged, or transmitted.",
        "suggestions": [
            {"label": "Standard set", "value": ["ssn", "password", "api_key", "credit_card", "bank_account"]},
            {"label": "Minimal (passwords and keys)", "value": ["password", "api_key", "private_key"]},
            {"label": "Comprehensive", "value": ["ssn", "password", "api_key", "credit_card", "bank_account", "health_record", "tax_id", "private_key"]},
        ],
        "defaultSuggestion": 0,
    },
    {
        "id": "violation_notification",
        "category": "monitoring",
        "question": "How should guardrail violations be handled?",
        "help": "Defines what happens when an action conflicts with your rules.",
        "suggestions": [
            {"label": "Block and notify immediately", "value": "block-notify"},
            {"label": "Block and log silently", "value": "block-log"},
            {"label": "Warn and ask permission", "value": "warn-ask"},
            {"label": "Log only", "value": "log-only"},
        ],
        "defaultSuggestion": 0,
    },
    {
        "id": "monitoring_frequency",
        "category": "monitoring",
        "question": "How often should guardrails be checked for changes?",
        "help": "Detects new skills or configuration changes that need review.",
        "suggestions": [
            {"label": "Daily", "value": "daily"},
            {"label": "Weekly", "value": "weekly"},
            {"label": "On install only", "value": "on-install"},
            {"label": "Manual only", "value": "manual"},
        ],
        "defaultSuggestion": 1,
    },
]


def build_user_message(discovery, classification):
    """Build the user message containing discovery and classification data."""
    skills_summary = []
    for skill in discovery.get("skills", []):
        skills_summary.append(f"- {skill.get('name', 'unknown')}: {skill.get('description', 'no description')}")

    integrations = discovery.get("integrations", [])
    channels = discovery.get("channels", [])

    risks_by_category = classification.get("risksByCategory", {})
    risks_by_skill = classification.get("risksBySkill", {})
    overall_risk = classification.get("overallRiskLevel", "UNKNOWN")

    parts = [
        "Generate interview questions tailored to this workspace environment.",
        "",
        f"## Overall Risk Level: {overall_risk}",
        "",
        "## Discovered Skills",
        *(skills_summary if skills_summary else ["- (none)"]),
        "",
        "## Detected Integrations",
        *(f"- {i}" for i in integrations) if integrations else ["- (none)"],
        "",
        "## Communication Channels",
        *(f"- {c}" for c in channels) if channels else ["- (none)"],
        "",
        "## Risk Classification by Category",
        json.dumps(risks_by_category, indent=2),
        "",
        "## Risk Classification by Skill",
        json.dumps(risks_by_skill, indent=2),
    ]

    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Response parsing
# ---------------------------------------------------------------------------

def parse_response(raw_text):
    """Parse JSON from LLM response, handling markdown fences."""
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*\n?", "", cleaned)
        cleaned = re.sub(r"\n?```\s*$", "", cleaned)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r'\{[\s\S]*\}', cleaned)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
        print(f"Error: Could not parse LLM response as JSON", file=sys.stderr)
        print(f"Raw response (first 500 chars): {raw_text[:500]}", file=sys.stderr)
        sys.exit(1)


def validate_questions(data):
    """Basic validation of the generated questions structure."""
    if not isinstance(data, dict):
        print("Error: Response is not a JSON object", file=sys.stderr)
        sys.exit(1)

    if "categories" not in data or not isinstance(data.get("categories"), dict):
        print("Warning: Missing or invalid 'categories' - backfilling defaults.", file=sys.stderr)
        data["categories"] = {}

    if "questions" not in data or not isinstance(data.get("questions"), list):
        print("Warning: Missing or invalid 'questions' - backfilling defaults.", file=sys.stderr)
        data["questions"] = []

    required_ids = {"user_name", "timezone", "deletion_policy", "external_comms_policy",
                    "data_exfiltration_policy", "sensitive_data_types",
                    "violation_notification", "monitoring_frequency"}
    found_ids = {q["id"] for q in data["questions"] if "id" in q}
    missing = required_ids - found_ids

    if missing:
        print(f"Warning: Missing core questions: {', '.join(sorted(missing))}. Backfilling defaults.", file=sys.stderr)

    # Ensure core categories exist
    for category_id, meta in CORE_CATEGORIES.items():
        if category_id not in data["categories"]:
            data["categories"][category_id] = meta

    # Backfill missing core questions with deterministic defaults
    existing_ids = {q.get("id") for q in data["questions"] if isinstance(q, dict)}
    for question in CORE_QUESTIONS:
        if question["id"] not in existing_ids:
            data["questions"].append(question)

    return data


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    input_data = sys.stdin.read()
    if not input_data.strip():
        print("Error: No input on stdin. Pipe discovery+classification JSON.", file=sys.stderr)
        sys.exit(1)

    try:
        data = json.loads(input_data)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON on stdin: {e}", file=sys.stderr)
        sys.exit(1)

    # Input can be either the classification output (which contains discovery nested)
    # or a combined {discovery, classification} object
    if "discovery" in data and "classification" in data:
        discovery = data["discovery"]
        classification = data["classification"]
    elif "discovery" in data:
        discovery = data["discovery"]
        classification = data
    else:
        # Assume it's the classification output which embeds discovery info
        discovery = data
        classification = data

    user_message = build_user_message(discovery, classification)
    raw_response = call_llm(SYSTEM_PROMPT, user_message)
    questions = parse_response(raw_response)
    questions = validate_questions(questions)

    json.dump(questions, sys.stdout, indent=2)
    sys.stdout.write("\n")
    print(f"Generated {len(questions['questions'])} questions across {len(questions['categories'])} categories.", file=sys.stderr)


if __name__ == "__main__":
    main()
