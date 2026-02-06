#!/usr/bin/env python3
"""
agent_collect.py — Agent-friendly news collection script.

This script is designed to be called by the OpenClaw agent directly.
It handles all collection, including web searches that the shell script
defers to the agent. Output is a complete briefing ready to send.

Usage by agent:
  1. Run: python3 scripts/agent_collect.py [--full]
  2. The script handles GitHub/ClawdHub collection
  3. It outputs search queries the agent should run via web_search
  4. Agent merges web results and calls: python3 scripts/agent_collect.py --merge <results.json>
  5. Final briefing is printed to stdout

Or the agent can just read state/raw_data.json and do its own formatting.
"""

import json
import os
import sys
import subprocess
from datetime import datetime, timezone, timedelta
from pathlib import Path

SKILL_DIR = Path(__file__).parent.parent
STATE_DIR = SKILL_DIR / "state"
RAW_OUTPUT = STATE_DIR / "raw_data.json"
LAST_RUN = STATE_DIR / "last_run.json"

def ensure_state_dir():
    STATE_DIR.mkdir(parents=True, exist_ok=True)

def get_since(full=False):
    """Get the 'since' timestamp."""
    now = datetime.now(timezone.utc)
    now_epoch = int(now.timestamp())
    
    if full or not LAST_RUN.exists():
        since = now - timedelta(hours=24)
    else:
        try:
            with open(LAST_RUN) as f:
                data = json.load(f)
            since = datetime.fromtimestamp(data["epoch"], tz=timezone.utc)
        except Exception:
            since = now - timedelta(hours=24)
    
    return now, since

