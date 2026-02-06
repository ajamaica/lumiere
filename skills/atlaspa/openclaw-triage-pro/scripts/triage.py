#!/usr/bin/env python3
"""
OpenClaw Triage Pro — Full Incident Response Suite for Agent Workspaces

Free: investigate, timeline, scope, evidence, status
Pro:  contain, remediate, export, harden, playbook, protect
"""

import argparse, hashlib, io, json, os, re, shutil, stat, subprocess, sys, time
from datetime import datetime, timezone, timedelta
from pathlib import Path

# --- Windows Unicode stdout fix ---
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# --- Constants ---
TRIAGE_DIR, TRIAGE_STATE = ".triage", "state.json"
QUARANTINE_DIR, BACKUPS_DIR = ".triage/quarantine", ".triage/backups"
SKIP_DIRS = {".git", ".svn", ".hg", "__pycache__", "node_modules", ".triage",
             ".integrity", ".ledger", ".signet", ".sentinel", ".venv", "venv", ".env"}
SELF_SKILL_DIRS = {"openclaw-triage", "openclaw-triage-pro"}
CRITICAL_FILES = {"SOUL.md", "AGENTS.md", "IDENTITY.md", "USER.md", "TOOLS.md", "HEARTBEAT.md"}
CONFIG_EXTS = {".json", ".yaml", ".yml", ".toml"}
SKILL_MARKER = "SKILL.md"
WARDEN_MANIFEST = ".integrity/manifest.json"
WARDEN_SNAPSHOTS = ".integrity/snapshots"
LEDGER_CHAIN = ".ledger/chain.jsonl"
SIGNET_MANIFEST = ".signet/manifest.json"
SENTINEL_THREATS = ".sentinel/threats.json"
CREDENTIAL_PATTERNS = [
    r"(?i)(?:api[_-]?key|secret[_-]?key|password|token|auth)\s*[:=]\s*\S+",
    r"(?i)bearer\s+[A-Za-z0-9\-._~+/]+=*",
    r"(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}",
    r"sk-[A-Za-z0-9]{32,}", r"AKIA[0-9A-Z]{16}",
]
EXFIL_PATTERNS = [
    r"https?://[^\s\"'`>\)]+\?[^\s\"'`>\)]*(?:data|payload|exfil|dump|leak)",
    r"https?://[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}[:/]",
    r"https?://[^\s\"'`>\)]*\.ngrok\.", r"https?://[^\s\"'`>\)]*webhook\.site",
    r"https?://[^\s\"'`>\)]*requestbin", r"https?://[^\s\"'`>\)]*pipedream",
]
SEV_CRIT, SEV_HIGH, SEV_MED, SEV_LOW = "CRITICAL", "HIGH", "MEDIUM", "LOW"
SEV_RANK = {SEV_CRIT: 4, SEV_HIGH: 3, SEV_MED: 2, SEV_LOW: 1}
WORK_START, WORK_END = 7, 22
BURST_FILES, BURST_MINS = 5, 5
LARGE_THRESHOLD = 1_048_576
SECURITY_TOOLS = {
    "warden": {"path": ".integrity/manifest.json", "desc": "File integrity baselines"},
    "ledger": {"path": ".ledger/chain.jsonl", "desc": "Tamper-evident audit chain"},
    "signet": {"path": ".signet/manifest.json", "desc": "Skill code-signing"},
    "sentinel": {"path": ".sentinel/threats.json", "desc": "Threat detection"},
    "triage": {"path": ".triage/state.json", "desc": "Incident response"},
}
RECOMMENDED_HOOKS = [
    {"event": "SessionStart", "tool": "warden", "desc": "Verify baselines on session start"},
    {"event": "PreToolUse", "tool": "sentinel", "desc": "Scan tool inputs for threats"},
    {"event": "PostToolUse", "tool": "ledger", "desc": "Log tool usage to audit chain"},
]

# --- Utilities ---
def sha256_file(p):
    h = hashlib.sha256()
    try:
        with open(p, "rb") as f:
            for c in iter(lambda: f.read(8192), b""): h.update(c)
        return h.hexdigest()
    except (OSError, PermissionError): return "ERROR_READING_FILE"

def now_iso(): return datetime.now(timezone.utc).isoformat()
def now_utc(): return datetime.now(timezone.utc)
def ts_to_dt(ts): return datetime.fromtimestamp(ts, tz=timezone.utc)
def dt_to_iso(d): return d.isoformat()

def resolve_workspace(ns):
    ws = getattr(ns, "workspace", None)
    if ws is None: ws = os.environ.get("OPENCLAW_WORKSPACE")
    if ws is None and (Path.cwd() / "AGENTS.md").exists(): ws = str(Path.cwd())
    if ws is None: ws = str(Path.home() / ".openclaw" / "workspace")
    p = Path(ws)
    if not p.is_dir(): print(f"ERROR: Workspace not found: {p}", file=sys.stderr); sys.exit(1)
    return p

def _triage_dir(ws): return ws / ".triage"
def _state_path(ws): return _triage_dir(ws) / TRIAGE_STATE

def load_state(ws):
    sp = _state_path(ws)
    if not sp.exists(): return None
    try:
        with open(sp, "r", encoding="utf-8") as f: return json.load(f)
    except (json.JSONDecodeError, OSError): return None

def save_state(ws, st):
    td = _triage_dir(ws); td.mkdir(parents=True, exist_ok=True)
    with open(td / TRIAGE_STATE, "w", encoding="utf-8") as f: json.dump(st, f, indent=2)

def read_json(p):
    if not p.is_file(): return None
    try:
        with open(p, "r", encoding="utf-8") as f: return json.load(f)
    except (json.JSONDecodeError, OSError, UnicodeDecodeError): return None

def read_jsonl(p):
    if not p.is_file(): return []
    out = []
    try:
        with open(p, "r", encoding="utf-8") as f:
            for ln in f:
                ln = ln.strip()
                if ln:
                    try: out.append(json.loads(ln))
                    except json.JSONDecodeError: out.append({"_raw": ln, "_parse_error": True})
    except (OSError, UnicodeDecodeError): pass
    return out

def read_text(p):
    try:
        with open(p, "r", encoding="utf-8") as f: return f.read()
    except (UnicodeDecodeError, ValueError, OSError): return None

def collect_files(ws):
    files = []
    for root, dirs, fnames in os.walk(ws):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not (
            Path(root).relative_to(ws).parts[:1] == ("skills",) and d in SELF_SKILL_DIRS)]
        for fn in fnames:
            ap = Path(root) / fn
            try: rel = ap.relative_to(ws).as_posix()
            except ValueError: continue
            try: s = ap.stat()
            except OSError: continue
            files.append({"rel": rel, "abs": ap, "size": s.st_size,
                          "mt": s.st_mtime, "dt": ts_to_dt(s.st_mtime), "hash": None})
    return files

