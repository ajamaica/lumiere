#!/usr/bin/env python3
"""
generate_guardrails_md.py — LLM-powered GUARDRAILS.md generator.

Reads {discovery, classification, answers} JSON from stdin, uses an LLM to
generate a full GUARDRAILS.md document, and outputs it to stdout. Also writes
guardrails-config.json to the path specified as the first CLI argument.

Provider detection order (same as input-guard/scripts/llm_scanner.py):
1. OPENAI_API_KEY  -> OpenAI API (gpt-4o-mini)
2. ANTHROPIC_API_KEY -> Anthropic API (claude-sonnet-4-5)
"""

import os
import sys
import json
import re
import requests
from pathlib import Path

TEMPLATE_PATH = Path(__file__).parent.parent / "templates" / "guardrails-template.md"
PLACEHOLDER_PATTERN = re.compile(r"\{\{[A-Z0-9_]+\}\}")
REQUIRED_HEADINGS = [
    "## General Guardrails",
    "## Skill-Specific Guardrails",
    "## Enforcement",
    "### Monitoring",
    "## Risk Assessment",
]

# ---------------------------------------------------------------------------
# LLM provider helpers (shared pattern with generate_questions.py)
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


def _call_openai(api_key, model, system_prompt, user_message, timeout=90):
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
            "temperature": 0.3,
            "max_tokens": 6000,
        },
        timeout=timeout,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


