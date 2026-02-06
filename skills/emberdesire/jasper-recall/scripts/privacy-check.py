#!/usr/bin/env python3
"""
Privacy checker for jasper-recall shared memory.
Scans text for patterns that should not be shared publicly.

Usage:
    privacy-check.py "text to check"
    privacy-check.py --file /path/to/file.md
    echo "text" | privacy-check.py --stdin
"""

import re
import sys
import argparse
from pathlib import Path

# Privacy patterns - things that should NOT appear in shared/public content
PATTERNS = [
    # Personal identifiers
    {
        "name": "email",
        "pattern": r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
        "description": "Email address detected"
    },
    {
        "name": "phone",
        "pattern": r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b",
        "description": "Phone number detected"
    },
    
    # Paths and infrastructure
    {
        "name": "home_path",
        "pattern": r"/home/\w+/",
        "description": "Home directory path detected"
    },
    {
        "name": "internal_ip",
        "pattern": r"\b(?:10|172\.(?:1[6-9]|2\d|3[01])|192\.168)\.\d{1,3}\.\d{1,3}\b",
        "description": "Internal IP address detected"
    },
    {
        "name": "tailscale_ip",
        "pattern": r"\b100\.\d{1,3}\.\d{1,3}\.\d{1,3}\b",
        "description": "Tailscale IP detected"
    },
    
    # Secrets and credentials
    {
        "name": "anthropic_key",
        "pattern": r"sk-ant-[a-zA-Z0-9-_]{20,}",
        "description": "Anthropic API key detected"
    },
    {
        "name": "openai_key",
        "pattern": r"sk-[a-zA-Z0-9]{48}",
        "description": "OpenAI API key detected"
    },
    {
        "name": "generic_key",
        "pattern": r"\b(?:api[_-]?key|secret|token|password)\s*[=:]\s*['\"]?[a-zA-Z0-9-_]{16,}['\"]?",
        "description": "Generic API key/secret detected",
        "flags": re.IGNORECASE
    },
    {
        "name": "bearer_token",
        "pattern": r"Bearer\s+[a-zA-Z0-9-_\.]{20,}",
        "description": "Bearer token detected"
    },
    
    # Private keywords
    {
        "name": "private_marker",
        "pattern": r"\[private\]",
        "description": "Content explicitly marked as private",
        "flags": re.IGNORECASE
    },
    {
        "name": "secret_keyword",
        "pattern": r"\b(?:confidential|internal[_-]only|do[_\s]not[_\s]share)\b",
        "description": "Confidentiality keyword detected",
        "flags": re.IGNORECASE
    },
    
    # MongoDB/Database URIs
    {
        "name": "mongodb_uri",
        "pattern": r"mongodb(?:\+srv)?://[^\s]+",
        "description": "MongoDB connection string detected"
    },
    
    # SSH/Server references
    {
        "name": "ssh_user",
        "pattern": r"\bssh\s+\w+@",
        "description": "SSH connection string detected"
    },
]

# Allowlist - these are OK even if they match patterns
ALLOWLIST = [
    # Product names and branding
    "jasper-recall",
    "hopeIDS", 
    "hopeid",
    "OpenClaw",
    "openclaw",
    "E.x.O.",
    "exohaven.online",
    "exocreate.online",
    "clawhub.ai",
    
    # Public URLs
    "github.com",
    "npm",
    "npx",
    
    # Example placeholders
    "example.com",
    "user@example.com",
    "sk-xxx",
    "your-api-key",
]


def check_text(text: str) -> list:
    """
    Check text for privacy violations.
    Returns list of {pattern, match, description, line} dicts.
    """
    violations = []
    lines = text.split('\n')
    
    for line_num, line in enumerate(lines, 1):
        # Skip if line contains allowlisted terms in context
        line_lower = line.lower()
        
        for pattern_def in PATTERNS:
            flags = pattern_def.get("flags", 0)
            matches = re.finditer(pattern_def["pattern"], line, flags)
            
            for match in matches:
                matched_text = match.group()
                
                # Check against allowlist
                is_allowed = any(
                    allowed.lower() in matched_text.lower() or
                    matched_text.lower() in allowed.lower()
                    for allowed in ALLOWLIST
                )
                
                if not is_allowed:
                    violations.append({
                        "pattern": pattern_def["name"],
                        "match": matched_text,
                        "description": pattern_def["description"],
                        "line": line_num,
                        "context": line.strip()[:100]
                    })
    
    return violations


def main():
    parser = argparse.ArgumentParser(description="Check text for privacy violations")
    parser.add_argument("text", nargs="?", help="Text to check")
    parser.add_argument("--file", "-f", help="File to check")
    parser.add_argument("--stdin", action="store_true", help="Read from stdin")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--quiet", "-q", action="store_true", help="Only output if violations found")
    
    args = parser.parse_args()
    
    # Get text to check
    if args.file:
        text = Path(args.file).read_text()
    elif args.stdin:
        text = sys.stdin.read()
    elif args.text:
        text = args.text
    else:
        parser.print_help()
        sys.exit(1)
    
    violations = check_text(text)
    
    if args.json:
        import json
        print(json.dumps({"clean": len(violations) == 0, "violations": violations}, indent=2))
    elif violations:
        print(f"⚠️  PRIVACY VIOLATIONS FOUND: {len(violations)}\n")
        for v in violations:
            print(f"  [{v['pattern']}] Line {v['line']}: {v['description']}")
            print(f"    Match: {v['match']}")
            print(f"    Context: {v['context'][:80]}...")
            print()
        sys.exit(1)
    elif not args.quiet:
        print("✅ CLEAN - No privacy violations detected")
    
    sys.exit(0 if not violations else 1)


if __name__ == "__main__":
    main()