def classify(rel):
    name = Path(rel).name
    if name in CRITICAL_FILES: return "critical"
    if rel == "MEMORY.md" or rel.startswith("memory/"): return "memory"
    if rel.startswith("skills/"): return "skill"
    if Path(rel).suffix in CONFIG_EXTS and "/" not in rel: return "config"
    if rel.startswith("."): return "dotfile"
    return "other"

def get_hash(e):
    if e["hash"] is None: e["hash"] = sha256_file(e["abs"])
    return e["hash"]

# --- Cross-reference checks ---
def check_warden(ws):
    findings = []; data = read_json(ws / WARDEN_MANIFEST)
    if data is None:
        return [{"src": "warden", "sev": SEV_LOW, "msg": "No warden baseline found"}]
    bf = data.get("files", {})
    for rel, info in bf.items():
        ap = ws / rel
        if not ap.is_file():
            findings.append({"src": "warden", "sev": SEV_HIGH, "msg": f"Baseline file missing: {rel}"})
        elif sha256_file(ap) != info.get("sha256", ""):
            cat = info.get("category", "unknown")
            findings.append({"src": "warden", "sev": SEV_HIGH if cat == "critical" else SEV_MED,
                             "msg": f"Modified since baseline: {rel} ({cat})"})
    findings.append({"src": "warden", "sev": SEV_LOW, "msg": f"Warden: {len(bf)} files tracked"})
    return findings

def check_ledger(ws):
    findings = []; entries = read_jsonl(ws / LEDGER_CHAIN)
    if not entries:
        return [{"src": "ledger", "sev": SEV_LOW, "msg": "No ledger chain found"}]
    pe = [e for e in entries if e.get("_parse_error")]
    if pe: findings.append({"src": "ledger", "sev": SEV_HIGH,
                            "msg": f"Ledger: {len(pe)} unparseable entries"})
    prev, breaks = None, 0
    for e in entries:
        if e.get("_parse_error"): breaks += 1; prev = None; continue
        ep = e.get("prev_hash") or e.get("previous_hash")
        if prev and ep and ep != prev: breaks += 1
        prev = e.get("hash") or e.get("entry_hash") or None
    if breaks: findings.append({"src": "ledger", "sev": SEV_CRIT,
                                "msg": f"Ledger chain: {breaks} break(s)"})
    findings.append({"src": "ledger", "sev": SEV_LOW, "msg": f"Ledger: {len(entries)} entries"})
    return findings

def check_signet(ws):
    findings = []; data = read_json(ws / SIGNET_MANIFEST)
    if data is None:
        return [{"src": "signet", "sev": SEV_LOW, "msg": "No signet manifest found"}]
    sk = data.get("skills", data.get("signatures", {}))
    if isinstance(sk, dict):
        tampered = [n for n, i in sk.items()
                    if (i.get("hash") or i.get("sha256")) and i.get("path")
                    and (ws / i["path"]).is_file()
                    and sha256_file(ws / i["path"]) != (i.get("hash") or i.get("sha256"))]
        if tampered: findings.append({"src": "signet", "sev": SEV_CRIT,
                                      "msg": f"Tampered signatures: {', '.join(tampered)}"})
    findings.append({"src": "signet", "sev": SEV_LOW,
                     "msg": f"Signet: {len(sk) if isinstance(sk, dict) else 0} skill(s)"})
    return findings

def check_sentinel(ws):
    findings = []; data = read_json(ws / SENTINEL_THREATS)
    if data is None:
        return [{"src": "sentinel", "sev": SEV_LOW, "msg": "No sentinel threat data found"}]
    threats = data.get("threats", data.get("findings", []))
    if isinstance(threats, list) and threats:
        ct = [t for t in threats if t.get("severity", "").upper() in ("CRITICAL", "HIGH")]
        if ct: findings.append({"src": "sentinel", "sev": SEV_HIGH,
                                "msg": f"Sentinel: {len(ct)} high/critical threat(s)"})
        findings.append({"src": "sentinel", "sev": SEV_MED if threats else SEV_LOW,
                         "msg": f"Sentinel: {len(threats)} finding(s)"})
    else:
        findings.append({"src": "sentinel", "sev": SEV_LOW, "msg": "Sentinel DB empty"})
    return findings

# --- Investigation engine ---
def _check_modified_critical(files, hrs=24):
    cutoff = now_utc() - timedelta(hours=hrs)
    return [{"src": "investigate", "sev": SEV_HIGH,
             "msg": f"Critical file modified: {e['rel']} ({dt_to_iso(e['dt'])})"}
            for e in files if classify(e["rel"]) == "critical" and e["dt"] > cutoff]

def _check_modified_skills(files, hrs=24):
    cutoff = now_utc() - timedelta(hours=hrs)
    return [{"src": "investigate", "sev": SEV_MED,
             "msg": f"Skill file modified: {e['rel']} ({dt_to_iso(e['dt'])})"}
            for e in files if e["rel"].startswith("skills/") and e["dt"] > cutoff]

def _check_off_hours(files, hrs=72):
    cutoff, out = now_utc() - timedelta(hours=hrs), []
    for e in files:
        if e["dt"] < cutoff: continue
        h = e["dt"].astimezone().hour
        if (h < WORK_START or h >= WORK_END) and classify(e["rel"]) in ("critical", "skill", "config"):
            out.append({"src": "investigate", "sev": SEV_MED,
                        "msg": f"Off-hours modification ({h:02d}:xx): {e['rel']}"})
    return out

def _check_large(files, hrs=48):
    cutoff = now_utc() - timedelta(hours=hrs)
    return [{"src": "investigate", "sev": SEV_MED,
             "msg": f"Large file ({e['size']/1048576:.1f} MB): {e['rel']}"}
            for e in files if e["size"] > LARGE_THRESHOLD and e["dt"] > cutoff]

def _check_hidden(files):
    known = {".integrity", ".ledger", ".signet", ".sentinel", ".triage",
             ".git", ".svn", ".hg", ".vscode", ".idea", ".claude"}
    out = []
    for e in files:
        for p in Path(e["rel"]).parts:
            if p.startswith(".") and p not in known:
                out.append({"src": "investigate", "sev": SEV_LOW, "msg": f"Hidden: {e['rel']}"})
                break
    return out

def calc_severity(findings):
    cc = sum(1 for f in findings if f["sev"] == SEV_CRIT)
    hc = sum(1 for f in findings if f["sev"] == SEV_HIGH)
    if cc > 0: return SEV_CRIT
    if hc >= 3: return SEV_CRIT
    if hc > 0: return SEV_HIGH
    if len(findings) > 10: return SEV_HIGH
    if len(findings) > 5: return SEV_MED
    return SEV_LOW

