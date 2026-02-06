#!/usr/bin/env python3
"""OpenClaw Egress Pro — Full network DLP suite for agent workspaces.

Detect outbound URLs, data exfiltration patterns, and suspicious network
calls, then automatically block connections, quarantine compromised skills,
and enforce domain allowlists.

Philosophy: alert -> subvert -> quarantine -> defend
Free = alert.  Pro = subvert + quarantine + defend.
"""

import argparse, io, json, os, re, shutil, sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

# -- Windows Unicode stdout --------------------------------------------------
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# -- Constants ---------------------------------------------------------------
QUARANTINE_PREFIX = ".quarantined-"
BLOCK_COMMENT = "# [BLOCKED by openclaw-egress-pro]"
ALLOWLIST_FILE = ".egress-allowlist.json"

URL_PATTERN = re.compile(r'https?://[^\s"\'<>\]\)}{,`]+', re.IGNORECASE)

EXFIL_PATTERNS = [
    ("Base64 in URL", re.compile(r"https?://[^\s]*[?&][^=]*=(?:[A-Za-z0-9+/]{40,}={0,2})")),
    ("Hex payload in URL", re.compile(r"https?://[^\s]*[?&][^=]*=(?:[0-9a-f]{32,})", re.IGNORECASE)),
    ("IP address endpoint", re.compile(r"https?://\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}")),
    ("Webhook/callback URL", re.compile(r"https?://[^\s]*/(?:webhook|callback|hook|notify|ping|beacon)[^\s]*", re.IGNORECASE)),
    ("Pastebin/sharing service", re.compile(r"https?://(?:pastebin\.com|hastebin\.com|paste\.ee|dpaste\.org|ix\.io|sprunge\.us|0x0\.st|transfer\.sh|file\.io)[^\s]*", re.IGNORECASE)),
    ("Request catcher", re.compile(r"https?://(?:[^\s]*\.ngrok\.|requestbin|pipedream|beeceptor|hookbin|requestcatcher)[^\s]*", re.IGNORECASE)),
    ("Dynamic DNS", re.compile(r"https?://[^\s]*\.(?:duckdns\.org|no-ip\.com|dynu\.com|freedns)[^\s]*", re.IGNORECASE)),
    ("URL shortener", re.compile(r"https?://(?:bit\.ly|tinyurl|t\.co|goo\.gl|is\.gd|v\.gd|rb\.gy|shorturl)[^\s]*", re.IGNORECASE)),
]

NETWORK_CODE_PATTERNS = [
    ("urllib.request", re.compile(r"\burllib\.request\.urlopen\b")),
    ("urllib.request.Request", re.compile(r"\burllib\.request\.Request\b")),
    ("requests.get/post", re.compile(r"\brequests\.(?:get|post|put|patch|delete|head)\b")),
    ("httpx call", re.compile(r"\bhttpx\.(?:get|post|put|patch|delete|head|Client|AsyncClient)\b")),
    ("aiohttp session", re.compile(r"\baiohttp\.ClientSession\b")),
    ("socket connection", re.compile(r"\bsocket\.(?:socket|create_connection|connect)\b")),
    ("http.client", re.compile(r"\bhttp\.client\.HTTP(?:S)?Connection\b")),
    ("fetch/XMLHttpRequest", re.compile(r"\bfetch\s*\(|XMLHttpRequest\b")),
    ("curl command", re.compile(r"\bcurl\s+-")),
    ("wget command", re.compile(r"\bwget\s+")),
]

SAFE_DOMAINS = {
    "github.com", "raw.githubusercontent.com",
    "docs.anthropic.com", "api.anthropic.com",
    "openclaw.com", "clawhub.ai", "clawhub.com",
    "python.org", "pypi.org", "nodejs.org", "npmjs.com",
    "stackoverflow.com", "developer.mozilla.org",
    "wikipedia.org", "example.com",
}

SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv", "venv",
             ".integrity", ".quarantine", ".snapshots"}
SELF_SKILL_DIRS = {"openclaw-egress", "openclaw-egress-pro"}
CODE_SUFFIXES = {".py", ".js", ".ts", ".sh", ".bash"}

# -- Helpers -----------------------------------------------------------------