def _call_anthropic(api_key, model, system_prompt, user_message, timeout=90):
    resp = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": api_key,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01",
        },
        json={
            "model": model,
            "max_tokens": 6000,
            "system": system_prompt,
            "messages": [
                {"role": "user", "content": user_message},
            ],
            "temperature": 0.3,
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

    print(f"Using {provider} ({model}) to generate GUARDRAILS.md...", file=sys.stderr)

    if provider == "openai":
        return _call_openai(api_key, model, system_prompt, user_message)
    else:
        return _call_anthropic(api_key, model, system_prompt, user_message)


# ---------------------------------------------------------------------------
# Prompt construction
# ---------------------------------------------------------------------------

def build_system_prompt():
    """Build the system prompt, including the template as structural reference."""
    template_content = ""
    if TEMPLATE_PATH.exists():
        template_content = TEMPLATE_PATH.read_text()

    return f"""You generate a GUARDRAILS.md security policy document for an AI agent workspace. Your output is the complete markdown content of the GUARDRAILS.md file.

## Structural Reference

Use the following template as a structural reference for the document layout, section ordering, and tone. Replace all placeholder values with concrete policies derived from the user's interview answers.

<template>
{template_content}
</template>

## Instructions

1. **Tone**: Mandatory, clear, actionable rules. Use imperative language ("Never...", "Always...").
2. **Structure**: Follow the template's section ordering:
   - General Guardrails (comms, deletion, restricted directories, sensitive data, exfiltration, need-to-know, write containment)
   - Skill-Specific Guardrails (only for skills/integrations that are actually installed)
   - Enforcement (sub-agent inheritance, cron jobs, conflict resolution)
   - Monitoring (frequency, violation handling, incident logging)
   - Risk Assessment (skill count, risk categories)
3. **Be specific**: Convert freeform answers into concrete, unambiguous rules. Use the user's actual values (paths, service names, channel names).
4. **Skill-specific sections**: Only include sections for skills and integrations that exist in the discovery data. Group rules by skill name.
5. **Risk-proportional**: Higher-risk environments should have stricter language and more detailed rules.
6. **Include metadata**: Add the generation timestamp and overall risk level in the header.
7. **Footer**: End with the standard footer noting this was generated from guardrails-config.json.

Output ONLY the markdown content. No code fences wrapping the entire output. No preamble or explanation."""


def build_user_message(discovery, classification, answers):
    """Build the user message with all interview data."""
    parts = [
        "Generate GUARDRAILS.md based on the following interview answers and environment data.",
        "",
        "## Discovery Data",
        json.dumps(discovery, indent=2),
        "",
        "## Risk Classification",
        json.dumps(classification, indent=2),
        "",
        "## User Interview Answers",
        json.dumps(answers, indent=2),
    ]
    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Post-processing
# ---------------------------------------------------------------------------

def clean_response(raw_text):
    """Strip markdown code fences if the LLM wrapped the entire output."""
    cleaned = raw_text.strip()
    if cleaned.startswith("```markdown"):
        cleaned = re.sub(r"^```markdown\s*\n?", "", cleaned)
        cleaned = re.sub(r"\n?```\s*$", "", cleaned)
    elif cleaned.startswith("```md"):
        cleaned = re.sub(r"^```md\s*\n?", "", cleaned)
        cleaned = re.sub(r"\n?```\s*$", "", cleaned)
    elif cleaned.startswith("```"):
        cleaned = re.sub(r"^```\s*\n?", "", cleaned)
        cleaned = re.sub(r"\n?```\s*$", "", cleaned)
    return cleaned


def _extract_user_name(answers):
    if isinstance(answers, dict):
        if isinstance(answers.get("user_name"), str) and answers.get("user_name").strip():
            return answers.get("user_name").strip()
        identity = answers.get("identity")
        if isinstance(identity, dict):
            name = identity.get("name")
            if isinstance(name, str) and name.strip():
                return name.strip()
    return "the user"


def _format_sensitive_types(value):
    labels = {
        "ssn": "Social Security Numbers",
        "password": "Passwords",
        "api_key": "API keys",
        "credit_card": "Credit card numbers",
        "bank_account": "Bank account numbers",
        "private_key": "Private keys / certificates",
        "health_record": "Health records",
        "tax_id": "Tax IDs",
    }
    if isinstance(value, list) and value:
        items = [labels.get(v, v) for v in value]
    elif isinstance(value, str) and value.strip():
        items = [labels.get(value, value)]
    else:
        items = [
            "Social Security Numbers",
            "Passwords",
            "API keys",
            "Credit card numbers",
            "Bank account numbers",
        ]
    return "\n".join(f"- {item}" for item in items)


def _build_risk_categories(classification):
    risks_by_category = classification.get("risksByCategory", {}) if isinstance(classification, dict) else {}
    descriptions = classification.get("riskCategoryDescriptions", {}) if isinstance(classification, dict) else {}
    lines = []
    if isinstance(risks_by_category, dict):
        for category, skills in risks_by_category.items():
            if not skills:
                continue
            desc = ""
            if isinstance(descriptions.get(category), dict):
                desc = descriptions.get(category, {}).get("description", "")
            if not desc:
                desc = category.replace("_", " ")
            lines.append(f"- **{category.replace('_', ' ')}** ({len(skills)}): {desc}")
    return "\n".join(lines) if lines else "*No risk categories identified.*"


def _build_skill_policies(classification):
    risks_by_skill = classification.get("risksBySkill", {}) if isinstance(classification, dict) else {}
    if not isinstance(risks_by_skill, dict) or not risks_by_skill:
        return "*No high-risk skills detected.*"

    high_risk = {"destructive", "external_comms", "data_exfiltration", "impersonation", "system_modification", "financial"}
    blocks = []
    for skill_name in sorted(risks_by_skill.keys()):
        categories = risks_by_skill.get(skill_name, {}).get("categories", [])
        if not any(c in high_risk for c in categories):
            continue
        blocks.append(
            f"### {skill_name}\n"
            f"- Follow general guardrails for all actions.\n"
            f"- Ask before any action that could delete data, communicate externally, exfiltrate data, modify systems, or perform financial actions.\n"
        )
    return "\n".join(blocks) if blocks else "*No high-risk skills detected.*"


def _default_replacements(discovery, classification, answers):
    from datetime import datetime, timezone

    user_name = _extract_user_name(answers)
    sensitive_types = _format_sensitive_types(answers.get("sensitive_data_types") if isinstance(answers, dict) else None)
    skills = discovery.get("skills", []) if isinstance(discovery, dict) else []
    risks_by_category = classification.get("risksByCategory", {}) if isinstance(classification, dict) else {}
    risk_category_count = len([v for v in risks_by_category.values() if v]) if isinstance(risks_by_category, dict) else 0

    return {
        "{{USER_NAME}}": user_name,
        "{{TIMESTAMP}}": datetime.now(timezone.utc).isoformat(),
        "{{OVERALL_RISK_LEVEL}}": classification.get("overallRiskLevel", "UNKNOWN") if isinstance(classification, dict) else "UNKNOWN",
        "{{EXTERNAL_COMMS_POLICY}}": (
            f"- **Drafts only** — prepare communications for {user_name} to review and send.\n"
            f"- **Never send** external communications without explicit confirmation.\n"
            f"- **In group chats**, never speak as if you are {user_name}. You are a separate entity."
        ),
        "{{DELETION_POLICY}}": (
            f"- **Never delete files or data** without {user_name}'s explicit permission.\n"
            f"- **Never delete emails or calendar events** without permission.\n"
            f"- **\"Clean up\" is not permission to delete** — list what you'd remove and ask first."
        ),
        "{{RESTRICTED_DIRECTORIES}}": "**No restricted directories configured** — ask before accessing personal, financial, or credential data.",
        "{{SENSITIVE_DATA_POLICY}}": "Never read, store, log, or transmit sensitive data in plain text.",
        "{{SENSITIVE_DATA_TYPES}}": sensitive_types,
        "{{DATA_EXFILTRATION_POLICY}}": (
            "- **Never upload or share private data externally** without explicit permission.\n"
            "- **Never include private data in search queries** or external prompts unless required and approved."
        ),
        "{{NEED_TO_KNOW_POLICY}}": (
            "- Access the minimum data required for the task\n"
            "- Strip sensitive details from summaries and reports\n"
            "- No personal data in group chats"
        ),
        "{{WRITE_CONTAINMENT_POLICY}}": "Write files only inside the workspace unless explicitly allowed.",
        "{{SKILL_POLICIES}}": _build_skill_policies(classification),
        "{{SUBAGENT_POLICY}}": "Full inheritance — all guardrails apply equally to sub-agents",
        "{{MONITORING_POLICY}}": "Guardrails are monitored **weekly**. Run `guardrails monitor` to check manually.",
        "{{VIOLATION_POLICY}}": "Block action and notify user immediately.",
        "{{INCIDENT_LOGGING}}": "All guardrail violations and blocked actions logged to memory.",
        "{{SKILL_COUNT}}": str(len(skills)),
        "{{RISK_CATEGORY_COUNT}}": str(risk_category_count),
        "{{RISK_CATEGORIES}}": _build_risk_categories(classification),
    }


def _render_default_guardrails(discovery, classification, answers):
    template = TEMPLATE_PATH.read_text() if TEMPLATE_PATH.exists() else ""
    if not template:
        return "# GUARDRAILS.md\n\nDefault guardrails could not be generated because the template is missing.\n"

    replacements = _default_replacements(discovery, classification, answers)
    output = template
    for placeholder, value in replacements.items():
        output = output.replace(placeholder, value)

    # Replace any remaining placeholders with a neutral default
    output = PLACEHOLDER_PATTERN.sub("Not specified.", output)
    return output


def _needs_fallback(text):
    if PLACEHOLDER_PATTERN.search(text):
        return True, "placeholders remained in output"
    missing = [heading for heading in REQUIRED_HEADINGS if heading not in text]
    if missing:
        return True, f"missing required sections: {', '.join(missing)}"
    return False, ""


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    config_path = sys.argv[1] if len(sys.argv) > 1 else None

    if not config_path:
        print("Error: config output path required", file=sys.stderr)
        print("Usage: python3 generate_guardrails_md.py <config-output-path>", file=sys.stderr)
        sys.exit(1)

    input_data = sys.stdin.read()
    if not input_data.strip():
        print("Error: No input on stdin. Pipe {discovery, classification, answers} JSON.", file=sys.stderr)
        sys.exit(1)

    try:
        data = json.loads(input_data)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON on stdin: {e}", file=sys.stderr)
        sys.exit(1)

    discovery = data.get("discovery", {})
    classification = data.get("classification", {})
    answers = data.get("answers", {})

    if not answers:
        print("Error: No 'answers' found in input data.", file=sys.stderr)
        sys.exit(1)

    # Generate GUARDRAILS.md via LLM
    system_prompt = build_system_prompt()
    user_message = build_user_message(discovery, classification, answers)
    raw_response = call_llm(system_prompt, user_message)
    guardrails_md = clean_response(raw_response)

    needs_fallback, reason = _needs_fallback(guardrails_md)
    if needs_fallback:
        print(f"Warning: LLM output invalid ({reason}). Falling back to deterministic defaults.", file=sys.stderr)
        guardrails_md = _render_default_guardrails(discovery, classification, answers)

    # Write GUARDRAILS.md to stdout
    sys.stdout.write(guardrails_md)
    if not guardrails_md.endswith("\n"):
        sys.stdout.write("\n")

    # Write guardrails-config.json
    from datetime import datetime, timezone
    config = {
        "version": "1.0",
        "generated": datetime.now(timezone.utc).isoformat(),
        "discovery": discovery,
        "classification": classification,
        "answers": answers,
    }

    with open(config_path, "w") as f:
        json.dump(config, f, indent=2)

    print(f"\nConfig saved to: {config_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