def run_investigation(ws):
    files = collect_files(ws)
    findings = (_check_modified_critical(files) + _check_modified_skills(files) +
                _check_off_hours(files) + _check_large(files) + _check_hidden(files))
    for f in check_warden(ws) + check_ledger(ws) + check_signet(ws) + check_sentinel(ws):
        if f["sev"] != SEV_LOW: findings.append(f)
    return findings, files, calc_severity(findings)

# --- Free commands ---
def cmd_investigate(ws):
    print("=" * 60); print("INCIDENT INVESTIGATION REPORT"); print("=" * 60)
    print(f"Workspace: {ws}\nTimestamp: {now_iso()}\n")
    print("[1/5] Collecting workspace file inventory...")
    files = collect_files(ws)
    print(f"      Found {len(files)} files\n")
    findings = []
    print("[2/5] Checking for signs of compromise...")
    findings.extend(_check_modified_critical(files) + _check_modified_skills(files) +
                    _check_off_hours(files) + _check_large(files) + _check_hidden(files))
    print(f"      Local checks: {len(findings)} finding(s)\n")
    print("[3/5] Cross-referencing with OpenClaw security tools...")
    xref = {"warden": check_warden(ws), "ledger": check_ledger(ws),
            "signet": check_signet(ws), "sentinel": check_sentinel(ws)}
    for src, fl in xref.items():
        for f in fl:
            if f["sev"] != SEV_LOW: findings.append(f)
        lo = [f for f in fl if f["sev"] == SEV_LOW]
        hi = [f for f in fl if f["sev"] != SEV_LOW]
        print(f"      {src:10s}: {lo[0]['msg'] if lo else 'N/A'}")
        for a in hi: print(f"                   [{a['sev']:8s}] {a['msg']}")
    print()
    print("[4/5] Building event timeline...")
    recent = sorted([f for f in files if f["dt"] > now_utc() - timedelta(hours=24)],
                    key=lambda x: x["mt"], reverse=True)
    print(f"      {len(recent)} files modified in last 24 hours")
    if recent: print(f"      Most recent: {recent[0]['rel']} ({dt_to_iso(recent[0]['dt'])})")
    print(f"\n[5/5] Calculating incident severity...")
    sev = calc_severity(findings)
    actionable = [f for f in findings if f["sev"] != SEV_LOW]
    print(f"\n{'-'*60}\nINCIDENT SEVERITY: {sev}")
    print(f"TOTAL FINDINGS:    {len(findings)} ({len(actionable)} actionable)\n{'-'*60}")
    if actionable:
        print("\nACTIONABLE FINDINGS:")
        for i, f in enumerate(actionable, 1):
            print(f"  {i:2d}. [{f['sev']:8s}] [{f['src']:12s}] {f['msg']}")
    else:
        print("\nNo actionable findings. Workspace appears clean.")
    print(f"\n{'='*60}")
    recs = {SEV_CRIT: "Immediate response required.\n  - Run 'contain' to auto-quarantine\n  - Run 'evidence' to preserve forensic data\n  - Run 'scope' to assess blast radius",
            SEV_HIGH: "Investigation warranted.\n  - Review flagged files\n  - Run 'timeline' for event chronology\n  - Run 'contain' to quarantine suspicious skills",
            SEV_MED: "Review flagged items.\n  - Check modified files for legitimacy\n  - Run 'timeline' to understand sequence",
            SEV_LOW: "No immediate action required.\n  - Consider running 'harden' for posture review"}
    print(f"RECOMMENDATION: {recs.get(sev, recs[SEV_LOW])}")
    print("=" * 60)
    st = load_state(ws) or {}
    st.update({"last_investigation": now_iso(), "last_severity": sev,
               "last_finding_count": len(findings), "last_actionable_count": len(actionable)})
    save_state(ws, st)
    sys.exit(2 if sev == SEV_CRIT else 1 if sev in (SEV_HIGH, SEV_MED) else 0)

def cmd_timeline(ws, hours=24):
    print("=" * 60); print("EVENT TIMELINE"); print("=" * 60)
    print(f"Workspace: {ws}\nWindow:    Last {hours} hours\nGenerated: {now_iso()}\n")
    files = collect_files(ws)
    cutoff = now_utc() - timedelta(hours=hours)
    recent = sorted([f for f in files if f["dt"] > cutoff], key=lambda x: x["mt"])
    if not recent: print("No file modifications found."); print("=" * 60); sys.exit(0)
    groups = {}
    for e in recent: groups.setdefault(e["dt"].strftime("%Y-%m-%d %H:00 UTC"), []).append(e)
    bursts, seen = [], set()
    for i, e in enumerate(recent):
        wend = e["dt"] + timedelta(minutes=BURST_MINS)
        bf = [x for x in recent[i:] if x["dt"] <= wend]
        if len(bf) >= BURST_FILES:
            k = e["dt"].isoformat()
            if k not in seen: bursts.append({"s": e["dt"], "e": bf[-1]["dt"], "n": len(bf),
                                             "f": [x["rel"] for x in bf]}); seen.add(k)
    print(f"TOTAL: {len(recent)} files in {len(groups)} hour(s)\n")
    for hk in sorted(groups):
        g = groups[hk]; print(f"--- {hk} ({len(g)} files) ---")
        for e in g:
            c = classify(e["rel"]); ts = e["dt"].strftime("%H:%M:%S")
            m = " [CRITICAL FILE]" if c == "critical" else " [SKILL]" if c == "skill" else ""
            print(f"  {ts}  {e['rel']}{m}")
        print()
    le = read_jsonl(ws / LEDGER_CHAIN)
    if le:
        rl = []
        for entry in le:
            tss = entry.get("timestamp") or entry.get("time") or entry.get("created")
            if tss:
                try:
                    d = datetime.fromisoformat(tss.replace("Z", "+00:00"))
                    if d > cutoff: rl.append({"t": d, "e": entry})
                except (ValueError, TypeError): pass
        if rl:
            print(f"{'-'*40}\nLEDGER ENTRIES:\n{'-'*40}")
            for it in sorted(rl, key=lambda x: x["t"]):
                a = it["e"].get("action", it["e"].get("type", "unknown"))
                d = it["e"].get("detail", it["e"].get("message", ""))
                print(f"  {dt_to_iso(it['t'])}  {a}: {d}")
            print()
    if bursts:
        print(f"{'-'*40}\nSUSPICIOUS BURST ACTIVITY:\n{'-'*40}")
        for b in bursts:
            dirs = set(Path(f).parts[0] if len(Path(f).parts) > 1 else "(root)" for f in b["f"])
            print(f"  {dt_to_iso(b['s'])} - {dt_to_iso(b['e'])}")
            print(f"  {b['n']} files in {BURST_MINS}min | Dirs: {', '.join(sorted(dirs))}\n")
    print("=" * 60 + "\nDIRECTORY BREAKDOWN:")
    ds = {}
    for e in recent:
        t = Path(e["rel"]).parts[0] if len(Path(e["rel"]).parts) > 1 else "(root)"
        ds[t] = ds.get(t, 0) + 1
    for d, c in sorted(ds.items(), key=lambda x: -x[1]): print(f"  {d:30s} {c} file(s)")
    print("=" * 60)