def resolve_workspace(ws_arg):
    if ws_arg:
        return Path(ws_arg).resolve()
    env = os.environ.get("OPENCLAW_WORKSPACE")
    if env:
        return Path(env).resolve()
    cwd = Path.cwd()
    if (cwd / "AGENTS.md").exists():
        return cwd
    default = Path.home() / ".openclaw" / "workspace"
    return default if default.exists() else cwd

def is_binary(path):
    try:
        with open(path, "rb") as f:
            return b"\x00" in f.read(8192)
    except (OSError, PermissionError):
        return True

def in_code_block(lines, line_idx):
    fence = 0
    for i in range(line_idx):
        if lines[i].strip().startswith("```"):
            fence += 1
    return fence % 2 == 1

def is_safe_url(url, allowlist=None):
    try:
        domain = (urlparse(url).hostname or "")
        all_safe = SAFE_DOMAINS | (allowlist or set())
        return any(domain == s or domain.endswith("." + s) for s in all_safe)
    except Exception:
        return False

def classify_url(url, allowlist=None):
    for name, pat in EXFIL_PATTERNS:
        if pat.search(url):
            return "CRITICAL", name
    try:
        domain = (urlparse(url).hostname or "")
        if is_safe_url(url, allowlist):
            return "SAFE", "Known safe domain"
        for tld in (".xyz", ".tk", ".ml", ".ga", ".cf", ".gq", ".top", ".buzz"):
            if domain.endswith(tld):
                return "WARNING", f"Suspicious TLD ({tld})"
        return "INFO", "External endpoint"
    except Exception:
        return "WARNING", "Unparseable URL"

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def _comment_char(suffix):
    return "// " if suffix in (".js", ".ts") else "# "

def _print_skills(skills_dir):
    if not skills_dir.is_dir():
        return
    print("Available skills:")
    for d in sorted(skills_dir.iterdir()):
        if not d.is_dir():
            continue
        if d.name.startswith(QUARANTINE_PREFIX):
            print(f"  [Q] {d.name[len(QUARANTINE_PREFIX):]}")
        elif not d.name.startswith("."):
            print(f"      {d.name}")

# -- Allowlist ---------------------------------------------------------------

def _al_path(ws):
    return ws / ALLOWLIST_FILE

def load_allowlist(ws):
    p = _al_path(ws)
    if not p.exists():
        return set()
    try:
        with open(p, "r", encoding="utf-8") as f:
            return set(json.load(f).get("domains", []))
    except (json.JSONDecodeError, OSError):
        return set()

def save_allowlist(ws, domains):
    with open(_al_path(ws), "w", encoding="utf-8") as f:
        json.dump({"version": 1, "updated": now_iso(), "domains": sorted(domains)}, f, indent=2)

# -- Scanning ----------------------------------------------------------------

def scan_file_urls(fpath, ws, allowlist=None):
    findings = []
    rel = str(fpath.relative_to(ws))
    try:
        content = fpath.read_text(encoding="utf-8", errors="ignore")
    except (OSError, PermissionError):
        return findings
    lines = content.split("\n")
    is_md = fpath.suffix in (".md", ".markdown")
    for ln, line in enumerate(lines, 1):
        if is_md and in_code_block(lines, ln - 1):
            continue
        for m in URL_PATTERN.finditer(line):
            url = m.group(0).rstrip(".,;:)")
            risk, reason = classify_url(url, allowlist)
            if risk != "SAFE":
                findings.append({"file": rel, "line": ln, "url": url[:100], "risk": risk, "reason": reason})
    return findings

def scan_file_network(fpath, ws):
    findings = []
    rel = str(fpath.relative_to(ws))
    if fpath.suffix not in CODE_SUFFIXES:
        return findings
    try:
        content = fpath.read_text(encoding="utf-8", errors="ignore")
    except (OSError, PermissionError):
        return findings
    for ln, line in enumerate(content.split("\n"), 1):
        s = line.strip()
        if s.startswith("#") or s.startswith("//") or BLOCK_COMMENT in line:
            continue
        for name, pat in NETWORK_CODE_PATTERNS:
            if pat.search(line):
                findings.append({"file": rel, "line": ln, "url": "", "risk": "HIGH", "reason": f"Network call: {name}"})
    return findings

