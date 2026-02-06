#!/usr/bin/env python3
"""OpenClaw Sentinel Pro — Full supply chain security suite for agent skills.

Everything in openclaw-sentinel (free) plus automated countermeasures:
quarantine, reject, SBOM generation, continuous monitoring, and full
automated protection sweeps.

Free version: Alert (detect + report).
Pro version:  Subvert + quarantine + defend.
"""

import argparse, hashlib, io, json, math, os, re, shutil, sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

if sys.platform == "win32" and hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv", "venv",
             ".integrity", ".quarantine", ".snapshots", ".ledger",
             ".signet", ".sentinel"}
SELF_SKILL_DIRS = {"openclaw-sentinel", "openclaw-sentinel-pro"}
SENTINEL_DIR, THREAT_DB_FILE, HISTORY_FILE = ".sentinel", "threats.json", "history.json"
QUARANTINE_PREFIX = ".quarantined-"
STANDARD_DOTFILES = {".gitignore", ".gitattributes", ".gitmodules", ".gitkeep",
    ".editorconfig", ".eslintrc", ".eslintrc.json", ".eslintrc.js",
    ".prettierrc", ".prettierrc.json", ".prettierignore", ".npmrc", ".npmignore",
    ".nvmrc", ".node-version", ".python-version", ".flake8", ".pylintrc",
    ".mypy.ini", ".env.example", ".env.template", ".dockerignore",
    ".browserslistrc", ".claude"}
STANDARD_DOTDIRS = {".git", ".github", ".vscode", ".idea", ".claude"}
WELL_KNOWN_ENV = {"PATH", "HOME", "USER", "SHELL", "TERM", "LANG",
                  "OPENCLAW_WORKSPACE", "PYTHONPATH", "VIRTUAL_ENV"}
POPULAR_NAMES = {"react", "express", "flask", "django", "fastapi", "lodash",
    "axios", "webpack", "babel", "eslint", "pytest", "numpy", "pandas", "tensorflow"}

# Built-in suspicious patterns: (name, description, regex, severity)
_PATTERNS = [
    ("eval-base64-decode", "eval() with base64-decoded payload",
     r"eval\s*\(\s*(?:base64\.)?b64decode\s*\(", "CRITICAL"),
    ("exec-compile-obfuscated", "exec(compile(...)) with potential obfuscation",
     r"exec\s*\(\s*compile\s*\(", "HIGH"),
    ("dynamic-import-os-system", "__import__('os').system(...) dynamic import chain",
     r"__import__\s*\(\s*['\"]os['\"]\s*\)\s*\.\s*system\s*\(", "CRITICAL"),
    ("dynamic-import-subprocess", "Dynamic import of subprocess module",
     r"__import__\s*\(\s*['\"]subprocess['\"]\s*\)", "HIGH"),
    ("subprocess-shell-concat", "subprocess with shell=True and string concatenation",
     r"subprocess\.(?:Popen|call|run)\s*\([^)]*shell\s*=\s*True[^)]*\+", "HIGH"),
    ("subprocess-shell-true", "subprocess with shell=True",
     r"subprocess\.(?:Popen|call|run)\s*\([^)]*shell\s*=\s*True", "MEDIUM"),
    ("urllib-exec-chain", "URL fetch followed by exec/eval (remote code execution)",
     r"(?:urllib|requests).*(?:exec|eval)\s*\(|(?:exec|eval)\s*\(.*(?:urllib|requests)", "CRITICAL"),
    ("urlopen-exec", "urlopen combined with exec/eval",
     r"urlopen\s*\(.*\).*(?:exec|eval)|(?:exec|eval)\s*\(.*urlopen", "CRITICAL"),
    ("eval-encoded-string", "eval() with encoded/decoded string input",
     r"eval\s*\([^)]*(?:decode|encode|bytes\.fromhex|codecs)\s*\(", "CRITICAL"),
    ("exec-encoded-string", "exec() with encoded/decoded string input",
     r"exec\s*\([^)]*(?:decode|encode|bytes\.fromhex|codecs)\s*\(", "CRITICAL"),
    ("os-system-call", "Direct os.system() call",
     r"os\.system\s*\(", "MEDIUM"),
    ("ctypes-import", "ctypes usage (potential native code execution)",
     r"(?:import\s+ctypes|from\s+ctypes\s+import)", "MEDIUM"),
    ("socket-connect", "Direct socket connection (potential C2 channel)",
     r"socket\.socket\s*\(.*\).*\.connect\s*\(", "MEDIUM"),
    ("modify-other-skills", "File write targeting other skill directories",
     r"(?:open|write|Path)\s*\([^)]*skills[/\\\\][^)]*['\"].*['\"].*['\"]w", "HIGH"),
    ("env-var-exfil", "Reading sensitive environment variables",
     r"os\.environ\s*\[.*(?:KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL)", "MEDIUM"),
    ("base64-long-string", "Suspiciously long base64 string literal (>200 chars)",
     r"""['\"][A-Za-z0-9+/]{200,}={0,2}['\"]""", "HIGH"),
    ("hex-encoded-payload", "Long hex string — potential encoded payload",
     r"""(?:bytes\.fromhex|unhexlify)\s*\(\s*['\"][0-9a-fA-F]{64,}['\"]""", "HIGH"),
    ("marshal-loads", "marshal.loads — loading serialized bytecode",
     r"marshal\.loads\s*\(", "HIGH"),
    ("pickle-loads", "pickle.loads — deserialization of arbitrary objects",
     r"pickle\.loads\s*\(", "HIGH"),
]
BUILTIN_PATTERNS = [(n, d, re.compile(r, re.IGNORECASE), s) for n, d, r, s in _PATTERNS]

# ---------------------------------------------------------------------------
# Workspace / utility
# ---------------------------------------------------------------------------
def resolve_workspace(ws_arg):
    if ws_arg: return Path(ws_arg).resolve()
    env = os.environ.get("OPENCLAW_WORKSPACE")
    if env: return Path(env).resolve()
    cwd = Path.cwd()
    if (cwd / "AGENTS.md").exists(): return cwd
    default = Path.home() / ".openclaw" / "workspace"
    return default if default.exists() else cwd

def sentinel_dir(workspace):
    d = workspace / SENTINEL_DIR; d.mkdir(parents=True, exist_ok=True); return d

def scans_dir(workspace):
    d = sentinel_dir(workspace) / "scans"; d.mkdir(parents=True, exist_ok=True); return d

def quarantine_evidence_dir(workspace):
    d = workspace / ".quarantine" / "sentinel"; d.mkdir(parents=True, exist_ok=True); return d