def cmd_scope(ws):
    print("=" * 60); print("BLAST RADIUS ASSESSMENT"); print("=" * 60)
    print(f"Workspace: {ws}\nTimestamp: {now_iso()}\n")
    files = collect_files(ws)
    cats = {c: [] for c in ("critical", "memory", "skill", "config", "dotfile", "other")}
    for e in files: cats[classify(e["rel"])].append(e)
    print("FILE INVENTORY BY RISK CATEGORY:\n" + "-" * 40)
    for c in cats: print(f"  {c:12s}: {len(cats[c])} file(s)")
    rc = now_utc() - timedelta(hours=48)
    # Credential check
    cred_hits = []
    for e in files:
        if e["dt"] < rc: continue
        txt = read_text(e["abs"])
        if txt:
            for pat in CREDENTIAL_PATTERNS:
                m = re.findall(pat, txt)
                if m: cred_hits.append({"f": e["rel"], "n": len(m)}); break
    print(f"\nCREDENTIAL EXPOSURE CHECK:\n{'-'*40}")
    if cred_hits:
        print(f"  WARNING: Patterns in {len(cred_hits)} file(s):")
        for h in cred_hits: print(f"    - {h['f']} ({h['n']} match(es))")
    else: print("  No credential patterns detected.")
    # Exfil check
    exfil_hits = []
    for e in files:
        if e["dt"] < rc: continue
        txt = read_text(e["abs"])
        if txt:
            for pat in EXFIL_PATTERNS:
                m = re.findall(pat, txt)
                if m: exfil_hits.append({"f": e["rel"], "u": m[:5]}); break
    print(f"\nDATA EXFILTRATION CHECK:\n{'-'*40}")
    if exfil_hits:
        print(f"  WARNING: Suspicious URLs in {len(exfil_hits)} file(s):")
        for h in exfil_hits:
            print(f"    - {h['f']}:")
            for u in h["u"]: print(f"        {u[:80]}")
    else: print("  No suspicious URLs detected.")
    # Scope
    rm = [f for f in files if f["dt"] > rc]
    md, ms, mc = set(), set(), False
    for e in rm:
        p = Path(e["rel"]).parts
        if len(p) > 1: md.add(p[0])
        c = classify(e["rel"])
        if c == "critical": mc = True
        if c == "skill" and len(p) >= 2: ms.add(p[1])
    if mc or len(ms) > 2 or cred_hits or exfil_hits: scope, sd = "SYSTEMIC", "Workspace-level compromise"
    elif ms: scope, sd = "SPREADING", f"{len(ms)} skill(s) affected"
    elif rm: scope, sd = "CONTAINED", "Changes limited"
    else: scope, sd = "NONE", "No recent modifications"
    print(f"\nSCOPE ESTIMATION:\n{'-'*40}")
    print(f"  Scope: {scope} | {sd}")
    print(f"  Modified: {len(rm)} files (48h) | Dirs: {len(md)} | Skills: {len(ms)}")
    if ms: print(f"  Skill names: {', '.join(sorted(ms))}")
    print(f"  Critical: {'YES' if mc else 'No'} | Credentials: {'YES' if cred_hits else 'No'} | Exfil: {'YES' if exfil_hits else 'No'}")
    print(f"\n{'='*60}")
    recs = {"SYSTEMIC": "Run 'contain' then 'remediate'", "SPREADING": "Run 'contain' on affected skills",
            "CONTAINED": "Review modifications", "NONE": "No action required"}
    print(f"RECOMMENDATION: {recs[scope]}\n{'='*60}")

def cmd_evidence(ws, output_dir=None):
    ts = now_utc().strftime("%Y%m%d-%H%M%S")
    ed = Path(output_dir) if output_dir else _triage_dir(ws) / f"evidence-{ts}"
    ed.mkdir(parents=True, exist_ok=True)
    print("=" * 60); print("EVIDENCE COLLECTION"); print("=" * 60)
    print(f"Workspace: {ws}\nOutput:    {ed}\nTimestamp: {now_iso()}\n")
    print("[1/3] Snapshotting workspace...")
    files = collect_files(ws)
    snap = [{"path": e["rel"], "size": e["size"], "mtime": dt_to_iso(e["dt"]),
             "sha256": get_hash(e), "category": classify(e["rel"])} for e in files]
    with open(ed / "workspace-snapshot.json", "w", encoding="utf-8") as f:
        json.dump({"collected_at": now_iso(), "workspace": str(ws),
                   "file_count": len(snap), "files": snap}, f, indent=2)
    print(f"      {len(snap)} file records saved")
    print("[2/3] Collecting security tool data...")
    sdirs = {".integrity": "warden", ".ledger": "ledger", ".signet": "signet", ".sentinel": "sentinel"}
    for sn, tn in sdirs.items():
        sp = ws / sn
        if sp.is_dir():
            try: shutil.copytree(sp, ed / f"tool-{tn}", dirs_exist_ok=True); print(f"      {tn}: copied")
            except (OSError, shutil.Error) as e: print(f"      {tn}: failed ({e})")
        else: print(f"      {tn}: not present")
    es = load_state(ws)
    if es:
        with open(ed / "triage-state.json", "w", encoding="utf-8") as f: json.dump(es, f, indent=2)
    print("[3/3] Generating summary...")
    cc = {}
    for s in snap: cc[s["category"]] = cc.get(s["category"], 0) + 1
    lines = [f"EVIDENCE SUMMARY\nCollected: {now_iso()}\nFiles: {len(snap)}\n"]
    for c, n in sorted(cc.items()): lines.append(f"  {c}: {n}")
    with open(ed / "summary.txt", "w", encoding="utf-8") as f: f.write("\n".join(lines) + "\n")
    print(f"\n{'='*60}\nEvidence preserved in: {ed}\n{'='*60}")
    st = load_state(ws) or {}
    st.update({"last_evidence_collection": now_iso(), "last_evidence_dir": str(ed)})
    save_state(ws, st)

def cmd_status(ws):
    st = load_state(ws)
    print("=" * 60); print("TRIAGE STATUS"); print("=" * 60)
    print(f"Workspace: {ws}\n")
    if not st:
        print("STATUS: NO DATA\n  Run 'investigate' for initial assessment."); print("=" * 60); sys.exit(0)
    print(f"Last investigation:   {st.get('last_investigation', 'never')}")
    print(f"Threat level:         {st.get('last_severity', 'UNKNOWN')}")
    print(f"Findings:             {st.get('last_finding_count', 0)} ({st.get('last_actionable_count', 0)} actionable)")
    print(f"Evidence collected:   {'Yes' if st.get('last_evidence_collection') else 'No'}")
    if st.get("last_evidence_collection"):
        print(f"  Time: {st['last_evidence_collection']}")
        if st.get("last_evidence_dir"):
            print(f"  Path: {st['last_evidence_dir']} ({'exists' if Path(st['last_evidence_dir']).is_dir() else 'MISSING'})")
    print(f"Last containment:     {st.get('last_containment', 'never')}")
    print(f"Last remediation:     {st.get('last_remediation', 'never')}")
    print(f"Last protect sweep:   {st.get('last_protect', 'never')}")
    print("=" * 60)