def collect_files(ws, skills_only=False):
    files, root = [], (ws / "skills") if skills_only else ws
    if not root.exists():
        return files
    for dirpath, dirs, fnames in os.walk(root):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith(QUARANTINE_PREFIX) and not d.startswith(".quarantine")]
        parts = Path(dirpath).relative_to(ws).parts
        if len(parts) >= 2 and parts[0] == "skills" and parts[1] in SELF_SKILL_DIRS:
            continue
        for fn in fnames:
            fp = Path(dirpath) / fn
            if not is_binary(fp):
                files.append(fp)
    return files

def collect_skill_files(ws, skill):
    sd = ws / "skills" / skill
    if not sd.is_dir():
        return []
    files = []
    for dirpath, dirs, fnames in os.walk(sd):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for fn in fnames:
            fp = Path(dirpath) / fn
            if not is_binary(fp):
                files.append(fp)
    return files

def dedup(findings):
    seen, out = set(), []
    for f in findings:
        k = (f["file"], f["line"], f["reason"])
        if k not in seen:
            seen.add(k)
            out.append(f)
    return out

def scan_skill(ws, skill, allowlist=None):
    results = []
    for fp in collect_skill_files(ws, skill):
        results.extend(scan_file_urls(fp, ws, allowlist))
        results.extend(scan_file_network(fp, ws))
    return dedup(results)

# -- Commands: Detection (free-equivalent) -----------------------------------

def cmd_scan(ws, skills_only=False):
    al = load_allowlist(ws)
    print("=" * 60)
    print("OPENCLAW EGRESS PRO — NETWORK DLP SCAN")
    print("=" * 60)
    print(f"Workspace: {ws}")
    print(f"Timestamp: {now_iso()}")
    print(f"Scope: {'skills only' if skills_only else 'full workspace'}")
    if al:
        print(f"Custom allowlist: {len(al)} domain(s)")
    print()
    files = collect_files(ws, skills_only)
    print(f"Scanning {len(files)} files...\n")
    raw = []
    for fp in files:
        raw.extend(scan_file_urls(fp, ws, al))
        raw.extend(scan_file_network(fp, ws))
    findings = dedup(raw)
    crit = [f for f in findings if f["risk"] == "CRITICAL"]
    high = [f for f in findings if f["risk"] == "HIGH"]
    warn = [f for f in findings if f["risk"] == "WARNING"]
    info = [f for f in findings if f["risk"] == "INFO"]
    print("-" * 40); print("RESULTS"); print("-" * 40)
    if not findings:
        print("[CLEAN] No outbound network risks detected.")
        return 0
    order = {"CRITICAL": 0, "HIGH": 1, "WARNING": 2, "INFO": 3}
    for f in sorted(findings, key=lambda x: order.get(x["risk"], 4)):
        print(f"  [{f['risk']}] {f['file']}:{f['line']}")
        print(f"          {f['reason']}")
        if f["url"]:
            print(f"          URL: {f['url']}")
        print()
    print("-" * 40); print("SUMMARY"); print("-" * 40)
    print(f"  Critical: {len(crit)}")
    print(f"  High:     {len(high)}")
    print(f"  Warnings: {len(warn)}")
    print(f"  Info:     {len(info)}")
    print(f"  Total:    {len(findings)}\n")
    domains = set()
    for f in findings:
        if f["url"]:
            try:
                h = urlparse(f["url"]).hostname
                if h: domains.add(h)
            except Exception:
                pass
    if domains:
        print("  External domains found:")
        for d in sorted(domains):
            print(f"    - {d}")
        print()
    if crit:
        print("ACTION REQUIRED: Data exfiltration risk detected.")
        print("  Run 'protect' for automated countermeasures.")
        print("  Run 'block <skill>' to neutralize network calls.")
        print("  Run 'quarantine <skill>' to disable a compromised skill.")
        return 2
    if high:
        print("REVIEW NEEDED: Network calls detected in skills.")
        print("  Run 'block <skill>' to neutralize network calls.")
        return 1
    return 0

def cmd_domains(ws):
    al = load_allowlist(ws)
    domains = {}
    for fp in collect_files(ws):
        for f in scan_file_urls(fp, ws, al):
            if not f["url"]:
                continue
            try:
                h = urlparse(f["url"]).hostname
                if h and not is_safe_url(f["url"], al):
                    rec = domains.setdefault(h, {"count": 0, "files": set(), "risk": "INFO"})
                    rec["count"] += 1
                    rec["files"].add(f["file"])
                    if f["risk"] in ("CRITICAL", "HIGH"):
                        rec["risk"] = f["risk"]
            except Exception:
                pass
    if not domains:
        print("[CLEAN] No external domains found.")
        return 0
    print("=" * 60); print("EXTERNAL DOMAINS"); print("=" * 60); print()
    for d in sorted(domains):
        r = domains[d]
        print(f"  [{r['risk']}] {d} ({r['count']} reference(s))")
        for fn in sorted(r["files"]):
            print(f"    - {fn}")
    print()
    return 0