def is_binary(path):
    try:
        with open(path, "rb") as f: return b"\x00" in f.read(8192)
    except (OSError, PermissionError): return True

def sha256_file(path):
    h = hashlib.sha256()
    try:
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""): h.update(chunk)
        return h.hexdigest()
    except (OSError, PermissionError): return None

def shannon_entropy(data):
    if not data: return 0.0
    c = Counter(data); n = len(data)
    return -sum((v/n) * math.log2(v/n) for v in c.values() if v > 0)

def read_safe(path):
    try: return path.read_text(encoding="utf-8", errors="ignore")
    except (OSError, PermissionError): return None

def collect_skill_dirs(workspace):
    sd = workspace / "skills"
    if not sd.exists(): return []
    return [e for e in sorted(sd.iterdir())
            if e.is_dir() and e.name not in SKIP_DIRS and e.name not in SELF_SKILL_DIRS
            and not e.name.startswith(QUARANTINE_PREFIX)]

def collect_quarantined_dirs(workspace):
    sd = workspace / "skills"
    if not sd.exists(): return []
    return [e for e in sorted(sd.iterdir())
            if e.is_dir() and e.name.startswith(QUARANTINE_PREFIX)]

def collect_files(directory):
    files = []
    for root, dirs, fnames in os.walk(directory):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for fn in fnames:
            fp = Path(root) / fn
            if not is_binary(fp): files.append(fp)
    return files

def load_json(path, default):
    if path.exists():
        try: return json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError): pass
    return default

def save_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")

def load_threat_db(ws):
    return load_json(sentinel_dir(ws) / THREAT_DB_FILE,
                     {"hashes": {}, "patterns": [], "meta": {"updated": None, "count": 0}})

def save_threat_db(ws, db):
    db["meta"] = {"updated": datetime.now(timezone.utc).isoformat(),
                  "count": len(db.get("hashes", {})) + len(db.get("patterns", []))}
    save_json(sentinel_dir(ws) / THREAT_DB_FILE, db)

def load_history(ws): return load_json(sentinel_dir(ws) / HISTORY_FILE, {"scans": []})
def save_history(ws, h): save_json(sentinel_dir(ws) / HISTORY_FILE, h)
def now_iso(): return datetime.now(timezone.utc).isoformat()
def now_file(): return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

def file_inventory(skill_dir):
    inv = []
    for root, dirs, fnames in os.walk(skill_dir):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for fn in fnames:
            fp = Path(root) / fn
            try: sz = fp.stat().st_size
            except OSError: sz = 0
            inv.append({"path": str(fp.relative_to(skill_dir)),
                        "sha256": sha256_file(fp), "size": sz, "binary": is_binary(fp)})
    return inv

def parse_skill_meta(skill_dir):
    """Parse metadata from SKILL.md frontmatter. Returns (frontmatter_dict, oc_meta_dict)."""
    skill_md = skill_dir / "SKILL.md"
    if not skill_md.exists(): return {}, {}
    content = read_safe(skill_md)
    if not content or not content.startswith("---"): return {}, {}
    fm = {}
    parts = content.split("---", 2)
    if len(parts) >= 3:
        for line in parts[1].strip().split("\n"):
            if ":" in line:
                k, _, v = line.partition(":"); fm[k.strip()] = v.strip().strip('"').strip("'")
    try: meta = json.loads(fm.get("metadata", "{}"))
    except (json.JSONDecodeError, TypeError): meta = {}
    return fm, meta.get("openclaw", {})

# ---------------------------------------------------------------------------
# Scanning engine
# ---------------------------------------------------------------------------
def check_file_hash(fpath, tdb):
    fh = sha256_file(fpath)
    if fh and fh in tdb.get("hashes", {}):
        info = tdb["hashes"][fh]
        return [{"type": "known-bad-hash", "severity": info.get("severity", "CRITICAL"),
                 "file": str(fpath),
                 "detail": f"Known threat: {info.get('name','?')} — {info.get('description','')}"}]
    return []

def check_patterns(fpath, content, tdb):
    findings, lines = [], content.split("\n")
    for li, line in enumerate(lines, 1):
        for name, desc, compiled, sev in BUILTIN_PATTERNS:
            if compiled.search(line):
                findings.append({"type": f"pattern:{name}", "severity": sev,
                    "file": str(fpath), "line": li, "detail": desc,
                    "match": line.strip()[:120]})
    for tp in tdb.get("patterns", []):
        try: crx = re.compile(tp["regex"], re.IGNORECASE)
        except re.error: continue
        for li, line in enumerate(lines, 1):
            if crx.search(line):
                findings.append({"type": f"threat-pattern:{tp.get('name','custom')}",
                    "severity": tp.get("severity", "HIGH"), "file": str(fpath),
                    "line": li, "detail": tp.get("name", "Custom threat pattern"),
                    "match": line.strip()[:120]})
    return findings

def check_obfuscation(fpath, content):
    findings, lines = [], content.split("\n")
    str_re = re.compile(r"""['\"]([A-Za-z0-9+/=_\-]{50,})['\"]""")
    for li, line in enumerate(lines, 1):
        if len(line) > 1000:
            findings.append({"type": "obfuscation:long-line", "severity": "MEDIUM",
                "file": str(fpath), "line": li,
                "detail": f"Extremely long line ({len(line)} chars) — common in obfuscated code"})
        for m in str_re.finditer(line):
            s = m.group(1); ent = shannon_entropy(s)
            if ent > 5.0 and len(s) > 80:
                findings.append({"type": "obfuscation:high-entropy-string", "severity": "MEDIUM",
                    "file": str(fpath), "line": li,
                    "detail": f"High-entropy string (entropy={ent:.1f}, len={len(s)}) — possible payload"})
    if len(content) > 500 and len(lines) < 5:
        findings.append({"type": "obfuscation:minified", "severity": "MEDIUM",
            "file": str(fpath), "detail": f"Minified ({len(content)}B in {len(lines)} lines)"})
    return findings

def check_install_behaviors(skill_dir, files):
    findings = []
    for fp in files:
        c = read_safe(fp)
        if c is None: continue
        rel = fp.relative_to(skill_dir)
        if rel.name in ("setup.py", "setup.cfg", "pyproject.toml"):
            if "post_install" in c or "cmdclass" in c:
                findings.append({"type": "install:post-install-hook", "severity": "HIGH",
                    "file": str(fp), "detail": "Post-install script hook — code runs on install"})
        if rel.name == "__init__.py" and re.search(r"(?:os\.system|subprocess|exec|eval)\s*\(", c):
            findings.append({"type": "install:init-exec", "severity": "HIGH",
                "file": str(fp), "detail": "__init__.py executes code on import"})
        if re.search(r"""(?:open|write_text|write_bytes)\s*\([^)]*['\"].*skills[/\\\\]""", c):
            findings.append({"type": "install:cross-skill-write", "severity": "HIGH",
                "file": str(fp), "detail": "Write operations targeting other skill directories"})
    return findings

