#!/usr/bin/env python3
"""OpenClaw Ledger Pro -- Full audit trail suite for agent sessions.

Hash-chained logging with automated countermeasures: freeze, forensic
analysis, chain restoration, export, and protection sweeps.

Free = Alert (log + verify).  Pro = Subvert + Quarantine + Defend.
"""

import argparse, hashlib, io, json, os, shutil, sys
from datetime import datetime, timezone
from pathlib import Path

# Windows Unicode stdout safety
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

LEDGER_DIR = ".ledger"
CHAIN_FILE = "chain.jsonl"
SESSION_FILE = "session.json"
FROZEN_DIR = "frozen"
GENESIS_HASH = "0" * 64
SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv",
    ".integrity", ".quarantine", ".snapshots", LEDGER_DIR,
}
SELF_SKILL_DIRS = {"openclaw-ledger", "openclaw-ledger-pro"}
ANOMALY_GAP_SECS = 3600
ANOMALY_BULK_THRESH = 20

# ── Helpers ──────────────────────────────────────────────────────────────

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
    if default.exists():
        return default
    return cwd

def ledger_dir(ws):
    d = ws / LEDGER_DIR; d.mkdir(exist_ok=True); return d

def chain_path(ws):
    return ledger_dir(ws) / CHAIN_FILE

def session_path(ws):
    return ledger_dir(ws) / SESSION_FILE

def frozen_dir(ws):
    d = ledger_dir(ws) / FROZEN_DIR; d.mkdir(exist_ok=True); return d

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def hash_entry(entry_json):
    return hashlib.sha256(entry_json.encode("utf-8")).hexdigest()

def file_hash(filepath):
    h = hashlib.sha256()
    try:
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        return h.hexdigest()
    except (OSError, PermissionError):
        return None