# --- Pro commands ---
def cmd_contain(ws):
    print("=" * 60); print("AUTOMATED CONTAINMENT"); print("=" * 60)
    print(f"Workspace: {ws}\nTimestamp: {now_iso()}\n")
    print("[1/4] Running threat assessment...")
    findings, files, sev = run_investigation(ws)
    actionable = [f for f in findings if f["sev"] != SEV_LOW]
    print(f"      Severity: {sev} | {len(actionable)} actionable\n")
    if not actionable:
        print("No threats found.\n" + "=" * 60); sys.exit(0)
    qp = ws / QUARANTINE_DIR; qp.mkdir(parents=True, exist_ok=True)
    actions = []
    # Quarantine skills
    print("[2/4] Quarantining flagged skills...")
    flagged = set()
    for f in findings:
        m = f.get("msg", "")
        if "Tampered signatures" in m:
            for n in m.split(": ", 1)[-1].split(", "): flagged.add(n.strip())
        if "Skill file modified" in m:
            parts = Path(m.split(": ")[1].split(" ")[0]).parts if ": " in m else ()
            if len(parts) >= 2 and parts[0] == "skills": flagged.add(parts[1])
    qc = 0
    for sn in sorted(flagged):
        sd = ws / "skills" / sn
        if sd.is_dir():
            dest = qp / sn
            try:
                if dest.exists(): shutil.rmtree(dest)
                shutil.copytree(sd, dest); shutil.rmtree(sd); qc += 1
                actions.append(f"Quarantined: {sn}"); print(f"      Quarantined: {sn}")
            except (OSError, shutil.Error) as e: print(f"      Failed: {sn}: {e}")
    if not flagged: print("      No skills flagged.")
    # Lock critical files
    print("\n[3/4] Locking critical files...")
    bp = ws / BACKUPS_DIR; bp.mkdir(parents=True, exist_ok=True)
    lc = 0
    for e in files:
        if classify(e["rel"]) == "critical":
            bk = bp / e["rel"].replace("/", "_")
            try:
                shutil.copy2(e["abs"], bk)
                bk.chmod(stat.S_IRUSR | stat.S_IRGRP | stat.S_IROTH); lc += 1
                actions.append(f"Locked: {e['rel']}"); print(f"      Locked: {e['rel']}")
            except (OSError, PermissionError) as e2: print(f"      Failed: {e2}")
    # Disable suspicious hooks
    print("\n[4/4] Checking hooks...")
    hd = 0
    for sp in [ws / ".claude" / "settings.json", ws / ".claude" / "settings.local.json"]:
        if not sp.is_file(): continue
        data = read_json(sp)
        if not data or not isinstance(data, dict): continue
        hooks = data.get("hooks", {})
        suspicious = any(any(kw in (h.get("command", "") if isinstance(h, dict) else "").lower()
                             for kw in ["curl ", "wget ", "nc ", "ncat "])
                         for hl in hooks.values() if isinstance(hl, list) for h in hl)
        if suspicious:
            try:
                sp.rename(sp.parent / (sp.name + ".disabled")); hd += 1
                actions.append(f"Disabled hooks: {sp.name}"); print(f"      Disabled: {sp.name}")
            except OSError as e: print(f"      Failed: {e}")
    if hd == 0: print("      No suspicious hooks.")
    print(f"\n{'='*60}\nCONTAINMENT SUMMARY\n{'-'*60}")
    print(f"  Quarantined: {qc} | Locked: {lc} | Hooks disabled: {hd}")
    if actions:
        print("\nACTIONS:")
        for i, a in enumerate(actions, 1): print(f"  {i}. {a}")
    print("=" * 60)
    st = load_state(ws) or {}
    st.update({"last_containment": now_iso(), "containment_actions": actions,
               "quarantined_skills": sorted(flagged)})
    save_state(ws, st)
    sys.exit(1 if qc > 0 or hd > 0 else 0)

def cmd_remediate(ws):
    print("=" * 60); print("GUIDED REMEDIATION"); print("=" * 60)
    print(f"Workspace: {ws}\nTimestamp: {now_iso()}\n")
    actions = []
    # Restore critical files
    print("[1/4] Restoring critical files...")
    sd = ws / WARDEN_SNAPSHOTS; wd = read_json(ws / WARDEN_MANIFEST); rc = 0
    if sd.is_dir() and wd:
        for rel, info in wd.get("files", {}).items():
            if info.get("category") != "critical": continue
            ap = ws / rel
            for sf in [sd / rel.replace("/", "_"), sd / rel]:
                if sf.is_file() and sha256_file(ap) != info.get("sha256", "") if ap.is_file() else True:
                    try: shutil.copy2(sf, ap); rc += 1; actions.append(f"Restored: {rel}"); print(f"      Restored: {rel}")
                    except OSError as e: print(f"      Failed: {e}")
                    break
    bp = ws / BACKUPS_DIR
    if bp.is_dir():
        for bf in bp.iterdir():
            if bf.is_file() and bf.name in CRITICAL_FILES:
                dest = ws / bf.name
                if not dest.is_file():
                    try: shutil.copy2(bf, dest); rc += 1; actions.append(f"Restored (backup): {bf.name}")
                    except OSError: pass
    print(f"      {rc} file(s) restored\n")
    # Re-sign with signet
    print("[2/4] Re-signing skills...")
    for cand in [ws / "skills" / d / "scripts" / "signet.py"
                 for d in ("openclaw-signet", "openclaw-signet-pro")]:
        if cand.is_file():
            try:
                r = subprocess.run([sys.executable, str(cand), "sign", "--workspace", str(ws)],
                                   capture_output=True, text=True, timeout=30)
                if r.returncode == 0: actions.append("Re-signed skills"); print("      Done.")
                else: print(f"      Code {r.returncode}")
            except (subprocess.TimeoutExpired, FileNotFoundError, OSError) as e: print(f"      Failed: {e}")
            break
    else: print("      Signet not installed.")
    # Record in ledger
    print("\n[3/4] Recording in ledger...")
    for cand in [ws / "skills" / d / "scripts" / "ledger.py"
                 for d in ("openclaw-ledger", "openclaw-ledger-pro")]:
        if cand.is_file():
            try:
                r = subprocess.run([sys.executable, str(cand), "record", "--action", "remediation",
                                    "--detail", f"Triage Pro remediation {now_iso()}", "--workspace", str(ws)],
                                   capture_output=True, text=True, timeout=30)
                if r.returncode == 0: actions.append("Recorded in ledger"); print("      Done.")
                else: print(f"      Code {r.returncode}")
            except (subprocess.TimeoutExpired, FileNotFoundError, OSError) as e: print(f"      Failed: {e}")
            break
    else: print("      Ledger not installed.")
    # Rebuild baselines
    print("\n[4/4] Rebuilding baselines...")
    for cand in [ws / "skills" / d / "scripts" / "warden.py"
                 for d in ("openclaw-warden", "openclaw-warden-pro")]:
        if cand.is_file():
            try:
                r = subprocess.run([sys.executable, str(cand), "scan", "--workspace", str(ws)],
                                   capture_output=True, text=True, timeout=60)
                if r.returncode == 0: actions.append("Rebuilt baselines"); print("      Done.")
                else: print(f"      Code {r.returncode}")
            except (subprocess.TimeoutExpired, FileNotFoundError, OSError) as e: print(f"      Failed: {e}")
            break
    else: print("      Warden not installed.")
    print(f"\n{'='*60}\nREMEDIATION SUMMARY: {len(actions)} action(s)")
    if actions:
        for i, a in enumerate(actions, 1): print(f"  {i}. {a}")
    print("=" * 60)
    st = load_state(ws) or {}
    st.update({"last_remediation": now_iso(), "remediation_actions": actions})
    save_state(ws, st)