def cmd_status(ws):
    al = load_allowlist(ws)
    crit = high = 0
    for fp in collect_files(ws, skills_only=True):
        for f in scan_file_urls(fp, ws, al):
            if f["risk"] == "CRITICAL": crit += 1
            elif f["risk"] == "HIGH": high += 1
        for f in scan_file_network(fp, ws):
            if f["risk"] == "HIGH": high += 1
    qcount = 0
    sd = ws / "skills"
    if sd.is_dir():
        qcount = sum(1 for d in sd.iterdir() if d.is_dir() and d.name.startswith(QUARANTINE_PREFIX))
    parts = []
    if crit: parts.append(f"{crit} exfiltration risk(s)")
    if high: parts.append(f"{high} network call(s)")
    if qcount: parts.append(f"{qcount} quarantined skill(s)")
    if crit:
        print(f"[CRITICAL] {', '.join(parts)}"); return 2
    if high:
        print(f"[WARNING] {', '.join(parts)}"); return 1
    msg = "[CLEAN] No outbound network risks"
    if qcount: msg += f" ({qcount} quarantined)"
    print(msg); return 0

# -- Commands: Pro Countermeasures -------------------------------------------

def _block_lines(abs_path, line_indices):
    """Comment out specific lines in a code file. Returns count blocked."""
    try:
        content = abs_path.read_text(encoding="utf-8", errors="ignore")
    except (OSError, PermissionError):
        return 0
    lines = content.split("\n")
    to_block = {i for i in line_indices if 0 <= i < len(lines) and BLOCK_COMMENT not in lines[i]}
    if not to_block:
        return 0
    shutil.copy2(abs_path, abs_path.with_suffix(abs_path.suffix + ".bak"))
    cc = _comment_char(abs_path.suffix)
    for idx in to_block:
        orig = lines[idx]; stripped = orig.lstrip()
        indent = orig[:len(orig) - len(stripped)]
        if stripped.startswith("#") or stripped.startswith("//"):
            lines[idx] = f"{orig}  {BLOCK_COMMENT}"
        else:
            lines[idx] = f"{indent}{cc}{stripped}  {BLOCK_COMMENT}"
    abs_path.write_text("\n".join(lines), encoding="utf-8")
    return len(to_block)

def cmd_block(ws, skill_name):
    sd = ws / "skills"
    skill_dir = sd / skill_name
    if not skill_dir.is_dir():
        if (sd / (QUARANTINE_PREFIX + skill_name)).is_dir():
            print(f"Skill '{skill_name}' is quarantined. Unquarantine first."); sys.exit(1)
        print(f"Skill not found: {skill_name}"); _print_skills(sd); sys.exit(1)
    if skill_name in SELF_SKILL_DIRS:
        print(f"Cannot block self: {skill_name}"); sys.exit(1)
    actionable = [f for f in scan_skill(ws, skill_name, load_allowlist(ws)) if f["risk"] in ("CRITICAL", "HIGH")]
    if not actionable:
        print(f"No CRITICAL or HIGH findings in '{skill_name}'. Nothing to block."); return 0
    by_file = {}
    for f in actionable:
        by_file.setdefault(f["file"], []).append(f)
    total = files_mod = 0
    print("=" * 60); print(f"BLOCKING NETWORK CALLS IN: {skill_name}"); print("=" * 60); print()
    for rel, ffindings in sorted(by_file.items()):
        ap = ws / rel
        if not ap.is_file():
            continue
        if ap.suffix not in CODE_SUFFIXES:
            for ff in ffindings:
                if ff["url"]:
                    print(f"  [FLAGGED] {rel}:{ff['line']} — {ff['reason']} (non-code, manual review)")
            continue
        indices = {ff["line"] - 1 for ff in ffindings}
        cnt = _block_lines(ap, indices)
        if cnt:
            total += cnt; files_mod += 1
            print(f"  [BLOCKED] {rel}: {cnt} line(s) neutralized  (backup: {ap.suffix}.bak)")
    print(f"\nTotal: {total} line(s) blocked across {files_mod} file(s)")
    if total:
        print("Backups created with .bak extension.\n")
    return 0