def check_hidden_files(skill_dir):
    findings = []
    for root, dirs, fnames in os.walk(skill_dir):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for d in list(dirs):
            if d.startswith(".") and d not in STANDARD_DOTDIRS:
                findings.append({"type": "hidden:directory", "severity": "MEDIUM",
                    "file": str(Path(root)/d), "detail": f"Non-standard hidden directory: {d}"})
        for fn in fnames:
            if fn.startswith(".") and fn not in STANDARD_DOTFILES:
                findings.append({"type": "hidden:file", "severity": "LOW",
                    "file": str(Path(root)/fn), "detail": f"Non-standard hidden file: {fn}"})
    return findings

def check_metadata(skill_dir):
    findings = []
    skill_md = skill_dir / "SKILL.md"
    if not skill_md.exists():
        return [{"type": "metadata:missing-skill-md", "severity": "MEDIUM",
                 "file": str(skill_dir), "detail": "No SKILL.md — cannot verify declared behavior"}]
    content = read_safe(skill_md)
    if content is None: return findings
    fm, oc = parse_skill_meta(skill_dir)
    # user-invocable mismatch
    ui = fm.get("user-invocable", "true").lower()
    has_scripts = any(f.suffix in (".py", ".sh", ".bash", ".js", ".ts")
                      for f in skill_dir.rglob("*") if f.is_file())
    if ui == "false" and has_scripts:
        findings.append({"type": "metadata:invocable-mismatch", "severity": "MEDIUM",
            "file": str(skill_md),
            "detail": "Declares user-invocable: false but contains executable scripts"})
    # Undeclared binaries
    declared = set(oc.get("requires", {}).get("bins", []))
    actual = set()
    bin_checks = [("node", r"\bnode\b"), ("bash", r"\bbash\b"), ("curl", r"\bcurl\b"),
                  ("git", r"\bgit\b"), ("docker", r"\bdocker\b")]
    for fp in skill_dir.rglob("*"):
        if fp.is_file() and fp.suffix in (".py", ".sh", ".bash", ".js", ".md"):
            fc = read_safe(fp)
            if not fc: continue
            for bname, brx in bin_checks:
                if re.search(brx, fc): actual.add(bname)
    undeclared = actual - declared - {"python3"}
    if undeclared:
        findings.append({"type": "metadata:undeclared-binaries", "severity": "LOW",
            "file": str(skill_md),
            "detail": f"Undeclared binaries: {', '.join(sorted(undeclared))}"})
    # Undeclared env vars
    env_used = set()
    for fp in skill_dir.rglob("*.py"):
        fc = read_safe(fp)
        if not fc: continue
        for m in re.finditer(r'os\.environ(?:\.get)?\s*[\[(]\s*[\'"](\w+)[\'"]', fc):
            env_used.add(m.group(1))
    for var in env_used - WELL_KNOWN_ENV:
        if var not in content:
            findings.append({"type": "metadata:undeclared-env-var", "severity": "LOW",
                "file": str(skill_md), "detail": f"Undocumented env var: {var}"})
    return findings

def check_confusion(skill_dir, all_names):
    findings, name = [], skill_dir.name
    for p in POPULAR_NAMES:
        if name == p or name == f"openclaw-{p}":
            findings.append({"type": "confusion:popular-name-shadow", "severity": "MEDIUM",
                "file": str(skill_dir), "detail": f"Name '{name}' shadows well-known package"})
    for other in all_names:
        if other != name and len(name) == len(other):
            if sum(1 for a, b in zip(name, other) if a != b) == 1:
                findings.append({"type": "confusion:typosquat", "severity": "MEDIUM",
                    "file": str(skill_dir),
                    "detail": f"'{name}' differs from '{other}' by one character"})
    return findings

def scan_skill(skill_dir, workspace, tdb, all_names):
    findings, files = [], collect_files(skill_dir)
    for fp in files: findings.extend(check_file_hash(fp, tdb))
    for fp in files:
        c = read_safe(fp)
        if c is None: continue
        findings.extend(check_patterns(fp, c, tdb))
        findings.extend(check_obfuscation(fp, c))
    findings.extend(check_install_behaviors(skill_dir, files))
    findings.extend(check_hidden_files(skill_dir))
    findings.extend(check_metadata(skill_dir))
    findings.extend(check_confusion(skill_dir, all_names))
    return findings, risk_score(findings)

SEV_WEIGHTS = {"CRITICAL": 30, "HIGH": 15, "MEDIUM": 7, "LOW": 3}
def risk_score(findings):
    if not findings: return 0
    raw = sum(SEV_WEIGHTS.get(f.get("severity", "LOW"), 1) for f in findings)
    return min(int(100 * (1 - math.exp(-raw / 50))), 100)

def risk_label(score):
    if score == 0: return "CLEAN"
    if score < 20: return "LOW"
    if score < 50: return "MODERATE"
    return "HIGH" if score < 75 else "CRITICAL"

# ---------------------------------------------------------------------------
# Print helpers
# ---------------------------------------------------------------------------
def print_findings_by_sev(findings, limit=5):
    by_sev = {}
    for f in findings: by_sev.setdefault(f.get("severity", "LOW"), []).append(f)
    for sev in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]:
        items = by_sev.get(sev, [])
        if items:
            print(f"    [{sev}] {len(items)} finding(s):")
            for it in items[:limit]:
                loc = f" (line {it['line']})" if "line" in it else ""
                print(f"      - {it['detail']}{loc}")
            if len(items) > limit: print(f"      ... and {len(items)-limit} more")

def print_scan_results(results):
    for name in sorted(results):
        r = results[name]; sc = r["score"]; fl = r["findings"]
        print(f"  {name}\n    Risk Score: {sc}/100 [{risk_label(sc)}]")
        if fl: print_findings_by_sev(fl)
        else: print("    No issues detected.")
        print()

