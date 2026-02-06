#!/usr/bin/env python3
"""OpenClaw Sentinel — Supply chain security for agent skills.

Pre-install inspection, post-install scanning, obfuscation detection,
known-bad signature matching, and risk scoring for installed skills.

Free version: Alert (detect + report).
Pro version: Quarantine, block, community threat feeds, SBOM, continuous monitoring.
"""

import argparse, hashlib, io, json, math, os, re, sys
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
            if e.is_dir() and e.name not in SKIP_DIRS and e.name not in SELF_SKILL_DIRS]

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
    # Parse YAML frontmatter
    fm = {}
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            for line in parts[1].strip().split("\n"):
                if ":" in line:
                    k, _, v = line.partition(":"); fm[k.strip()] = v.strip().strip('"').strip("'")
    # user-invocable mismatch
    ui = fm.get("user-invocable", "true").lower()
    has_scripts = any(f.suffix in (".py", ".sh", ".bash", ".js", ".ts")
                      for f in skill_dir.rglob("*") if f.is_file())
    if ui == "false" and has_scripts:
        findings.append({"type": "metadata:invocable-mismatch", "severity": "MEDIUM",
            "file": str(skill_md),
            "detail": "Declares user-invocable: false but contains executable scripts"})
    # Undeclared binaries
    try:
        meta = json.loads(fm.get("metadata", "{}"))
        declared = set(meta.get("openclaw", {}).get("requires", {}).get("bins", []))
    except (json.JSONDecodeError, TypeError, AttributeError): declared = set()
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
# Commands
# ---------------------------------------------------------------------------
def cmd_scan(workspace, target_skill=None):
    print("=" * 62); print("OPENCLAW SENTINEL — SUPPLY CHAIN SCAN"); print("=" * 62)
    print(f"Workspace: {workspace}")
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}\n")
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
    for name in sorted(results):
        r = results[name]; sc = r["score"]; fl = r["findings"]
        print(f"  {name}\n    Risk Score: {sc}/100 [{risk_label(sc)}]")
        if fl:
            by_sev = {}
            for f in fl: by_sev.setdefault(f.get("severity", "LOW"), []).append(f)
            for sev in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]:
                items = by_sev.get(sev, [])
                if items:
                    print(f"    [{sev}] {len(items)} finding(s):")
                    for it in items[:5]:
                        loc = f" (line {it['line']})" if "line" in it else ""
                        print(f"      - {it['detail']}{loc}")
                    if len(items) > 5: print(f"      ... and {len(items)-5} more")
        else: print("    No issues detected.")
        print()
        if sc >= 50: max_exit = max(max_exit, 2)
        elif sc > 0: max_exit = max(max_exit, 1)
    clean = sum(1 for r in results.values() if r["score"] == 0)
    risky = sum(1 for r in results.values() if r["score"] >= 50)
    print("-" * 62); print("SUMMARY"); print("-" * 62)
    print(f"  Skills scanned: {len(results)}")
    print(f"  Clean:          {clean}")
    print(f"  Needs review:   {len(results) - clean - risky}")
    print(f"  High risk:      {risky}\n")
    if risky > 0:
        print("ACTION REQUIRED: High-risk skills detected. Review findings above.\n")
        print("Upgrade to openclaw-sentinel-pro for automated countermeasures:")
        print("  quarantine, blocking, community threat feeds, SBOM generation")
    elif max_exit == 1: print("REVIEW NEEDED: Some skills have minor findings worth examining.")
    else: print("All skills appear clean.")
    print()
    hist = load_history(workspace)
    hist["scans"].append({"timestamp": datetime.now(timezone.utc).isoformat(),
        "skills_scanned": len(results), "clean": clean, "risky": risky,
        "results": {k: {"score": v["score"], "findings_count": len(v["findings"])}
                    for k, v in results.items()}})
    hist["scans"] = hist["scans"][-50:]
    save_history(workspace, hist)
    return max_exit

def cmd_inspect(path_arg):
    target = Path(path_arg).resolve()
    if not target.exists(): print(f"Path not found: {target}"); return 1
    if not target.is_dir(): print(f"Not a directory: {target}"); return 1
    print("=" * 62); print("OPENCLAW SENTINEL — PRE-INSTALL INSPECTION"); print("=" * 62)
    print(f"Target:    {target}")
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}\n")
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
        nh = new.get("hashes", {})
        bh = len(tdb.get("hashes", {}))
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
    print("=" * 62); print("OPENCLAW SENTINEL — THREAT DATABASE"); print("=" * 62 + "\n")
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
    hist = load_history(workspace); tdb = load_threat_db(workspace)
    db_n = len(tdb.get("hashes", {})) + len(tdb.get("patterns", []))
    scans = hist.get("scans", []); last = scans[-1] if scans else None
    print("=" * 62); print("OPENCLAW SENTINEL — STATUS"); print("=" * 62 + "\n")
    print(f"  Installed skills:   {len(skill_dirs)}")
    print(f"  Threat DB entries:  {db_n} custom + {len(BUILTIN_PATTERNS)} built-in")
    print(f"  Total scans:        {len(scans)}\n")
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
    if last:
        if last.get("risky", 0) > 0:
            print(f"[WARNING] {last['risky']} high-risk skill(s) in last scan."); return 1
        print("[OK] No high-risk skills in last scan."); return 0
    print("[INFO] Run a scan to assess your workspace."); return 0

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    pa = argparse.ArgumentParser(description="OpenClaw Sentinel — Supply chain security")
    pa.add_argument("--workspace", "-w", help="Workspace path")
    sub = pa.add_subparsers(dest="command")
    ps = sub.add_parser("scan", help="Scan installed skills"); ps.add_argument("skill", nargs="?")
    pi = sub.add_parser("inspect", help="Pre-install inspection"); pi.add_argument("path")
    pt = sub.add_parser("threats", help="Manage threat DB"); pt.add_argument("--update-from")
    sub.add_parser("status", help="Quick status summary")
    args = pa.parse_args()
    if not args.command: pa.print_help(); sys.exit(1)
    if args.command == "inspect": sys.exit(cmd_inspect(args.path))
    ws = resolve_workspace(args.workspace)
    if not ws.exists(): print(f"Workspace not found: {ws}"); sys.exit(1)
    if args.command == "scan": sys.exit(cmd_scan(ws, target_skill=args.skill))
    elif args.command == "threats": sys.exit(cmd_threats(ws, update_from=args.update_from))
    elif args.command == "status": sys.exit(cmd_status(ws))

if __name__ == "__main__":
    main()