def cmd_quarantine(ws, skill_name):
    sd = ws / "skills"; src = sd / skill_name
    if not src.is_dir():
        if (sd / (QUARANTINE_PREFIX + skill_name)).is_dir():
            print(f"Skill '{skill_name}' is already quarantined."); return 0
        print(f"Skill not found: {skill_name}"); _print_skills(sd); sys.exit(1)
    if skill_name in SELF_SKILL_DIRS:
        print(f"Cannot quarantine self: {skill_name}"); sys.exit(1)
    dst = sd / (QUARANTINE_PREFIX + skill_name)
    src.rename(dst)
    print(f"Quarantined: {skill_name}")
    print(f"  Moved: skills/{skill_name}/ -> skills/{QUARANTINE_PREFIX}{skill_name}/")
    print(f"  To restore: run 'unquarantine {skill_name}'")
    return 0

def cmd_unquarantine(ws, skill_name):
    sd = ws / "skills"; src = sd / (QUARANTINE_PREFIX + skill_name)
    if not src.is_dir():
        print(f"No quarantined skill found: {skill_name}"); _print_skills(sd); sys.exit(1)
    dst = sd / skill_name
    if dst.is_dir():
        print(f"Cannot unquarantine: skills/{skill_name}/ already exists"); sys.exit(1)
    src.rename(dst)
    print(f"Unquarantined: {skill_name}")
    print(f"  Moved: skills/{QUARANTINE_PREFIX}{skill_name}/ -> skills/{skill_name}/")
    print(f"  WARNING: Re-scan this skill before use.")
    return 0

def cmd_allowlist(ws, add=None, remove=None, show=False):
    cur = load_allowlist(ws)
    if add:
        d = add.lower().strip()
        if d in SAFE_DOMAINS:
            print(f"'{d}' is already a built-in safe domain."); return 0
        if d in cur:
            print(f"'{d}' is already on the custom allowlist."); return 0
        cur.add(d); save_allowlist(ws, cur)
        print(f"Added: {d} (total custom: {len(cur)})"); return 0
    if remove:
        d = remove.lower().strip()
        if d not in cur:
            print(f"'{d}' is not on the custom allowlist.")
            if d in SAFE_DOMAINS: print("  (Built-in safe domain, cannot be removed.)")
            return 0
        cur.discard(d); save_allowlist(ws, cur)
        print(f"Removed: {d} (total custom: {len(cur)})"); return 0
    # --show (default)
    print("=" * 60); print("DOMAIN ALLOWLIST"); print("=" * 60); print()
    print("Built-in safe domains:")
    for d in sorted(SAFE_DOMAINS): print(f"  - {d}")
    print()
    if cur:
        print(f"Custom allowlist ({len(cur)} domain(s)):")
        for d in sorted(cur): print(f"  + {d}")
    else:
        print("Custom allowlist: (empty)")
    print(f"\nAllowlist file: {_al_path(ws)}\n"); return 0

