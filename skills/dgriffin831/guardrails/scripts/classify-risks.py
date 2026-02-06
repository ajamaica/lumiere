#!/usr/bin/env python3
"""
classify-risks.py - Categorize skills by risk level
Reads discovery JSON from stdin, outputs risk classification to stdout
No external dependencies - Python standard library only
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

RISK_CATEGORIES = {
    "destructive": {
        "keywords": ["delete", "remove", "purge", "destroy", "rm ", "unlink", "clear", "wipe", "erase"],
        "description": "Can delete or destroy data/resources",
    },
    "external_comms": {
        "keywords": ["send", "post", "tweet", "message", "email", "publish", "broadcast", "notify"],
        "description": "Can send external communications",
    },
    "data_read": {
        "keywords": ["read", "search", "download", "fetch", "get", "query", "list", "show"],
        "description": "Can read or access data",
    },
    "data_write": {
        "keywords": ["write", "upload", "create", "modify", "update", "save", "store", "edit"],
        "description": "Can write or modify data",
    },
    "data_exfiltration": {
        "keywords": ["upload", "publish", "share", "export", "sync", "backup", "transfer"],
        "description": "Can export or share data externally",
    },
    "impersonation": {
        "keywords": ["send email", "post tweet", "create event", "reply", "comment", "as you", "on behalf"],
        "description": "Can act on behalf of the user",
    },
    "system_modification": {
        "keywords": ["config", "firewall", "network", "restart", "reboot", "install", "uninstall", "chmod", "chown"],
        "description": "Can modify system configuration",
    },
    "financial": {
        "keywords": ["trade", "buy", "sell", "payment", "stock", "crypto", "wallet", "transaction", "purchase"],
        "description": "Can perform financial transactions",
    },
}


def classify_skill(skill_path):
    if not skill_path:
        return []

    skill_md_path = Path(skill_path) / "SKILL.md"
    if not skill_md_path.is_file():
        return []

    try:
        content = skill_md_path.read_text(encoding="utf-8", errors="ignore").lower()
    except Exception:
        return []

    categories = []
    for category, config in RISK_CATEGORIES.items():
        if any(keyword in content for keyword in config["keywords"]):
            categories.append(category)
    return categories


def calculate_risk_level(risks_by_category):
    high_risk_categories = {
        "destructive",
        "external_comms",
        "data_exfiltration",
        "impersonation",
        "financial",
        "system_modification",
    }
    medium_risk_categories = {"data_write"}

    high_risk_count = 0
    medium_risk_count = 0

    for category, skills in risks_by_category.items():
        if not skills:
            continue
        if category in high_risk_categories:
            high_risk_count += 1
        elif category in medium_risk_categories:
            medium_risk_count += 1

    if high_risk_count >= 3:
        return "HIGH"
    if high_risk_count >= 1:
        return "MEDIUM"
    if medium_risk_count >= 2:
        return "MEDIUM"
    return "LOW"


def find_uncovered_categories(risks_by_category):
    return [category for category, skills in risks_by_category.items() if not skills]


def main():
    input_data = sys.stdin.read()
    if not input_data.strip():
        print("❌ Error classifying risks: no input provided", file=sys.stderr)
        sys.exit(1)

    try:
        discovery = json.loads(input_data)
    except Exception as exc:
        print(f"❌ Error classifying risks: {exc}", file=sys.stderr)
        sys.exit(1)

    print("🔍 Classifying risks...\n", file=sys.stderr)

    risks_by_category = {category: [] for category in RISK_CATEGORIES.keys()}
    risks_by_skill = {}

    for skill in discovery.get("skills", []):
        name = skill.get("name")
        if not isinstance(name, str) or not name.strip():
            continue

        categories = classify_skill(skill.get("path"))
        description = skill.get("description") if isinstance(skill.get("description"), str) else ""

        risks_by_skill[name] = {
            "categories": categories,
            "description": description,
        }

        for category in categories:
            if name not in risks_by_category[category]:
                risks_by_category[category].append(name)

        if categories:
            print(f"  📦 {name}: {', '.join(categories)}", file=sys.stderr)

    overall_risk_level = calculate_risk_level(risks_by_category)
    uncovered_categories = find_uncovered_categories(risks_by_category)

    print(f"\n📊 Overall risk level: {overall_risk_level}\n", file=sys.stderr)

    timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    result = {
        "timestamp": timestamp,
        "discovery": discovery,
        "overallRiskLevel": overall_risk_level,
        "risksByCategory": risks_by_category,
        "risksBySkill": risks_by_skill,
        "uncoveredCategories": uncovered_categories,
        "riskCategoryDescriptions": RISK_CATEGORIES,
    }

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