def run_gh(*args):
    """Run a gh CLI command and return parsed JSON."""
    try:
        result = subprocess.run(
            ["gh"] + list(args),
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0 and result.stdout.strip():
            return json.loads(result.stdout)
        return []
    except (subprocess.TimeoutExpired, FileNotFoundError, json.JSONDecodeError):
        return []

def collect_releases(since_iso):
    """Fetch recent releases from openclaw/openclaw."""
    releases = run_gh(
        "api", "repos/openclaw/openclaw/releases",
        "--jq", f'[.[] | select(.published_at >= "{since_iso}") | '
                f'{{tag: .tag_name, name: .name, url: .html_url, '
                f'published: .published_at, body: (.body // "" | .[0:300])}}]'
    )
    return releases if isinstance(releases, list) else []

def collect_prs(since_iso):
    """Fetch notable recent PRs."""
    prs = run_gh(
        "api", "repos/openclaw/openclaw/pulls?state=all&sort=updated&direction=desc&per_page=20",
        "--jq", f'[.[] | select(.updated_at >= "{since_iso}") | '
                f'select(.labels | map(.name) | any(test("breaking|security|important|highlight"; "i")) '
                f'or (.title | test("breaking|security|major|release"; "i"))) | '
                f'{{number: .number, title: .title, state: .state, url: .html_url, '
                f'merged: .merged_at, updated: .updated_at, labels: [.labels[].name]}}]'
    )
    return prs if isinstance(prs, list) else []

def collect_security(since_iso):
    """Check for security-labeled issues."""
    issues = run_gh(
        "api", f"repos/openclaw/openclaw/issues?labels=security&state=all&sort=updated&direction=desc&per_page=10",
        "--jq", f'[.[] | select(.updated_at >= "{since_iso}") | '
                f'{{number: .number, title: .title, state: .state, url: .html_url, updated: .updated_at}}]'
    )
    return issues if isinstance(issues, list) else []

def collect_clawhub():
    """Query ClawdHub registry for skills."""
    try:
        result = subprocess.run(
            ["clawdhub", "explore", "--registry", "https://www.clawhub.ai"],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0:
            skills = []
            for line in result.stdout.strip().split("\n"):
                line = line.strip()
                if line and not line.startswith("#") and not line.startswith("-"):
                    skills.append({"name": line.split()[0] if line.split() else line, "raw": line})
            return skills
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass
    return []

def get_search_queries():
    """Return search queries for the agent to run via web_search."""
    return {
        "community": [
            "OpenClaw AI agent site:news.ycombinator.com",
            "OpenClaw site:reddit.com",
        ],
        "ecosystem": [
            '"OpenClaw" news OR announcement OR launch',
            '"OpenClaw" AI agent article OR review',
        ],
        "moltbook": [
            "site:moltbook.com trending",
        ],
    }

def collect_all(full=False):
    """Run full collection. Returns raw data dict and search queries for agent."""
    ensure_state_dir()
    now, since = get_since(full)
    since_iso = since.strftime("%Y-%m-%dT%H:%M:%SZ")
    now_iso = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    
    print("📡 Collecting OpenClaw ecosystem news...", file=sys.stderr)
    print(f"   Since: {since_iso}", file=sys.stderr)
    
    data = {
        "collected_at": now_iso,
        "since": since_iso,
        "since_epoch": int(since.timestamp()),
        "releases": collect_releases(since_iso),
        "pull_requests": collect_prs(since_iso),
        "clawhub_skills": collect_clawhub(),
        "security": collect_security(since_iso),
        "community": [],
        "ecosystem_news": [],
        "moltbook": [],
        "errors": [],
    }
    
    # Save raw data
    with open(RAW_OUTPUT, "w") as f:
        json.dump(data, f, indent=2)
    
    # Save run state
    with open(LAST_RUN, "w") as f:
        json.dump({
            "epoch": int(now.timestamp()),
            "iso": now_iso,
            "mode": "full" if full else "incremental",
        }, f, indent=2)
    
    # Save pending searches for agent
    queries = get_search_queries()
    with open(STATE_DIR / "pending_searches.json", "w") as f:
        json.dump(queries, f, indent=2)
    
    print("✅ Collection complete.", file=sys.stderr)
    print(f"   GitHub: {len(data['releases'])} releases, {len(data['pull_requests'])} PRs, {len(data['security'])} security items", file=sys.stderr)
    print(f"   ClawdHub: {len(data['clawhub_skills'])} skills", file=sys.stderr)
    print(f"   Agent: run web searches from state/pending_searches.json", file=sys.stderr)
    
    return data, queries

def merge_web_results(results_file):
    """Merge web search results into raw_data.json."""
    with open(RAW_OUTPUT) as f:
        data = json.load(f)
    
    with open(results_file) as f:
        results = json.load(f)
    
    if "community" in results:
        data["community"] = results["community"]
    if "ecosystem" in results:
        data["ecosystem_news"] = results["ecosystem"]
    if "moltbook" in results:
        data["moltbook"] = results["moltbook"]
    
    with open(RAW_OUTPUT, "w") as f:
        json.dump(data, f, indent=2)
    
    print("✅ Web results merged.", file=sys.stderr)
    return data

def format_briefing(data, short=False):
    """Format data into a clean briefing string."""
    try:
        dt = datetime.fromisoformat(data["collected_at"].replace("Z", "+00:00"))
        date_str = dt.strftime("%b %d, %Y")
    except Exception:
        date_str = data.get("collected_at", "unknown")
    
    sections = []
    has_content = False
    
    # Releases
    if data.get("releases"):
        has_content = True
        lines = ["🚀 **RELEASES**"]
        for r in data["releases"]:
            tag = r.get("tag", "?")
            name = r.get("name", "") or tag
            body = (r.get("body", "") or "").strip().split("\n")[0][:120]
            url = r.get("url", "")
            lines.append(f"• {name}" + (f" — {body}" if body else ""))
            if url:
                lines.append(f"  {url}")
        sections.append("\n".join(lines))
    
    # PRs
    if data.get("pull_requests"):
        has_content = True
        lines = ["📋 **NOTABLE PRS**"]
        for pr in data["pull_requests"][:5]:
            num = pr.get("number", "?")
            title = pr.get("title", "")
            merged = "✅ merged" if pr.get("merged") else pr.get("state", "")
            url = pr.get("url", "")
            lines.append(f"• #{num}: {title} ({merged})")
            if url:
                lines.append(f"  {url}")
        sections.append("\n".join(lines))
    
    # Skills
    if data.get("clawhub_skills"):
        has_content = True
        lines = ["🧩 **CLAWHUB SKILLS**"]
        for s in data["clawhub_skills"][:8]:
            lines.append(f"• {s.get('raw', s.get('name', '?'))}")
        sections.append("\n".join(lines))
    
    # Security
    if data.get("security"):
        has_content = True
        lines = ["🔒 **SECURITY**"]
        for s in data["security"]:
            lines.append(f"• #{s.get('number','?')}: {s.get('title','')}")
            if s.get("url"):
                lines.append(f"  {s['url']}")
        sections.append("\n".join(lines))
    
    # Community
    if data.get("community"):
        has_content = True
        lines = ["💬 **COMMUNITY**"]
        for c in data["community"][:5]:
            if isinstance(c, dict):
                title = c.get("title", "")
                url = c.get("url", "")
                source = c.get("source", "")
                lines.append(f"• {title}" + (f" ({source})" if source else ""))
                if url:
                    lines.append(f"  {url}")
            else:
                lines.append(f"• {c}")
        sections.append("\n".join(lines))
    
    # Ecosystem
    if data.get("ecosystem_news"):
        has_content = True
        lines = ["📰 **ECOSYSTEM**"]
        for e in data["ecosystem_news"][:5]:
            if isinstance(e, dict):
                lines.append(f"• {e.get('title', '')}")
                if e.get("url"):
                    lines.append(f"  {e['url']}")
            else:
                lines.append(f"• {e}")
        sections.append("\n".join(lines))
    
    # Moltbook
    if data.get("moltbook"):
        has_content = True
        lines = ["🐛 **MOLTBOOK**"]
        for m in data["moltbook"][:3]:
            if isinstance(m, dict):
                lines.append(f"• {m.get('title', m.get('text', str(m)))}")
            else:
                lines.append(f"• {m}")
        sections.append("\n".join(lines))
    
    # Build output
    if short:
        if has_content:
            counts = []
            if data.get("releases"): counts.append(f"{len(data['releases'])} release(s)")
            if data.get("pull_requests"): counts.append(f"{len(data['pull_requests'])} PR(s)")
            if data.get("clawhub_skills"): counts.append(f"{len(data['clawhub_skills'])} skill(s)")
            if data.get("security"): counts.append(f"{len(data['security'])} security item(s)")
            return f"📡 OpenClaw News ({date_str}): {', '.join(counts)}."
        else:
            return f"📡 All quiet in the OpenClaw ecosystem. ({date_str})"
    
    output = [f"📡 **OpenClaw Ecosystem News** — {date_str}", ""]
    
    if has_content:
        output.append("\n\n".join(sections))
    else:
        output.append("All quiet today. No new releases, security issues, or notable discussions.")
    
    output.append("")
    output.append("—")
    
    try:
        since_dt = datetime.fromisoformat(data["since"].replace("Z", "+00:00"))
        since_str = since_dt.strftime("%b %d, %Y %H:%M UTC")
    except Exception:
        since_str = data.get("since", "?")
    
    output.append(f"Since: {since_str}")
    output.append("Sources: GitHub, ClawdHub, Brave Search, Moltbook")
    
    errors = data.get("errors", [])
    if errors:
        sources = ", ".join(e.get("source", "?") for e in errors)
        output.append(f"\n⚠ {len(errors)} source(s) had issues: {sources}")
    
    return "\n".join(output)


if __name__ == "__main__":
    args = sys.argv[1:]
    
    if "--merge" in args:
        idx = args.index("--merge")
        if idx + 1 < len(args):
            data = merge_web_results(args[idx + 1])
            print(format_briefing(data))
        else:
            print("Usage: agent_collect.py --merge <results.json>", file=sys.stderr)
            sys.exit(1)
    else:
        full = "--full" in args
        short = "--short" in args
        data, queries = collect_all(full)
        
        if short:
            print(format_briefing(data, short=True))
        else:
            # Print queries for agent to handle
            print(json.dumps({"status": "collected", "pending_searches": queries}, indent=2))