# ---------------------------------------------------------------------------
# Commands — Free (scan, inspect, threats, status)
# ---------------------------------------------------------------------------
def cmd_scan(workspace, target_skill=None):
    print("=" * 62); print("OPENCLAW SENTINEL PRO — SUPPLY CHAIN SCAN"); print("=" * 62)
    print(f"Workspace: {workspace}\nTimestamp: {now_iso()}\n")
    tdb = load_threat_db(workspace)
    skill_dirs = collect_skill_dirs(workspace)
    all_names = [d.name for d in skill_dirs]
    if target_skill:
        skill_dirs = [d for d in skill_dirs if d.name == target_skill]
        if not skill_dirs: print(f"Skill not found: {target_skill}"); return 1
    db_n = len(tdb.get("hashes", {})) + len(tdb.get("patterns", []))
    print(f"Scanning {len(skill_dirs)} skill(s)...")
    print(f"Threat DB: {db_n} entries | Built-in patterns: {len(BUILTIN_PATTERNS)}\n")
    results, max_exit = {}, 0
    for sd in skill_dirs:
        f, s = scan_skill(sd, workspace, tdb, all_names)
        results[sd.name] = {"findings": f, "score": s}
    print("-" * 62); print("SCAN RESULTS"); print("-" * 62 + "\n")
    print_scan_results(results)
    for r in results.values():
        if r["score"] >= 50: max_exit = max(max_exit, 2)
        elif r["score"] > 0: max_exit = max(max_exit, 1)
    clean = sum(1 for r in results.values() if r["score"] == 0)
    risky = sum(1 for r in results.values() if r["score"] >= 50)
    print("-" * 62); print("SUMMARY"); print("-" * 62)
    print(f"  Skills scanned: {len(results)}\n  Clean:          {clean}")
    print(f"  Needs review:   {len(results) - clean - risky}\n  High risk:      {risky}\n")
    if risky > 0:
        print("ACTION REQUIRED: High-risk skills detected.")
        print("  Use 'quarantine <skill>' to disable risky skills.")
        print("  Use 'protect' for automated sweep + auto-quarantine.\n")
    elif max_exit == 1: print("REVIEW NEEDED: Some skills have minor findings worth examining.\n")
    else: print("All skills appear clean.\n")
    hist = load_history(workspace)
    hist["scans"].append({"timestamp": now_iso(), "skills_scanned": len(results),
        "clean": clean, "risky": risky,
        "results": {k: {"score": v["score"], "findings_count": len(v["findings"])}
                    for k, v in results.items()}})
    hist["scans"] = hist["scans"][-50:]; save_history(workspace, hist)
    return max_exit

def cmd_inspect(path_arg):
    target = Path(path_arg).resolve()
    if not target.exists(): print(f"Path not found: {target}"); return 1
    if not target.is_dir(): print(f"Not a directory: {target}"); return 1
    print("=" * 62); print("OPENCLAW SENTINEL PRO — PRE-INSTALL INSPECTION"); print("=" * 62)
    print(f"Target:    {target}\nTimestamp: {now_iso()}\n")
    tdb = {"hashes": {}, "patterns": []}
    findings, score = scan_skill(target, target.parent, tdb, [])
    files = collect_files(target)
    bins_used, net_calls, file_ops = set(), [], []
    for fp in files:
        c = read_safe(fp)
        if c is None: continue
        for m in re.finditer(r"subprocess\.(?:run|call|Popen|check_output)\s*\(\s*\[?\s*['\"](\w+)['\"]", c):
            bins_used.add(m.group(1))
        if re.search(r"\bos\.system\s*\(", c): bins_used.add("os.system")
        if re.search(r"(?:urllib|requests|http\.client|socket|urlopen)", c):
            for li, ln in enumerate(c.split("\n"), 1):
                if re.search(r"(?:urllib|requests|http\.client|urlopen)", ln):
                    net_calls.append((str(fp.relative_to(target)), li, ln.strip()[:100]))
        for li, ln in enumerate(c.split("\n"), 1):
            if re.search(r"(?:open\s*\(|write_text|write_bytes|os\.remove|os\.unlink|shutil\.)", ln):
                if "sentinel" not in ln.lower():
                    file_ops.append((str(fp.relative_to(target)), li, ln.strip()[:100]))
    print(f"Files: {len(files)}\n")
    if bins_used:
        print("Binaries / External Commands:")
        for b in sorted(bins_used): print(f"  - {b}")
        print()
    if net_calls:
        print(f"Network Calls ({len(net_calls)}):")
        for f, l, c in net_calls[:10]: print(f"  {f}:{l} — {c}")
        if len(net_calls) > 10: print(f"  ... and {len(net_calls)-10} more")
        print()
    if file_ops:
        print(f"File Operations ({len(file_ops)}):")
        for f, l, c in file_ops[:10]: print(f"  {f}:{l} — {c}")
        if len(file_ops) > 10: print(f"  ... and {len(file_ops)-10} more")
        print()
    if findings:
        print("-" * 62); print("FINDINGS"); print("-" * 62 + "\n")
        for sev in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]:
            items = [f for f in findings if f.get("severity") == sev]
            if items:
                print(f"  [{sev}]")
                for it in items:
                    loc = f" (line {it['line']})" if "line" in it else ""
                    print(f"    - {it['detail']}{loc}")
                print()
    print("-" * 62)
    if score == 0: rec, msg = "SAFE", "No supply chain risks detected. Safe to install."
    elif score < 30: rec, msg = "REVIEW", "Minor findings detected. Review before installing."
    else: rec, msg = "REJECT", "Significant risks detected. Do not install without thorough review."
    print(f"Risk Score:     {score}/100 [{risk_label(score)}]")
    print(f"Recommendation: [{rec}] {msg}\n")
    return 2 if rec == "REJECT" else (1 if rec == "REVIEW" else 0)