def cmd_export(ws, fmt="text", output_file=None):
    print("=" * 60); print("INCIDENT REPORT EXPORT"); print("=" * 60)
    print(f"Format: {fmt}\nTimestamp: {now_iso()}\n")
    findings, files, sev = run_investigation(ws)
    cutoff = now_utc() - timedelta(hours=24)
    recent = sorted([f for f in files if f["dt"] > cutoff], key=lambda x: x["mt"])
    tl = [{"time": dt_to_iso(e["dt"]), "file": e["rel"], "category": classify(e["rel"]),
           "size": e["size"]} for e in recent]
    ms = set()
    rc = now_utc() - timedelta(hours=48)
    for e in files:
        if e["dt"] > rc and e["rel"].startswith("skills/"):
            p = Path(e["rel"]).parts
            if len(p) >= 2: ms.add(p[1])
    st = load_state(ws) or {}
    report = {
        "report_type": "incident_response", "generated_at": now_iso(),
        "generator": "openclaw-triage-pro", "workspace": str(ws), "severity": sev,
        "summary": {"total_findings": len(findings),
                    "actionable": len([f for f in findings if f["sev"] != SEV_LOW]),
                    "total_files": len(files), "modified_24h": len(recent),
                    "skills_affected": sorted(ms)},
        "findings": [{"severity": f["sev"], "source": f["src"], "detail": f["msg"]} for f in findings],
        "timeline": tl,
        "actions": {"investigation": st.get("last_investigation"),
                    "containment": st.get("last_containment"),
                    "containment_actions": st.get("containment_actions", []),
                    "quarantined": st.get("quarantined_skills", []),
                    "remediation": st.get("last_remediation"),
                    "remediation_actions": st.get("remediation_actions", [])},
        "tools": {t: (ws / i["path"]).exists() for t, i in SECURITY_TOOLS.items()},
    }
    if fmt == "json":
        content = json.dumps(report, indent=2)
    else:
        L = ["=" * 60, "INCIDENT RESPONSE REPORT", "=" * 60,
             f"Generated:  {report['generated_at']}", f"Workspace:  {report['workspace']}",
             f"Severity:   {report['severity']}", "",
             f"{'- '*30}", "SUMMARY", f"{'- '*30}"]
        s = report["summary"]
        L += [f"  Findings: {s['total_findings']} ({s['actionable']} actionable)",
              f"  Files: {s['total_files']} | Modified 24h: {s['modified_24h']}",
              f"  Skills affected: {', '.join(s['skills_affected']) or 'none'}", "",
              f"{'- '*30}", "FINDINGS", f"{'- '*30}"]
        for i, f in enumerate(report["findings"], 1):
            L.append(f"  {i:2d}. [{f['severity']:8s}] [{f['source']:12s}] {f['detail']}")
        L += ["", f"{'- '*30}", "TIMELINE (24h)", f"{'- '*30}"]
        for t in report["timeline"]:
            m = f" [{t['category'].upper()}]" if t["category"] in ("critical", "skill") else ""
            L.append(f"  {t['time']}  {t['file']}{m}")
        L += ["", f"{'- '*30}", "ACTIONS", f"{'- '*30}"]
        a = report["actions"]
        L += [f"  Investigation: {a['investigation'] or 'never'}",
              f"  Containment:   {a['containment'] or 'never'}"]
        for act in a.get("containment_actions", []): L.append(f"    - {act}")
        L.append(f"  Remediation:   {a['remediation'] or 'never'}")
        for act in a.get("remediation_actions", []): L.append(f"    - {act}")
        L += ["", f"{'- '*30}", "TOOLS", f"{'- '*30}"]
        for tn, p in report["tools"].items():
            L.append(f"  {tn:12s}: {'installed' if p else 'NOT INSTALLED'}")
        L += ["", "=" * 60]
        content = "\n".join(L) + "\n"
    if output_file:
        op = Path(output_file); op.parent.mkdir(parents=True, exist_ok=True)
        with open(op, "w", encoding="utf-8") as f: f.write(content)
        print(f"Report exported to: {op}")
    else:
        print(); print(content)
    print("=" * 60)