def get_last_hash(ws):
    cp = chain_path(ws)
    if not cp.exists():
        return GENESIS_HASH
    last = ""
    try:
        with open(cp, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    last = line.strip()
    except (OSError, PermissionError):
        return GENESIS_HASH
    return hash_entry(last) if last else GENESIS_HASH

def append_entry(ws, event_type, data):
    prev = get_last_hash(ws)
    entry = {"timestamp": now_iso(), "prev_hash": prev, "event": event_type, "data": data}
    entry_json = json.dumps(entry, separators=(",", ":"), sort_keys=True)
    with open(chain_path(ws), "a", encoding="utf-8") as f:
        f.write(entry_json + "\n")
    return hash_entry(entry_json)

def read_chain(ws):
    cp = chain_path(ws)
    if not cp.exists():
        return []
    entries = []
    try:
        with open(cp, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    entries.append(line.strip())
    except (OSError, PermissionError):
        pass
    return entries

def verify_chain_integrity(entries):
    """Returns (is_intact, broken_at, count)."""
    if not entries:
        return True, None, 0
    expected = GENESIS_HASH
    for i, ej in enumerate(entries):
        try:
            e = json.loads(ej)
        except json.JSONDecodeError:
            return False, i, len(entries)
        if e.get("prev_hash") != expected:
            return False, i, len(entries)
        expected = hash_entry(ej)
    return True, None, len(entries)

# ── Workspace snapshots ─────────────────────────────────────────────────

def snapshot_workspace(ws):
    snap = {}
    for root, dirs, fnames in os.walk(ws):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith(".quarantine")]
        parts = Path(root).relative_to(ws).parts
        if len(parts) >= 2 and parts[0] == "skills" and parts[1] in SELF_SKILL_DIRS:
            continue
        for fn in fnames:
            fp = Path(root) / fn
            fh = file_hash(fp)
            if fh:
                snap[str(fp.relative_to(ws))] = {"sha256": fh, "size": fp.stat().st_size}
    return snap

def diff_snapshots(old, new):
    changes = {"modified": [], "added": [], "deleted": []}
    for f in sorted(set(list(old) + list(new))):
        if f in old and f in new:
            if old[f]["sha256"] != new[f]["sha256"]:
                changes["modified"].append(f)
        elif f in new:
            changes["added"].append(f)
        else:
            changes["deleted"].append(f)
    return changes

# ── Free commands ────────────────────────────────────────────────────────

def cmd_init(ws):
    cp = chain_path(ws)
    if cp.exists() and cp.stat().st_size > 0:
        count = sum(1 for l in open(cp, "r", encoding="utf-8") if l.strip())
        print(f"Ledger already initialized.\n  Chain: {cp}\n  Entries: {count}")
        return 0
    snap = snapshot_workspace(ws)
    eh = append_entry(ws, "init", {
        "message": "Ledger initialized", "file_count": len(snap),
        "snapshot": {k: v["sha256"] for k, v in snap.items()},
    })
    sp = session_path(ws)
    with open(sp, "w", encoding="utf-8") as f:
        json.dump({"last_snapshot": snap, "init_time": now_iso()}, f, indent=2)
    print("=" * 60)
    print("OPENCLAW LEDGER PRO -- INITIALIZED")
    print("=" * 60)
    print(f"  Chain: {cp}\n  Files tracked: {len(snap)}\n  Entry hash: {eh[:16]}...\n")
    return 0

def cmd_record(ws, message=""):
    sp = session_path(ws)
    if not sp.exists():
        print("Ledger not initialized. Run 'init' first."); return 1
    with open(sp, "r", encoding="utf-8") as f:
        session = json.load(f)
    old_snap = session.get("last_snapshot", {})
    new_snap = snapshot_workspace(ws)
    changes = diff_snapshots(old_snap, new_snap)
    if not any(changes[k] for k in changes):
        print("[CLEAN] No changes since last record."); return 0
    eh = append_entry(ws, "record", {
        "message": message or "Workspace state recorded", "changes": changes,
        "snapshot": {k: v["sha256"] for k, v in new_snap.items()},
    })
    session["last_snapshot"] = new_snap
    with open(sp, "w", encoding="utf-8") as f:
        json.dump(session, f, indent=2)
    print("=" * 60)
    print("OPENCLAW LEDGER PRO -- RECORDED")
    print("=" * 60)
    print(f"  Modified: {len(changes['modified'])}\n  Added:    {len(changes['added'])}")
    print(f"  Deleted:  {len(changes['deleted'])}\n  Entry hash: {eh[:16]}...\n")
    for fp in changes["modified"]: print(f"  [MODIFIED] {fp}")
    for fp in changes["added"]:    print(f"  [ADDED]    {fp}")
    for fp in changes["deleted"]:  print(f"  [DELETED]  {fp}")
    print()
    return 0

def cmd_verify(ws):
    cp = chain_path(ws)
    if not cp.exists():
        print("No ledger found. Run 'init' first."); return 1
    print("=" * 60)
    print("OPENCLAW LEDGER PRO -- CHAIN VERIFICATION")
    print("=" * 60 + "\n")
    entries = read_chain(ws)
    if not entries:
        print("[EMPTY] No entries in chain."); return 0
    intact, broken, count = verify_chain_integrity(entries)
    if not intact:
        ej = entries[broken]
        try:
            e = json.loads(ej)
            print(f"  [TAMPERED] Entry {broken+1}: Hash chain broken")
            print(f"    Found prev: {e.get('prev_hash','missing')[:16]}...")
        except json.JSONDecodeError:
            print(f"  [TAMPERED] Entry {broken+1}: Invalid JSON")
        print(f"\nCHAIN BROKEN at entry {broken+1} of {count}")
        print("The audit trail has been tampered with.")
        return 2
    last_h = GENESIS_HASH
    for ej in entries: last_h = hash_entry(ej)
    first, last = json.loads(entries[0]), json.loads(entries[-1])
    print(f"  Entries verified: {count}\n  Chain status: INTACT")
    print(f"  Head hash: {last_h[:16]}...")
    print(f"  First entry: {first.get('timestamp','?')}\n  Last entry:  {last.get('timestamp','?')}")
    print("\n[VERIFIED] Hash chain is intact. No tampering detected.")
    return 0

def cmd_log(ws, count=10):
    cp = chain_path(ws)
    if not cp.exists():
        print("No ledger found. Run 'init' first."); return 1
    entries = read_chain(ws)
    show = min(count, len(entries))
    print("=" * 60)
    print(f"OPENCLAW LEDGER PRO -- LAST {show} ENTRIES")
    print("=" * 60 + "\n")
    for ej in entries[-count:]:
        try:
            e = json.loads(ej)
            d = e.get("data", {})
            print(f"  [{hash_entry(ej)[:12]}] {e.get('timestamp','?')}")
            print(f"    Event: {e.get('event','?')}")
            if d.get("message"): print(f"    Message: {d['message']}")
            ch = d.get("changes", {})
            if ch:
                m, a, r = len(ch.get("modified",[])), len(ch.get("added",[])), len(ch.get("deleted",[]))
                if m or a or r: print(f"    Changes: {m} modified, {a} added, {r} deleted")
        except json.JSONDecodeError:
            print("  [CORRUPT] Unreadable entry")
        print()
    return 0

def cmd_status(ws):
    cp = chain_path(ws)
    if not cp.exists():
        print("[UNINITIALIZED] No ledger found"); return 1
    count, last = 0, None
    try:
        with open(cp, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip(): count += 1; last = line.strip()
    except (OSError, PermissionError):
        print("[ERROR] Cannot read chain"); return 2
    if last:
        try:
            print(f"[ACTIVE] {count} entries, last: {json.loads(last).get('timestamp','?')}")
        except json.JSONDecodeError:
            print(f"[WARNING] {count} entries, last entry corrupt"); return 1
    else:
        print("[EMPTY] Chain initialized but no entries")
    fd = ledger_dir(ws) / FROZEN_DIR
    if fd.exists():
        fc = len(list(fd.glob("chain-*.jsonl")))
        if fc: print(f"  Frozen backups: {fc}")
    return 0

# ── Pro commands ─────────────────────────────────────────────────────────

def cmd_freeze(ws):
    """Create a read-only frozen backup of the chain."""
    cp = chain_path(ws)
    if not cp.exists() or cp.stat().st_size == 0:
        print("No ledger to freeze. Run 'init' first."); return 1
    entries = read_chain(ws)
    intact, _, count = verify_chain_integrity(entries)
    ts_str = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    eh = append_entry(ws, "freeze", {
        "message": f"Chain frozen at {ts_str}",
        "entry_count": count + 1, "chain_intact": intact,
    })
    fd = frozen_dir(ws)
    fp = fd / f"chain-{ts_str}.jsonl"
    shutil.copy2(cp, fp)
    try: fp.chmod(0o444)
    except OSError: pass
    print("=" * 60)
    print("OPENCLAW LEDGER PRO -- CHAIN FROZEN")
    print("=" * 60)
    print(f"  Source:  {cp}\n  Backup:  {fp}")
    print(f"  Entries: {count+1}\n  Chain integrity: {'INTACT' if intact else 'BROKEN'}")
    print(f"  Freeze hash: {eh[:16]}...\n")
    if not intact:
        print("  [WARNING] Chain was NOT intact at time of freeze.\n")
    frozen = sorted(fd.glob("chain-*.jsonl"))
    print(f"  Total frozen backups: {len(frozen)}")
    for ff in frozen: print(f"    {ff.name} ({ff.stat().st_size:,} bytes)")
    print()
    return 0

def cmd_forensics(ws, from_ts=None, to_ts=None):
    """Forensic analysis: timeline, file diffs, sessions, anomalies."""
    cp = chain_path(ws)
    if not cp.exists():
        print("No ledger found. Run 'init' first."); return 1
    entries = read_chain(ws)
    if not entries:
        print("[EMPTY] No entries to analyze."); return 0
    print("=" * 60)
    print("OPENCLAW LEDGER PRO -- FORENSIC ANALYSIS")
    print("=" * 60)
    print(f"  Analysis time: {now_iso()}\n")
    # Parse
    parsed, errs = [], 0
    for i, ej in enumerate(entries):
        try:
            e = json.loads(ej); e["_i"] = i; e["_h"] = hash_entry(ej)[:12]
            parsed.append(e)
        except json.JSONDecodeError:
            errs += 1
    if errs: print(f"  [WARNING] {errs} corrupt entries skipped\n")
    # Filter by time
    fil = parsed
    if from_ts: fil = [e for e in fil if e.get("timestamp","") >= from_ts]
    if to_ts:   fil = [e for e in fil if e.get("timestamp","") <= to_ts]
    if not fil:
        print("  No entries match the given time range."); return 0
    print(f"  Total entries: {len(parsed)}\n  Entries in range: {len(fil)}")
    if from_ts: print(f"  From: {from_ts}")
    if to_ts:   print(f"  To:   {to_ts}")
    intact, bk, _ = verify_chain_integrity(entries)
    print(f"\n  Chain integrity: {'INTACT' if intact else f'BROKEN at entry {bk+1}'}\n")
    # Timeline
    print("-" * 40 + "\nTIMELINE\n" + "-" * 40)
    anomalies, prev_ts, boundaries = [], None, []
    tot_m, tot_a, tot_d = 0, 0, 0
    for e in fil:
        ts, ev, d, idx, eh = e.get("timestamp","?"), e.get("event","?"), e.get("data",{}), e["_i"], e["_h"]
        # Time gap detection
        if prev_ts and ts != "?" and prev_ts != "?":
            try:
                gap = (datetime.fromisoformat(ts) - datetime.fromisoformat(prev_ts)).total_seconds()
                if gap > ANOMALY_GAP_SECS:
                    anomalies.append({"type":"time_gap","entry":idx+1,"detail":f"{gap/3600:.1f}h gap before entry {idx+1}"})
                    boundaries.append(idx)
            except (ValueError, TypeError): pass
        if ev == "init" and idx > 0: boundaries.append(idx)
        if idx in boundaries: print(f"\n  --- SESSION BOUNDARY ---\n")
        print(f"  [{eh}] Entry {idx+1}: {ev} @ {ts}")
        msg = d.get("message","")
        if msg: print(f"           {msg}")
        ch = d.get("changes", {})
        if ch:
            mod, add, rem = ch.get("modified",[]), ch.get("added",[]), ch.get("deleted",[])
            tot_m += len(mod); tot_a += len(add); tot_d += len(rem)
            total_in = len(mod) + len(add) + len(rem)
            if total_in > ANOMALY_BULK_THRESH:
                anomalies.append({"type":"bulk_change","entry":idx+1,"detail":f"{total_in} files changed in single entry"})
            for fp in mod[:10]: print(f"           [M] {fp}")
            if len(mod) > 10: print(f"           ... and {len(mod)-10} more modified")
            for fp in add[:10]: print(f"           [A] {fp}")
            if len(add) > 10: print(f"           ... and {len(add)-10} more added")
            for fp in rem[:10]: print(f"           [D] {fp}")
            if len(rem) > 10: print(f"           ... and {len(rem)-10} more deleted")
        snap = d.get("snapshot", {})
        if snap and ev == "init": print(f"           Snapshot: {len(snap)} files")
        if ev == "freeze":
            print(f"           Frozen entries: {d.get('entry_count','?')}")
            ci = d.get("chain_intact")
            if ci is not None: print(f"           Chain intact at freeze: {ci}")
        prev_ts = ts
    print()
    # Anomaly report
    print("-" * 40 + "\nANOMALY DETECTION\n" + "-" * 40)
    ts_list = [e.get("timestamp") for e in fil if e.get("timestamp")]
    seen = {}
    for t in ts_list: seen[t] = seen.get(t,0)+1
    for t, c in seen.items():
        if c > 1: anomalies.append({"type":"duplicate_timestamp","entry":None,"detail":f"Timestamp {t} appears {c} times"})
    for i in range(1, len(fil)):
        tp, tc = fil[i-1].get("timestamp",""), fil[i].get("timestamp","")
        if tp and tc and tc < tp:
            anomalies.append({"type":"timestamp_regression","entry":fil[i]["_i"]+1,"detail":f"Timestamp went backwards at entry {fil[i]['_i']+1}"})
    if anomalies:
        print(f"  {len(anomalies)} anomalies detected:\n")
        for a in anomalies:
            etype = a["type"].upper().replace("_"," ")
            es = f" (entry {a['entry']})" if a["entry"] else ""
            print(f"  [{etype}]{es}\n    {a['detail']}")
        print()
    else:
        print("  No anomalies detected.\n")
    # Summary
    print("-" * 40 + "\nSUMMARY\n" + "-" * 40)
    evts = {}
    for e in fil: evts[e.get("event","?")] = evts.get(e.get("event","?"),0)+1
    print(f"  Entries analyzed: {len(fil)}\n  Sessions detected: {len(boundaries)+1}")
    print("  Event breakdown:")
    for ev, c in sorted(evts.items()): print(f"    {ev}: {c}")
    print(f"  Total file changes:\n    Modified: {tot_m}\n    Added:    {tot_a}\n    Deleted:  {tot_d}")
    print(f"  Anomalies: {len(anomalies)}\n")
    return 1 if anomalies else 0

def cmd_restore(ws, from_frozen=None):
    """Restore chain from a frozen backup."""
    fd = ledger_dir(ws) / FROZEN_DIR
    if not fd.exists():
        print("No frozen backups found. Run 'freeze' first."); return 1
    frozen = sorted(fd.glob("chain-*.jsonl"))
    if not frozen:
        print("No frozen backups found. Run 'freeze' first."); return 1
    target = None
    if from_frozen:
        for ff in frozen:
            if from_frozen in ff.name: target = ff; break
        if not target:
            print(f"No frozen backup matching '{from_frozen}' found.\nAvailable:")
            for ff in frozen: print(f"  {ff.name}")
            return 1
    else:
        target = frozen[-1]
    print("=" * 60)
    print("OPENCLAW LEDGER PRO -- CHAIN RESTORE")
    print("=" * 60)
    print(f"  Restoring from: {target.name}\n")
    # Validate frozen chain
    fentries = []
    try:
        with open(target, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip(): fentries.append(line.strip())
    except (OSError, PermissionError):
        print("[ERROR] Cannot read frozen backup."); return 2
    intact, bk, count = verify_chain_integrity(fentries)
    print(f"  Frozen chain entries: {count}")
    print(f"  Frozen chain integrity: {'INTACT' if intact else 'BROKEN'}")
    if not intact:
        print(f"\n  [WARNING] Frozen backup broken at entry {bk+1}. Aborting."); return 2
    # Backup current chain
    cp = chain_path(ws)
    if cp.exists() and cp.stat().st_size > 0:
        ts_str = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        pre = frozen_dir(ws) / f"chain-pre-restore-{ts_str}.jsonl"
        shutil.copy2(cp, pre)
        print(f"  Current chain backed up: {pre.name}")
    # Restore
    shutil.copy2(target, cp)
    eh = append_entry(ws, "restore", {
        "message": f"Chain restored from: {target.name}",
        "frozen_source": target.name, "frozen_entries": count,
    })
    snap = snapshot_workspace(ws)
    with open(session_path(ws), "w", encoding="utf-8") as f:
        json.dump({"last_snapshot": snap, "init_time": now_iso(), "restored_from": target.name}, f, indent=2)
    print(f"  Chain restored.\n  Restore entry hash: {eh[:16]}...")
    print(f"  Current entry count: {count+1}\n\n  Run 'verify' to confirm integrity.\n")
    return 0

def cmd_export(ws, fmt="json"):
    """Export the full chain as JSON or text."""
    cp = chain_path(ws)
    if not cp.exists():
        print("No ledger found. Run 'init' first."); return 1
    entries = read_chain(ws)
    if not entries:
        print("[EMPTY] No entries to export."); return 0
    parsed, errs = [], 0
    for i, ej in enumerate(entries):
        try:
            e = json.loads(ej); e["_entry_number"] = i+1; e["_entry_hash"] = hash_entry(ej)
            parsed.append(e)
        except json.JSONDecodeError:
            errs += 1
            parsed.append({"_entry_number": i+1, "_entry_hash": None, "_parse_error": True, "_raw": ej})
    intact, bk, count = verify_chain_integrity(entries)
    if fmt == "json":
        out = {
            "export_timestamp": now_iso(), "export_format": "openclaw-ledger-pro/chain-export/v1",
            "workspace": str(ws), "chain_file": str(cp),
            "chain_integrity": "intact" if intact else f"broken at entry {bk+1}",
            "total_entries": len(entries), "parse_errors": errs, "entries": [],
        }
        for e in parsed:
            clean = {k: v for k, v in e.items() if not k.startswith("_") or k in ("_entry_number","_entry_hash","_parse_error","_raw")}
            out["entries"].append(clean)
        print(json.dumps(out, indent=2, ensure_ascii=False))
    elif fmt == "text":
        L = ["=" * 70, "OPENCLAW LEDGER PRO -- CHAIN EXPORT REPORT", "=" * 70]
        L += [f"  Export time:   {now_iso()}", f"  Workspace:     {ws}", f"  Chain file:    {cp}"]
        L += [f"  Total entries: {len(entries)}", f"  Chain status:  {'INTACT' if intact else f'BROKEN at entry {bk+1}'}"]
        if errs: L.append(f"  Parse errors:  {errs}")
        L += ["", "-" * 70, "ENTRIES", "-" * 70, ""]
        for e in parsed:
            num = e.get("_entry_number","?")
            eh = e.get("_entry_hash","?")
            if eh and len(eh) > 16: eh = eh[:16] + "..."
            if e.get("_parse_error"):
                L += [f"  Entry {num}: [CORRUPT]", ""]; continue
            d = e.get("data", {})
            L.append(f"  Entry {num} [{eh}]")
            L.append(f"    Time:    {e.get('timestamp','?')}")
            L.append(f"    Event:   {e.get('event','?')}")
            msg = d.get("message","")
            if msg: L.append(f"    Message: {msg}")
            ch = d.get("changes", {})
            if ch:
                mod, add, rem = ch.get("modified",[]), ch.get("added",[]), ch.get("deleted",[])
                if mod or add or rem:
                    L.append(f"    Changes: {len(mod)} modified, {len(add)} added, {len(rem)} deleted")
                    for fp in mod: L.append(f"      [M] {fp}")
                    for fp in add: L.append(f"      [A] {fp}")
                    for fp in rem: L.append(f"      [D] {fp}")
            snap = d.get("snapshot", {})
            if snap and e.get("event") == "init": L.append(f"    Snapshot: {len(snap)} files")
            L.append("")
        L += ["=" * 70, "END OF REPORT", "=" * 70]
        print("\n".join(L))
    else:
        print(f"Unknown format: {fmt}. Use json or text."); return 1
    return 0

def cmd_protect(ws):
    """Full protection sweep: verify, auto-freeze, restore, record."""
    print("=" * 60)
    print("OPENCLAW LEDGER PRO -- PROTECTION SWEEP")
    print("=" * 60)
    print(f"  Timestamp: {now_iso()}\n")
    cp = chain_path(ws)
    actions, rc = [], 0
    # Step 1: ensure ledger exists
    if not cp.exists() or cp.stat().st_size == 0:
        print("  [INIT] No ledger found. Initializing...")
        cmd_init(ws)
        actions.append("Ledger initialized")
        print("\n" + "-" * 40 + "\nPROTECTION RESULT\n" + "-" * 40)
        print(f"  Actions taken: {len(actions)}")
        for a in actions: print(f"    - {a}")
        print("\n[PROTECTED] Workspace ledger initialized and ready.")
        return 0
    # Step 2: verify chain
    print("  [STEP 1] Verifying chain integrity...")
    entries = read_chain(ws)
    intact, bk, count = verify_chain_integrity(entries)
    print(f"    Entries: {count}\n    Status:  {'INTACT' if intact else 'BROKEN'}")
    if not intact:
        print(f"    [TAMPERED] Chain broken at entry {bk+1}")
        rc = 2
        # Auto-freeze evidence
        print("\n  [STEP 2] Auto-freezing compromised chain for evidence...")
        ts_str = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        fd = frozen_dir(ws)
        ev_name = f"chain-evidence-{ts_str}.jsonl"
        ev_path = fd / ev_name
        shutil.copy2(cp, ev_path)
        try: ev_path.chmod(0o444)
        except OSError: pass
        actions.append(f"Evidence frozen: {ev_name}")
        print(f"    Saved: {ev_path}")
        # Find clean backup
        clean = None
        for ff in reversed(sorted(fd.glob("chain-*.jsonl"))):
            if ff == ev_path: continue
            bents = []
            try:
                with open(ff, "r", encoding="utf-8") as f:
                    for line in f:
                        if line.strip(): bents.append(line.strip())
            except (OSError, PermissionError): continue
            bi, _, _ = verify_chain_integrity(bents)
            if bi and bents: clean = ff; break
        if clean:
            print(f"\n  [STEP 3] Found clean backup: {clean.name}")
            print("    Auto-restoring...")
            shutil.copy2(clean, cp)
            append_entry(ws, "auto-restore", {
                "message": f"Auto-restored from {clean.name} during protect",
                "reason": f"Chain broken at entry {bk+1}", "frozen_source": clean.name,
            })
            actions.append(f"Chain auto-restored from {clean.name}")
            print("    Chain restored.")
        else:
            print("\n  [WARNING] No clean frozen backup for auto-restore.")
            print("    Run 'freeze' regularly to maintain recovery points.")
            actions.append("No clean backup available for auto-restore")
    else:
        print("    [OK] Chain is intact.")
    # Step 3: record state
    print("\n  [STEP 3] Recording current workspace state...")
    sp = session_path(ws)
    old_snap = {}
    if sp.exists():
        with open(sp, "r", encoding="utf-8") as f:
            old_snap = json.load(f).get("last_snapshot", {})
    new_snap = snapshot_workspace(ws)
    changes = diff_snapshots(old_snap, new_snap)
    has = any(changes[k] for k in changes)
    if has:
        append_entry(ws, "protect-record", {
            "message": "State recorded during protect sweep", "changes": changes,
            "snapshot": {k: v["sha256"] for k, v in new_snap.items()},
        })
        with open(sp, "w", encoding="utf-8") as f:
            json.dump({"last_snapshot": new_snap, "init_time": now_iso()}, f, indent=2)
        mc, ac, dc = len(changes["modified"]), len(changes["added"]), len(changes["deleted"])
        print(f"    Changes recorded: {mc} modified, {ac} added, {dc} deleted")
        actions.append(f"State recorded: {mc}M {ac}A {dc}D")
        if rc < 1: rc = 1
    else:
        print("    No changes since last record.")
    # Report
    print("\n" + "-" * 40 + "\nPROTECTION RESULT\n" + "-" * 40)
    print(f"  Actions taken: {len(actions)}")
    for a in actions: print(f"    - {a}")
    print()
    if rc == 0:   print("[PROTECTED] Workspace is clean. Chain intact, no changes.")
    elif rc == 1: print("[PROTECTED] Workspace changes recorded. Chain intact.")
    else:
        print("[ALERT] Tampering detected. Evidence preserved.")
        if any("auto-restored" in a.lower() for a in actions):
            print("  Chain was auto-restored from clean backup.")
        else:
            print("  No clean backup found. Manual intervention needed.")
            print("  Run 'forensics' to investigate.")
    print()
    return rc

# ── Main ─────────────────────────────────────────────────────────────────

def main():
    p = argparse.ArgumentParser(description="OpenClaw Ledger Pro -- Full audit trail suite")
    p.add_argument("command", choices=[
        "init","record","verify","log","status",
        "freeze","forensics","restore","export","protect",
    ], help="Command to run")
    p.add_argument("--message", "-m", default="", help="Entry message (record)")
    p.add_argument("--count", "-n", type=int, default=10, help="Entries to show (log)")
    p.add_argument("--workspace", "-w", help="Workspace path")
    p.add_argument("--from", dest="from_ts", default=None, help="Start timestamp (forensics)")
    p.add_argument("--to", dest="to_ts", default=None, help="End timestamp (forensics)")
    p.add_argument("--from-frozen", default=None, help="Frozen backup timestamp (restore)")
    p.add_argument("--format", dest="export_format", default="json",
                   choices=["json","text"], help="Export format (export)")
    args = p.parse_args()
    ws = resolve_workspace(args.workspace)
    if not ws.exists():
        print(f"Workspace not found: {ws}"); sys.exit(1)
    cmds = {
        "init": lambda: cmd_init(ws),
        "record": lambda: cmd_record(ws, args.message),
        "verify": lambda: cmd_verify(ws),
        "log": lambda: cmd_log(ws, args.count),
        "status": lambda: cmd_status(ws),
        "freeze": lambda: cmd_freeze(ws),
        "forensics": lambda: cmd_forensics(ws, args.from_ts, args.to_ts),
        "restore": lambda: cmd_restore(ws, args.from_frozen),
        "export": lambda: cmd_export(ws, args.export_format),
        "protect": lambda: cmd_protect(ws),
    }
    sys.exit(cmds[args.command]())

if __name__ == "__main__":
    main()