def cmd_threats(workspace, update_from=None):
    tdb = load_threat_db(workspace)
    if update_from:
        ip = Path(update_from).resolve()
        if not ip.exists(): print(f"File not found: {ip}"); return 1
        try: new = json.loads(ip.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as e: print(f"Parse failed: {e}"); return 1
        if not isinstance(new, dict):
            print("Invalid format: expected JSON with 'hashes' and/or 'patterns'"); return 1
        nh = new.get("hashes", {}); bh = len(tdb.get("hashes", {}))
        if isinstance(nh, dict): tdb.setdefault("hashes", {}).update(nh)
        ah = len(tdb.get("hashes", {})) - bh
        np_list, existing = new.get("patterns", []), {p.get("name") for p in tdb.get("patterns",[])}
        ap = 0
        if isinstance(np_list, list):
            for p in np_list:
                if isinstance(p, dict) and p.get("name") not in existing:
                    tdb.setdefault("patterns", []).append(p); existing.add(p.get("name")); ap += 1
        save_threat_db(workspace, tdb)
        print(f"Threat database updated.")
        print(f"  Hashes added:  {ah} (total: {len(tdb.get('hashes', {}))})")
        print(f"  Patterns added: {ap} (total: {len(tdb.get('patterns', []))})")
        print(f"  Source: {ip}\n"); return 0
    print("=" * 62); print("OPENCLAW SENTINEL PRO — THREAT DATABASE"); print("=" * 62 + "\n")
    hashes, patterns = tdb.get("hashes", {}), tdb.get("patterns", [])
    meta = tdb.get("meta", {})
    print(f"  Known-bad hashes:  {len(hashes)}")
    print(f"  Custom patterns:   {len(patterns)}")
    print(f"  Built-in patterns: {len(BUILTIN_PATTERNS)}")
    print(f"  Total signatures:  {len(hashes) + len(patterns) + len(BUILTIN_PATTERNS)}")
    print(f"  Last updated:      {meta.get('updated', 'never')}\n")
    print(f"  DB location: {sentinel_dir(workspace) / THREAT_DB_FILE}\n")
    if hashes:
        print("  Hash entries by severity:")
        sc = {}
        for h in hashes.values(): s = h.get("severity","?"); sc[s] = sc.get(s,0)+1
        for s in ["CRITICAL","HIGH","MEDIUM","LOW"]:
            if s in sc: print(f"    {s}: {sc[s]}")
        print()
    if patterns:
        print("  Custom pattern entries:")
        for p in patterns[:10]: print(f"    - {p.get('name','unnamed')} [{p.get('severity','?')}]")
        if len(patterns) > 10: print(f"    ... and {len(patterns)-10} more")
        print()
    print("To import: python3 sentinel.py threats --update-from threats.json\n")
    print('Format: {"hashes": {"<sha256>": {"name": "...", "severity": "...", "description": "..."}},')
    print('        "patterns": [{"name": "...", "regex": "...", "severity": "..."}]}\n')
    return 0

def cmd_status(workspace):
    skill_dirs = collect_skill_dirs(workspace)
    quarantined = collect_quarantined_dirs(workspace)
    hist = load_history(workspace); tdb = load_threat_db(workspace)
    db_n = len(tdb.get("hashes", {})) + len(tdb.get("patterns", []))
    scans = hist.get("scans", []); last = scans[-1] if scans else None
    print("=" * 62); print("OPENCLAW SENTINEL PRO — STATUS"); print("=" * 62 + "\n")
    print(f"  Installed skills:   {len(skill_dirs)}")
    print(f"  Quarantined skills: {len(quarantined)}")
    print(f"  Threat DB entries:  {db_n} custom + {len(BUILTIN_PATTERNS)} built-in")
    print(f"  Total scans:        {len(scans)}\n")
    if quarantined:
        print("  Quarantined:")
        for q in quarantined:
            print(f"    - {q.name[len(QUARANTINE_PREFIX):]} (dir: {q.name})")
        print()
    if last:
        print(f"  Last scan:          {last['timestamp']}")
        print(f"  Skills scanned:     {last.get('skills_scanned','?')}")
        print(f"  Clean:              {last.get('clean','?')}")
        print(f"  High risk:          {last.get('risky','?')}\n")
        res = last.get("results", {})
        if res:
            print("  Risk scores from last scan:")
            for n in sorted(res):
                r = res[n]; sc = r.get("score",0)
                print(f"    {n}: {sc}/100 [{risk_label(sc)}] ({r.get('findings_count',0)} finding(s))")
            print()
    else: print("  No scans yet. Run: sentinel.py scan\n")
    sbom_files = sorted(sentinel_dir(workspace).glob("sbom-*.json"))
    if sbom_files: print(f"  Last SBOM: {sbom_files[-1].name}\n")
    scan_files = sorted(scans_dir(workspace).glob("scan-*.json"))
    if scan_files: print(f"  Monitor scan files: {len(scan_files)} (latest: {scan_files[-1].name})\n")
    if last:
        if last.get("risky", 0) > 0:
            print(f"[WARNING] {last['risky']} high-risk skill(s) in last scan."); return 1
        print("[OK] No high-risk skills in last scan."); return 0
    print("[INFO] Run a scan to assess your workspace."); return 0

# ---------------------------------------------------------------------------
# Commands — Pro (quarantine, unquarantine, reject, sbom, monitor, protect)
# ---------------------------------------------------------------------------
def cmd_quarantine(workspace, skill_name):
    skills_dir = workspace / "skills"
    skill_path = skills_dir / skill_name
    quarantined_path = skills_dir / f"{QUARANTINE_PREFIX}{skill_name}"
    if not skill_path.exists():
        if quarantined_path.exists(): print(f"Skill already quarantined: {skill_name}"); return 0
        print(f"Skill not found: {skill_name}"); return 1
    if not skill_path.is_dir(): print(f"Not a skill directory: {skill_path}"); return 1
    print("=" * 62); print("OPENCLAW SENTINEL PRO — QUARANTINE"); print("=" * 62)
    print(f"Skill:     {skill_name}\nTimestamp: {now_iso()}\n")
    tdb = load_threat_db(workspace)
    all_names = [d.name for d in collect_skill_dirs(workspace)]
    findings, score = scan_skill(skill_path, workspace, tdb, all_names)
    evidence = {"skill": skill_name, "quarantined_at": now_iso(),
        "risk_score": score, "risk_label": risk_label(score),
        "findings_count": len(findings), "findings": findings[:50],
        "original_path": str(skill_path), "quarantined_path": str(quarantined_path),
        "file_inventory": file_inventory(skill_path)}
    ev_path = quarantine_evidence_dir(workspace) / f"{skill_name}-evidence.json"
    save_json(ev_path, evidence)
    try: skill_path.rename(quarantined_path)
    except OSError as e: print(f"Failed to quarantine: {e}"); return 1
    print(f"  Risk Score: {score}/100 [{risk_label(score)}]")
    print(f"  Findings:   {len(findings)}")
    print(f"  Renamed:    {skill_name} -> {QUARANTINE_PREFIX}{skill_name}")
    print(f"  Evidence:   {ev_path}\n")
    print(f"[QUARANTINED] {skill_name} has been disabled.")
    print(f"  To restore: sentinel.py unquarantine {skill_name}\n")
    return 0

def cmd_unquarantine(workspace, skill_name):
    skills_dir = workspace / "skills"
    quarantined_path = skills_dir / f"{QUARANTINE_PREFIX}{skill_name}"
    skill_path = skills_dir / skill_name
    if not quarantined_path.exists():
        if skill_path.exists(): print(f"Skill is not quarantined: {skill_name}"); return 0
        print(f"Quarantined skill not found: {skill_name}"); return 1
    print("=" * 62); print("OPENCLAW SENTINEL PRO — UNQUARANTINE"); print("=" * 62)
    print(f"Skill:     {skill_name}\nTimestamp: {now_iso()}\n")
    ev_path = quarantine_evidence_dir(workspace) / f"{skill_name}-evidence.json"
    if ev_path.exists():
        ev = load_json(ev_path, {})
        print(f"  Original quarantine: {ev.get('quarantined_at', 'unknown')}")
        print(f"  Risk at quarantine:  {ev.get('risk_score', '?')}/100 [{ev.get('risk_label', '?')}]")
        print(f"  Findings at time:    {ev.get('findings_count', '?')}\n")
    if skill_path.exists():
        print(f"Cannot restore: {skill_name} already exists at {skill_path}"); return 1
    try: quarantined_path.rename(skill_path)
    except OSError as e: print(f"Failed to unquarantine: {e}"); return 1
    print(f"  Restored: {QUARANTINE_PREFIX}{skill_name} -> {skill_name}\n")
    print(f"[RESTORED] {skill_name} has been re-enabled.")
    print(f"  Recommend running a fresh scan: sentinel.py scan {skill_name}\n")
    return 0

def cmd_reject(workspace, skill_name):
    skills_dir = workspace / "skills"
    skill_path = skills_dir / skill_name
    if not skill_path.exists():
        qp = skills_dir / f"{QUARANTINE_PREFIX}{skill_name}"
        if qp.exists(): skill_path = qp
        else: print(f"Skill not found: {skill_name}"); return 1
    if not skill_path.is_dir(): print(f"Not a skill directory: {skill_path}"); return 1
    print("=" * 62); print("OPENCLAW SENTINEL PRO — REJECT SKILL"); print("=" * 62)
    print(f"Skill:     {skill_name}\nTimestamp: {now_iso()}\n")
    tdb = load_threat_db(workspace)
    all_names = [d.name for d in collect_skill_dirs(workspace)]
    findings, score = scan_skill(skill_path, workspace, tdb, all_names)
    print(f"  Risk Score: {score}/100 [{risk_label(score)}]\n  Findings:   {len(findings)}\n")
    if score < 50:
        print(f"[BLOCKED] Risk score {score} is below HIGH threshold (50).")
        print(f"  Use 'quarantine {skill_name}' to disable without removal.")
        print(f"  Reject is reserved for HIGH+ risk skills.\n"); return 1
    evidence = {"skill": skill_name, "rejected_at": now_iso(),
        "risk_score": score, "risk_label": risk_label(score),
        "findings_count": len(findings), "findings": findings[:50],
        "original_path": str(skill_path), "file_inventory": file_inventory(skill_path)}
    ev_dir = quarantine_evidence_dir(workspace)
    save_json(ev_dir / f"{skill_name}-evidence.json", evidence)
    reject_dest = ev_dir / skill_name
    if reject_dest.exists(): shutil.rmtree(reject_dest)
    try: shutil.move(str(skill_path), str(reject_dest))
    except OSError as e: print(f"Failed to move skill: {e}"); return 1
    print(f"  Archived to: {reject_dest}")
    print(f"  Evidence:    {ev_dir / f'{skill_name}-evidence.json'}\n")
    print(f"[REJECTED] {skill_name} has been removed from the workspace.")
    print(f"  The skill files are preserved in {ev_dir} for forensic review.\n")
    return 0

def cmd_sbom(workspace):
    print("=" * 62); print("OPENCLAW SENTINEL PRO — SBOM GENERATION"); print("=" * 62)
    print(f"Workspace: {workspace}\nTimestamp: {now_iso()}\n")
    tdb = load_threat_db(workspace)
    skill_dirs = collect_skill_dirs(workspace)
    all_names = [d.name for d in skill_dirs]
    print(f"Processing {len(skill_dirs)} skill(s)...\n")
    skills_data = []
    for sd in skill_dirs:
        inv = file_inventory(sd)
        _, oc = parse_skill_meta(sd)
        declared_deps = oc.get("requires", {}).get("bins", [])
        # Detect actual deps
        detected = set()
        dep_checks = [("python3", r"\bpython3?\b"), ("node", r"\bnode\b"), ("bash", r"\bbash\b"),
                      ("curl", r"\bcurl\b"), ("git", r"\bgit\b"), ("docker", r"\bdocker\b")]
        for fp in sd.rglob("*"):
            if fp.is_file() and fp.suffix in (".py", ".sh", ".js", ".ts"):
                fc = read_safe(fp)
                if not fc: continue
                for bname, brx in dep_checks:
                    if re.search(brx, fc): detected.add(bname)
        findings, score = scan_skill(sd, workspace, tdb, all_names)
        skills_data.append({"name": sd.name, "path": str(sd),
            "risk_score": score, "risk_label": risk_label(score),
            "findings_count": len(findings), "file_count": len(inv),
            "total_size": sum(f["size"] for f in inv),
            "declared_dependencies": declared_deps,
            "detected_dependencies": sorted(detected), "files": inv})
    ts = datetime.now(timezone.utc)
    sbom = {"sbom_version": "1.0", "generator": "openclaw-sentinel-pro",
        "generated_at": ts.isoformat(), "workspace": str(workspace),
        "summary": {"total_skills": len(skills_data),
            "total_files": sum(s["file_count"] for s in skills_data),
            "total_size": sum(s["total_size"] for s in skills_data),
            "clean": sum(1 for s in skills_data if s["risk_score"] == 0),
            "low_risk": sum(1 for s in skills_data if 0 < s["risk_score"] < 20),
            "moderate_risk": sum(1 for s in skills_data if 20 <= s["risk_score"] < 50),
            "high_risk": sum(1 for s in skills_data if 50 <= s["risk_score"] < 75),
            "critical_risk": sum(1 for s in skills_data if s["risk_score"] >= 75)},
        "skills": skills_data}
    filename = f"sbom-{ts.strftime('%Y%m%dT%H%M%SZ')}.json"
    sbom_path = sentinel_dir(workspace) / filename
    save_json(sbom_path, sbom)
    summ = sbom["summary"]
    print("-" * 62); print("SBOM SUMMARY"); print("-" * 62 + "\n")
    print(f"  Skills:        {summ['total_skills']}")
    print(f"  Total files:   {summ['total_files']}")
    print(f"  Total size:    {summ['total_size']:,} bytes\n")
    print(f"  Clean:         {summ['clean']}\n  Low risk:      {summ['low_risk']}")
    print(f"  Moderate risk: {summ['moderate_risk']}\n  High risk:     {summ['high_risk']}")
    print(f"  Critical risk: {summ['critical_risk']}\n")
    print("  Per-skill breakdown:")
    for s in skills_data:
        dep_str = ", ".join(s["declared_dependencies"]) if s["declared_dependencies"] else "none"
        print(f"    {s['name']}: {s['risk_score']}/100 [{s['risk_label']}] "
              f"| {s['file_count']} files | deps: {dep_str}")
    print(f"\nSBOM saved: {sbom_path}\n")
    return 0

def cmd_monitor(workspace):
    print("=" * 62); print("OPENCLAW SENTINEL PRO — MONITOR"); print("=" * 62)
    print(f"Workspace: {workspace}\nTimestamp: {now_iso()}\n")
    tdb = load_threat_db(workspace)
    skill_dirs = collect_skill_dirs(workspace)
    all_names = [d.name for d in skill_dirs]
    current = {}
    for sd in skill_dirs:
        findings, score = scan_skill(sd, workspace, tdb, all_names)
        current[sd.name] = {"score": score, "label": risk_label(score),
            "findings_count": len(findings),
            "findings": [{"type": f.get("type"), "severity": f.get("severity"),
                          "detail": f.get("detail"), "file": f.get("file")} for f in findings]}
    ts = datetime.now(timezone.utc)
    scan_file = scans_dir(workspace) / f"scan-{ts.strftime('%Y%m%dT%H%M%SZ')}.json"
    save_json(scan_file, {"timestamp": ts.isoformat(),
        "skills_scanned": len(current), "results": current})
    # Load previous for comparison
    scan_files = sorted(scans_dir(workspace).glob("scan-*.json"))
    previous = load_json(scan_files[-2], None) if len(scan_files) >= 2 else None
    print(f"Skills scanned: {len(current)}\nScan saved:     {scan_file}\n")
    if previous is None:
        print("No previous scan found — this is the baseline.\n")
        print("-" * 62); print("CURRENT STATE"); print("-" * 62 + "\n")
        for name in sorted(current):
            r = current[name]
            print(f"  {name}: {r['score']}/100 [{r['label']}] ({r['findings_count']} finding(s))")
        print("\n[INFO] Run monitor again later to detect changes.\n"); return 0
    prev_results = previous.get("results", {})
    print(f"Comparing against: {previous.get('timestamp', 'unknown')}\n")
    new_skills = set(current.keys()) - set(prev_results.keys())
    removed_skills = set(prev_results.keys()) - set(current.keys())
    common = set(current.keys()) & set(prev_results.keys())
    changed, new_threats, resolved = [], [], []
    for name in common:
        cur, prev = current[name], prev_results[name]
        if cur["score"] != prev.get("score", 0):
            changed.append({"skill": name, "old": prev.get("score", 0),
                "old_l": prev.get("label", "?"), "new": cur["score"], "new_l": cur["label"]})
        diff = cur["findings_count"] - prev.get("findings_count", 0)
        if diff > 0: new_threats.append({"skill": name, "delta": diff})
        elif diff < 0: resolved.append({"skill": name, "delta": -diff})
    has_changes = new_skills or removed_skills or changed or new_threats
    print("-" * 62); print("MONITOR REPORT"); print("-" * 62 + "\n")
    if new_skills:
        print(f"  NEW SKILLS ({len(new_skills)}):")
        for n in sorted(new_skills):
            r = current[n]; print(f"    + {n}: {r['score']}/100 [{r['label']}]")
        print()
    if removed_skills:
        print(f"  REMOVED/QUARANTINED ({len(removed_skills)}):")
        for n in sorted(removed_skills): print(f"    - {n}")
        print()
    if changed:
        print(f"  RISK SCORE CHANGES ({len(changed)}):")
        for ch in sorted(changed, key=lambda x: x["new"], reverse=True):
            d = "UP" if ch["new"] > ch["old"] else "DOWN"
            print(f"    {ch['skill']}: {ch['old']} [{ch['old_l']}] -> {ch['new']} [{ch['new_l']}] ({d})")
        print()
    if new_threats:
        print(f"  NEW THREATS ({sum(t['delta'] for t in new_threats)} new finding(s)):")
        for t in new_threats: print(f"    {t['skill']}: +{t['delta']} finding(s)")
        print()
    if resolved:
        print(f"  RESOLVED ({sum(t['delta'] for t in resolved)} finding(s)):")
        for t in resolved: print(f"    {t['skill']}: -{t['delta']} finding(s)")
        print()
    if not has_changes: print("  No changes detected since last scan.\n")
    print("-" * 62); print("CURRENT SCORES"); print("-" * 62 + "\n")
    for name in sorted(current):
        r = current[name]; print(f"  {name}: {r['score']}/100 [{r['label']}]")
    print()
    max_exit = 0
    for r in current.values():
        if r["score"] >= 50: max_exit = 2
        elif r["score"] > 0 and max_exit < 1: max_exit = 1
    if max_exit == 2: print("[WARNING] High-risk skills detected. Use 'protect' for automated response.\n")
    elif new_threats: print("[ALERT] New threats detected since last scan.\n")
    elif has_changes: print("[INFO] Changes detected. Review above.\n")
    else: print("[OK] Workspace unchanged since last scan.\n")
    return max_exit

def cmd_protect(workspace):
    print("=" * 62); print("OPENCLAW SENTINEL PRO — PROTECT"); print("=" * 62)
    print(f"Workspace: {workspace}\nTimestamp: {now_iso()}\n")
    print("Running full automated protection sweep...\n")
    tdb = load_threat_db(workspace)
    skill_dirs = collect_skill_dirs(workspace)
    all_names = [d.name for d in skill_dirs]
    # Phase 1: Scan
    print("[1/4] Scanning all installed skills...")
    results = {}
    for sd in skill_dirs:
        f, s = scan_skill(sd, workspace, tdb, all_names)
        results[sd.name] = {"findings": f, "score": s, "path": sd}
    clean = sum(1 for r in results.values() if r["score"] == 0)
    critical = sum(1 for r in results.values() if r["score"] >= 75)
    print(f"  Scanned {len(results)} skills: {clean} clean, "
          f"{len(results)-clean-critical} review, {critical} critical\n")
    # Phase 2: Auto-quarantine CRITICAL
    print("[2/4] Auto-quarantining CRITICAL risk skills...")
    q_names = []
    for name in sorted(results):
        r = results[name]
        if r["score"] >= 75:
            sp, qp = r["path"], r["path"].parent / f"{QUARANTINE_PREFIX}{name}"
            evidence = {"skill": name, "quarantined_at": now_iso(),
                "quarantined_by": "protect (auto)", "risk_score": r["score"],
                "risk_label": risk_label(r["score"]), "findings_count": len(r["findings"]),
                "findings": r["findings"][:50], "original_path": str(sp),
                "quarantined_path": str(qp), "file_inventory": file_inventory(sp)}
            save_json(quarantine_evidence_dir(workspace) / f"{name}-evidence.json", evidence)
            try: sp.rename(qp); q_names.append(name); print(f"  QUARANTINED: {name} (score: {r['score']}/100)")
            except OSError as e: print(f"  FAILED to quarantine {name}: {e}")
    if not q_names: print("  No skills require quarantine.")
    else: print(f"  {len(q_names)} skill(s) quarantined.")
    print()
    # Phase 3: SBOM
    print("[3/4] Generating SBOM...")
    remaining = collect_skill_dirs(workspace)
    remaining_names = [d.name for d in remaining]
    skills_sbom = []
    for sd in remaining:
        inv = file_inventory(sd)
        _, oc = parse_skill_meta(sd)
        declared = oc.get("requires", {}).get("bins", [])
        findings, score = scan_skill(sd, workspace, tdb, remaining_names)
        skills_sbom.append({"name": sd.name, "path": str(sd),
            "risk_score": score, "risk_label": risk_label(score),
            "findings_count": len(findings), "file_count": len(inv),
            "total_size": sum(f["size"] for f in inv),
            "declared_dependencies": declared, "files": inv})
    ts = datetime.now(timezone.utc)
    sbom = {"sbom_version": "1.0", "generator": "openclaw-sentinel-pro/protect",
        "generated_at": ts.isoformat(), "workspace": str(workspace),
        "summary": {"total_skills": len(skills_sbom),
            "total_files": sum(s["file_count"] for s in skills_sbom),
            "clean": sum(1 for s in skills_sbom if s["risk_score"] == 0),
            "risky": sum(1 for s in skills_sbom if s["risk_score"] >= 50)},
        "skills": skills_sbom}
    sbom_path = sentinel_dir(workspace) / f"sbom-{ts.strftime('%Y%m%dT%H%M%SZ')}.json"
    save_json(sbom_path, sbom)
    print(f"  SBOM saved: {sbom_path}\n")
    # Phase 4: Scan history
    print("[4/4] Updating scan history...")
    scan_results = {}
    for sd in remaining:
        findings, score = scan_skill(sd, workspace, tdb, remaining_names)
        scan_results[sd.name] = {"score": score, "label": risk_label(score),
            "findings_count": len(findings)}
    save_json(scans_dir(workspace) / f"scan-{ts.strftime('%Y%m%dT%H%M%SZ')}.json",
        {"timestamp": ts.isoformat(), "skills_scanned": len(scan_results),
         "triggered_by": "protect", "results": scan_results})
    hist = load_history(workspace)
    hist["scans"].append({"timestamp": ts.isoformat(),
        "skills_scanned": len(scan_results),
        "clean": sum(1 for r in scan_results.values() if r["score"] == 0),
        "risky": sum(1 for r in scan_results.values() if r["score"] >= 50),
        "quarantined": q_names, "triggered_by": "protect",
        "results": {k: {"score": v["score"], "findings_count": v["findings_count"]}
                    for k, v in scan_results.items()}})
    hist["scans"] = hist["scans"][-50:]; save_history(workspace, hist)
    print("  Scan history updated.\n")
    # Report
    print("=" * 62); print("PROTECTION REPORT"); print("=" * 62 + "\n")
    r_clean = sum(1 for s in skills_sbom if s["risk_score"] == 0)
    r_risky = sum(1 for s in skills_sbom if s["risk_score"] >= 50)
    print(f"  Skills scanned:     {len(results)}")
    print(f"  Auto-quarantined:   {len(q_names)}")
    print(f"  Remaining skills:   {len(remaining)}")
    print(f"  Remaining clean:    {r_clean}")
    print(f"  Remaining risky:    {r_risky}\n")
    if q_names:
        print("  Quarantined skills:")
        for n in q_names:
            r = results[n]; print(f"    - {n} (score: {r['score']}/100 [{risk_label(r['score'])}])")
        print()
    if r_risky > 0:
        print("  Remaining risky skills:")
        for s in skills_sbom:
            if s["risk_score"] >= 50:
                print(f"    - {s['name']} (score: {s['risk_score']}/100 [{s['risk_label']}])")
        print("\n[WARNING] Some HIGH-risk skills remain. Review or reject manually.\n")
    elif q_names: print("[PROTECTED] Critical threats quarantined. Workspace secured.\n")
    else: print("[OK] No threats detected. Workspace is clean.\n")
    max_exit = 0
    if q_names or r_risky > 0: max_exit = 2
    elif any(r["score"] > 0 for r in scan_results.values()): max_exit = 1
    return max_exit

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    pa = argparse.ArgumentParser(description="OpenClaw Sentinel Pro — Full supply chain security suite")
    pa.add_argument("--workspace", "-w", help="Workspace path")
    sub = pa.add_subparsers(dest="command")
    # Free
    ps = sub.add_parser("scan", help="Scan installed skills"); ps.add_argument("skill", nargs="?")
    pi = sub.add_parser("inspect", help="Pre-install inspection"); pi.add_argument("path")
    pt = sub.add_parser("threats", help="Manage threat DB"); pt.add_argument("--update-from")
    sub.add_parser("status", help="Quick status summary")
    # Pro
    pq = sub.add_parser("quarantine", help="Quarantine a risky skill"); pq.add_argument("skill")
    pu = sub.add_parser("unquarantine", help="Restore quarantined skill"); pu.add_argument("skill")
    pr = sub.add_parser("reject", help="Remove HIGH+ risk skill"); pr.add_argument("skill")
    sub.add_parser("sbom", help="Generate Software Bill of Materials")
    sub.add_parser("monitor", help="Compare current vs previous scan")
    sub.add_parser("protect", help="Full automated sweep")
    args = pa.parse_args()
    if not args.command: pa.print_help(); sys.exit(1)
    if args.command == "inspect": sys.exit(cmd_inspect(args.path))
    ws = resolve_workspace(args.workspace)
    if not ws.exists(): print(f"Workspace not found: {ws}"); sys.exit(1)
    dispatch = {"scan": lambda: cmd_scan(ws, target_skill=args.skill),
                "threats": lambda: cmd_threats(ws, update_from=args.update_from),
                "status": lambda: cmd_status(ws),
                "quarantine": lambda: cmd_quarantine(ws, args.skill),
                "unquarantine": lambda: cmd_unquarantine(ws, args.skill),
                "reject": lambda: cmd_reject(ws, args.skill),
                "sbom": lambda: cmd_sbom(ws), "monitor": lambda: cmd_monitor(ws),
                "protect": lambda: cmd_protect(ws)}
    sys.exit(dispatch[args.command]())

if __name__ == "__main__":
    main()