def cmd_harden(ws):
    print("=" * 60); print("POST-INCIDENT HARDENING"); print("=" * 60)
    print(f"Workspace: {ws}\nTimestamp: {now_iso()}\n")
    recs, n = [], 0
    print("[1/3] Security tools...\n" + "-" * 40)
    for tn, ti in SECURITY_TOOLS.items():
        present = (ws / ti["path"]).exists()
        print(f"  {tn:12s}: {'INSTALLED' if present else 'MISSING':12s} ({ti['desc']})")
        if not present:
            n += 1; recs.append({"n": n, "p": "HIGH" if tn in ("warden", "ledger") else "MEDIUM",
                                 "act": f"Install openclaw-{tn}", "why": ti["desc"]})
    # Baseline & signet coverage
    print(f"\n[2/3] Policies...\n{'-'*40}")
    wd = read_json(ws / WARDEN_MANIFEST)
    if wd:
        bt = wd.get("created") or wd.get("timestamp")
        print(f"  Warden baseline: Present{f' ({bt})' if bt else ' (age unknown)'}")
        if not bt: n += 1; recs.append({"n": n, "p": "MEDIUM", "act": "Refresh warden baseline",
                                        "why": "No creation timestamp"})
    else:
        print("  Warden baseline: MISSING"); n += 1
        recs.append({"n": n, "p": "HIGH", "act": "Create warden baseline", "why": "No integrity baseline"})
    sd = read_json(ws / SIGNET_MANIFEST)
    skd = ws / "skills"; total_sk = 0
    if skd.is_dir():
        total_sk = sum(1 for c in skd.iterdir() if c.is_dir() and (c / SKILL_MARKER).is_file())
    signed = len(sd.get("skills", sd.get("signatures", {}))) if sd and isinstance(sd, dict) else 0
    print(f"  Skills: {total_sk} total, {signed} signed")
    if total_sk > signed:
        n += 1; recs.append({"n": n, "p": "HIGH", "act": f"Sign {total_sk - signed} unsigned skill(s)",
                             "why": "Unsigned skills can't be verified"})
    cs = ws / ".claude" / "settings.json"
    if cs.is_file():
        cd = read_json(cs)
        hk = cd.get("hooks", {}) if cd and isinstance(cd, dict) else {}
        print(f"  Claude hooks: {len(hk)} event(s)")
    else: print("  Claude hooks: NOT CONFIGURED")
    print(f"\n[3/3] Recommended hooks...\n{'-'*40}")
    for h in RECOMMENDED_HOOKS:
        n += 1; recs.append({"n": n, "p": "MEDIUM", "act": f"Add {h['event']} -> {h['tool']}",
                             "why": h["desc"]})
        print(f"  {h['event']:16s} -> {h['tool']:10s}: {h['desc']}")
    n += 1; recs.append({"n": n, "p": "LOW", "act": "Schedule periodic triage checks",
                         "why": "Use 'protect' at session start"})
    n += 1; recs.append({"n": n, "p": "LOW", "act": "Enable auto evidence collection",
                         "why": "Auto-collect on HIGH/CRITICAL findings"})
    print(f"\n{'='*60}\nACTIONABLE RECOMMENDATIONS\n{'='*60}\n")
    for r in sorted(recs, key=lambda x: {"HIGH": 0, "MEDIUM": 1, "LOW": 2}[x["p"]]):
        print(f"  [{r['p']:6s}] {r['act']}\n          {r['why']}\n")
    print(f"Total: {len(recs)} recommendations\n{'='*60}")

def cmd_playbook(ws, scenario=None):
    PB = {
        "skill-compromise": {
            "title": "Skill Compromise Response",
            "desc": "When a malicious or tampered skill is discovered.",
            "steps": [("Isolate", "contain", "Quarantine affected skills to prevent execution."),
                      ("Preserve evidence", "evidence", "Snapshot workspace before remediation."),
                      ("Assess blast radius", "scope", "Check credential exposure and skill spread."),
                      ("Remediate", "remediate", "Restore files, re-sign, re-record, rebuild baselines."),
                      ("Harden", "harden", "Review posture and prevent recurrence."),
                      ("Export report", "export --format text", "Generate incident report for records.")]},
        "injection-attack": {
            "title": "Prompt Injection Attack Response",
            "desc": "When prompt injection is detected in workspace files.",
            "steps": [("Investigate scope", "investigate", "Identify all files with injection payloads."),
                      ("Contain", "contain", "Lock critical files and quarantine modified skills."),
                      ("Check persistence", "scope", "Look for hooks, memory files, and skill modifications."),
                      ("Restore clean state", "remediate", "Restore from pre-injection snapshots."),
                      ("Export evidence", "export --format json", "Document the attack for analysis.")]},
        "credential-leak": {
            "title": "Credential Leak Response",
            "desc": "When secrets or credentials are found exposed.",
            "steps": [("Assess exposure", "scope", "Identify all files with credential patterns."),
                      ("Preserve evidence", "evidence", "Document what was exposed and when."),
                      ("Rotate credentials", None, "IMMEDIATELY rotate all exposed credentials:\n"
                       "    - API keys: regenerate in provider dashboard\n"
                       "    - GitHub tokens: revoke and reissue\n"
                       "    - AWS keys: deactivate in IAM\n    - Passwords: change immediately"),
                      ("Check exfiltration", "scope", "Verify credentials were not sent externally."),
                      ("Clean files", "remediate", "Remove credentials and restore from snapshots."),
                      ("Harden", "harden", "Add pre-commit checks and sentinel scanning.")]},
        "chain-break": {
            "title": "Ledger Chain Break Response",
            "desc": "When the ledger audit chain has been broken or tampered with.",
            "steps": [("Investigate", "investigate", "Determine extent of chain damage."),
                      ("Build timeline", "timeline --hours 72", "Find events around the break."),
                      ("Preserve evidence", "evidence", "Collect the broken chain as forensic data."),
                      ("Remediate", "remediate", "Re-record and start a new chain segment."),
                      ("Verify", "investigate", "Confirm resolution and check for new issues.")]},
    }
    if scenario is None:
        print("=" * 60); print("INCIDENT RESPONSE PLAYBOOKS"); print("=" * 60)
        print("\nAvailable:\n")
        for k, v in PB.items(): print(f"  {k:22s}  {v['desc']}")
        print(f"\nUsage: triage.py playbook --scenario <type>\n{'='*60}"); sys.exit(0)
    if scenario not in PB:
        print(f"ERROR: Unknown '{scenario}'", file=sys.stderr)
        print(f"Available: {', '.join(PB.keys())}", file=sys.stderr); sys.exit(1)
    pb = PB[scenario]
    print("=" * 60); print(f"PLAYBOOK: {pb['title']}"); print("=" * 60)
    print(f"Workspace: {ws}\nTimestamp: {now_iso()}\n{pb['desc']}\n")
    for i, (name, cmd, detail) in enumerate(pb["steps"], 1):
        print(f"STEP {i}: {name}\n{'-'*40}\n  {detail}")
        if cmd: print(f"  Command: python3 triage.py {cmd}")
        print()
    print(f"{'='*60}\nPlaybook: {scenario} | Steps: {len(pb['steps'])}")
    print(f"Auto-execute containment: triage.py protect\n{'='*60}")