def cmd_protect(ws):
    al = load_allowlist(ws)
    print("=" * 60); print("OPENCLAW EGRESS PRO — PROTECTION SWEEP"); print("=" * 60)
    print(f"Workspace: {ws}"); print(f"Timestamp: {now_iso()}")
    if al: print(f"Custom allowlist: {len(al)} domain(s)")
    print()
    sd = ws / "skills"
    if not sd.is_dir():
        print("No skills directory found."); return 0
    active = [d.name for d in sorted(sd.iterdir())
              if d.is_dir() and not d.name.startswith(QUARANTINE_PREFIX)
              and not d.name.startswith(".") and d.name not in SELF_SKILL_DIRS]
    if not active:
        print("No active skills to scan."); return 0
    print(f"Scanning {len(active)} active skill(s)...\n")
    actions, q_list, b_list, b_total = [], [], [], 0
    for skill in active:
        findings = scan_skill(ws, skill, al)
        crit = [f for f in findings if f["risk"] == "CRITICAL"]
        high = [f for f in findings if f["risk"] == "HIGH"]
        if not crit and not high:
            continue
        if crit:
            src = sd / skill; dst = sd / (QUARANTINE_PREFIX + skill)
            if src.is_dir():
                src.rename(dst); q_list.append(skill)
                actions.append(f"QUARANTINED: {skill} ({len(crit)} critical)")
                print(f"  [QUARANTINE] {skill} — {len(crit)} CRITICAL finding(s)")
                for f in crit:
                    print(f"               {f['file']}:{f['line']}: {f['reason']}")
                    if f["url"]: print(f"               URL: {f['url']}")
            continue
        # HIGH only -> block
        by_file = {}
        for f in high: by_file.setdefault(f["file"], []).append(f)
        skill_cnt = 0
        for rel, ffs in by_file.items():
            ap = ws / rel
            if not ap.is_file() or ap.suffix not in CODE_SUFFIXES:
                continue
            cnt = _block_lines(ap, {ff["line"] - 1 for ff in ffs})
            skill_cnt += cnt
        if skill_cnt:
            b_total += skill_cnt; b_list.append(skill)
            actions.append(f"BLOCKED: {skill} ({skill_cnt} line(s))")
            print(f"  [BLOCK] {skill} — {skill_cnt} HIGH line(s) neutralized")
    print(); print("-" * 40); print("PROTECTION SWEEP RESULTS"); print("-" * 40)
    if not actions:
        print("[CLEAN] No threats found. All skills are safe."); return 0
    print(f"  Actions taken: {len(actions)}")
    if q_list:
        print(f"  Skills quarantined: {len(q_list)}")
        for s in q_list: print(f"    - {s}")
    if b_list:
        print(f"  Skills with blocked calls: {len(b_list)}")
        for s in b_list: print(f"    - {s}")
        print(f"  Total lines blocked: {b_total}")
    print("\nNEXT STEPS:")
    if q_list:
        print("  - Quarantined skills will not load on next session.")
        print("  - Use 'unquarantine <skill>' to restore after review.")
    if b_list:
        print("  - Blocked lines are commented out with .bak backups.")
        print("  - Review blocked code and remove backups when satisfied.")
    print("  - Run 'scan --skills-only' to verify the workspace is clean.")
    print("=" * 60)
    return 2 if q_list else 1

# -- Main --------------------------------------------------------------------

def main():
    p = argparse.ArgumentParser(description="OpenClaw Egress Pro — Full Network DLP Suite")
    sub = p.add_subparsers(dest="command", help="Command to run")
    s = sub.add_parser("scan", help="Full egress scan")
    s.add_argument("--skills-only", action="store_true", help="Only scan skills directory")
    s.add_argument("--workspace", "-w", help="Workspace path")
    for name in ("domains", "status"):
        sp = sub.add_parser(name)
        sp.add_argument("--workspace", "-w", help="Workspace path")
    for name in ("block", "quarantine", "unquarantine"):
        sp = sub.add_parser(name)
        sp.add_argument("skill", help="Skill name")
        sp.add_argument("--workspace", "-w", help="Workspace path")
    al = sub.add_parser("allowlist", help="Manage domain allowlist")
    al.add_argument("--add", metavar="DOMAIN", help="Add domain")
    al.add_argument("--remove", metavar="DOMAIN", help="Remove domain")
    al.add_argument("--show", action="store_true", help="Show allowlist")
    al.add_argument("--workspace", "-w", help="Workspace path")
    sp = sub.add_parser("protect", help="Full automated protection sweep")
    sp.add_argument("--workspace", "-w", help="Workspace path")
    args = p.parse_args()
    if not args.command:
        p.print_help(); sys.exit(1)
    ws = resolve_workspace(getattr(args, "workspace", None))
    if not ws.exists():
        print(f"Workspace not found: {ws}"); sys.exit(1)
    dispatch = {
        "scan": lambda: cmd_scan(ws, args.skills_only),
        "domains": lambda: cmd_domains(ws),
        "status": lambda: cmd_status(ws),
        "block": lambda: cmd_block(ws, args.skill),
        "quarantine": lambda: cmd_quarantine(ws, args.skill),
        "unquarantine": lambda: cmd_unquarantine(ws, args.skill),
        "allowlist": lambda: cmd_allowlist(ws, args.add, args.remove, args.show),
        "protect": lambda: cmd_protect(ws),
    }
    sys.exit(dispatch[args.command]())

if __name__ == "__main__":
    main()