def cmd_protect(ws):
    print("=" * 60); print("AUTOMATED PROTECTION SWEEP"); print("=" * 60)
    print(f"Workspace: {ws}\nTimestamp: {now_iso()}\n")
    # Phase 1: Investigate
    print("[1/4] Investigating...\n" + "-" * 40)
    findings, files, sev = run_investigation(ws)
    actionable = [f for f in findings if f["sev"] != SEV_LOW]
    print(f"  Severity: {sev} | {len(actionable)} actionable\n")
    st = load_state(ws) or {}
    st.update({"last_investigation": now_iso(), "last_severity": sev,
               "last_finding_count": len(findings), "last_actionable_count": len(actionable)})
    save_state(ws, st)
    if sev == SEV_LOW and not actionable:
        print(f"Workspace clean.\n\n{'='*60}\nPROTECTION SWEEP: CLEAN\n{'='*60}")
        st.update({"last_protect": now_iso(), "last_protect_result": "CLEAN"}); save_state(ws, st)
        sys.exit(0)
    # Phase 2: Contain
    print("[2/4] Containing...\n" + "-" * 40)
    ca = []
    if sev in (SEV_CRIT, SEV_HIGH):
        qp = ws / QUARANTINE_DIR; qp.mkdir(parents=True, exist_ok=True)
        bp = ws / BACKUPS_DIR; bp.mkdir(parents=True, exist_ok=True)
        flagged = set()
        for f in findings:
            if "Tampered signatures" in f.get("msg", ""):
                for n in f["msg"].split(": ", 1)[-1].split(", "): flagged.add(n.strip())
        for sn in sorted(flagged):
            sd = ws / "skills" / sn
            if sd.is_dir():
                dest = qp / sn
                try:
                    if dest.exists(): shutil.rmtree(dest)
                    shutil.copytree(sd, dest); shutil.rmtree(sd)
                    ca.append(f"Quarantined: {sn}"); print(f"  Quarantined: {sn}")
                except (OSError, shutil.Error) as e: print(f"  Failed: {sn}: {e}")
        for e in files:
            if classify(e["rel"]) == "critical":
                try:
                    bk = bp / e["rel"].replace("/", "_")
                    shutil.copy2(e["abs"], bk)
                    bk.chmod(stat.S_IRUSR | stat.S_IRGRP | stat.S_IROTH)
                    ca.append(f"Locked: {e['rel']}")
                except (OSError, PermissionError): pass
        print(f"  {len(ca)} action(s)\n")
    else: print("  Below HIGH; skipping auto-containment.\n")
    # Phase 3: Evidence
    print("[3/4] Collecting evidence...\n" + "-" * 40)
    ts = now_utc().strftime("%Y%m%d-%H%M%S")
    ed = _triage_dir(ws) / f"evidence-{ts}"; ed.mkdir(parents=True, exist_ok=True)
    snap = [{"path": e["rel"], "size": e["size"], "mtime": dt_to_iso(e["dt"]),
             "sha256": get_hash(e), "category": classify(e["rel"])} for e in files]
    with open(ed / "workspace-snapshot.json", "w", encoding="utf-8") as f:
        json.dump({"collected_at": now_iso(), "workspace": str(ws),
                   "file_count": len(snap), "files": snap}, f, indent=2)
    for sn, tn in {".integrity": "warden", ".ledger": "ledger",
                   ".signet": "signet", ".sentinel": "sentinel"}.items():
        sp = ws / sn
        if sp.is_dir():
            try: shutil.copytree(sp, ed / f"tool-{tn}", dirs_exist_ok=True)
            except (OSError, shutil.Error): pass
    print(f"  Saved to: {ed}\n")
    # Phase 4: Report
    print("[4/4] Generating report...\n" + "-" * 40)
    rp = ed / "incident-report.txt"
    lines = [f"PROTECTION SWEEP REPORT\nGenerated: {now_iso()}\nSeverity: {sev}",
             f"Findings: {len(findings)} ({len(actionable)} actionable)\n"]
    if actionable:
        lines.append("FINDINGS:")
        for i, f in enumerate(actionable, 1):
            lines.append(f"  {i}. [{f['sev']}] [{f['src']}] {f['msg']}")
    if ca: lines.append("\nCONTAINMENT:"); lines.extend(f"  - {a}" for a in ca)
    with open(rp, "w", encoding="utf-8") as f: f.write("\n".join(lines) + "\n")
    print(f"  Report: {rp}\n")
    print(f"{'='*60}\nPROTECTION SWEEP COMPLETE\n{'-'*60}")
    print(f"  Severity: {sev} | Findings: {len(findings)} | Actions: {len(ca)}")
    print(f"  Evidence: {ed}\n{'='*60}")
    st = load_state(ws) or {}
    st.update({"last_protect": now_iso(), "last_protect_result": sev,
               "last_evidence_collection": now_iso(), "last_evidence_dir": str(ed)})
    if ca: st.update({"last_containment": now_iso(), "containment_actions": ca})
    save_state(ws, st)
    sys.exit(2 if sev == SEV_CRIT else 1 if sev in (SEV_HIGH, SEV_MED) else 0)

# --- Argument parsing ---
def build_parser():
    p = argparse.ArgumentParser(prog="triage.py",
                                description="OpenClaw Triage Pro — Full Incident Response Suite")
    p.add_argument("--workspace", type=str, default=None,
                   help="Workspace path (auto-detected if omitted)")
    sub = p.add_subparsers(dest="command")
    for name, hlp in [("investigate", "Full incident investigation"),
                      ("timeline", "Chronological event timeline"),
                      ("scope", "Blast radius assessment"),
                      ("evidence", "Collect forensic evidence"),
                      ("status", "Quick triage status")]:
        sp = sub.add_parser(name, help=hlp)
        sp.add_argument("--workspace", type=str, default=None)
        if name == "timeline": sp.add_argument("--hours", type=int, default=24)
        if name == "evidence": sp.add_argument("--output", type=str, default=None)
    for name, hlp in [("contain", "Automated containment"),
                      ("remediate", "Guided remediation"),
                      ("export", "Export incident report"),
                      ("harden", "Hardening recommendations"),
                      ("playbook", "Response playbooks"),
                      ("protect", "Full automated sweep")]:
        sp = sub.add_parser(name, help=hlp)
        sp.add_argument("--workspace", type=str, default=None)
        if name == "export":
            sp.add_argument("--format", type=str, choices=["json", "text"], default="text")
            sp.add_argument("--output", type=str, default=None)
        if name == "playbook":
            sp.add_argument("--scenario", type=str, default=None,
                            choices=["skill-compromise", "injection-attack",
                                     "credential-leak", "chain-break"])
    return p

def main():
    parser = build_parser()
    args = parser.parse_args()
    if args.command is None: parser.print_help(); sys.exit(0)
    ws = resolve_workspace(args)
    dispatch = {
        "investigate": lambda: cmd_investigate(ws),
        "timeline": lambda: cmd_timeline(ws, hours=args.hours),
        "scope": lambda: cmd_scope(ws),
        "evidence": lambda: cmd_evidence(ws, output_dir=args.output),
        "status": lambda: cmd_status(ws),
        "contain": lambda: cmd_contain(ws),
        "remediate": lambda: cmd_remediate(ws),
        "export": lambda: cmd_export(ws, fmt=args.format, output_file=args.output),
        "harden": lambda: cmd_harden(ws),
        "playbook": lambda: cmd_playbook(ws, scenario=args.scenario),
        "protect": lambda: cmd_protect(ws),
    }
    handler = dispatch.get(args.command)
    if handler: handler()
    else: parser.print_help(); sys.exit(1)

if __name__ == "__main__":
    main()
