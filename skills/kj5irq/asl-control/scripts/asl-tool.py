#!/usr/bin/env python3
"""Deterministic client for the ASL Agent REST API.

Goal: provide a single, typed entrypoint that OpenClaw can invoke via exec.

Auth/env:
- ASL_PI_IP (or ASL_API_BASE) and ASL_API_KEY must be set.

New features (phase 2+):
- report: produce a clean human-readable node report (or JSON)
- favorites: save node numbers under short names
- watch: poll for connection changes and emit events

Examples:
  asl-tool.py status --out text
  asl-tool.py nodes --out text
  asl-tool.py report --out text
  asl-tool.py connect 674982 --out text
  asl-tool.py connect 674982 --monitor-only --out text
  asl-tool.py connect-fav net --out text
  asl-tool.py disconnect 674982 --out text
  asl-tool.py favorites list
  asl-tool.py favorites set net 55553
  asl-tool.py favorites remove net
  asl-tool.py net start ares --out text
  asl-tool.py net tick --out text
  asl-tool.py watch --interval 5
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any
from urllib.parse import urljoin

import requests


def _env(name: str, default: str | None = None) -> str | None:
    v = os.environ.get(name)
    if v is None or v == "":
        return default
    return v


def _base_url() -> str:
    base = _env("ASL_API_BASE")
    if base:
        return base.rstrip("/") + "/"

    ip = _env("ASL_PI_IP")
    if not ip:
        raise SystemExit("Missing ASL_API_BASE or ASL_PI_IP in environment")
    return f"http://{ip}:8073/"


def _api_key() -> str:
    key = _env("ASL_API_KEY")
    if not key:
        raise SystemExit("Missing ASL_API_KEY in environment")
    return key


def _req(method: str, path: str, *, json_body: dict | None = None) -> dict:
    url = urljoin(_base_url(), path.lstrip("/"))
    headers = {"X-API-Key": _api_key()}

    r = requests.request(method, url, headers=headers, json=json_body, timeout=30)
    try:
        payload = r.json()
    except Exception:
        payload = {"success": False, "status": r.status_code, "text": r.text}

    if not r.ok:
        payload.setdefault("success", False)
        payload.setdefault("status", r.status_code)

    return payload


def _state_dir() -> Path:
    # Per-user state. Keeps git clean and survives updates.
    p = _env("ASL_STATE_DIR")
    if p:
        return Path(p).expanduser().resolve()
    return Path.home() / ".openclaw" / "state" / "asl-control"


def _favorites_path() -> Path:
    return _state_dir() / "favorites.json"


def _net_profiles_path() -> Path:
    return _state_dir() / "net-profiles.json"


def _net_session_path() -> Path:
    return _state_dir() / "net-session.json"


def _load_favorites() -> dict[str, int]:
    p = _favorites_path()
    if not p.exists():
        return {}
    try:
        d = json.loads(p.read_text(encoding="utf-8"))
        favs = d.get("favorites", d)
        out: dict[str, int] = {}
        for k, v in favs.items():
            out[str(k)] = int(v)
        return out
    except Exception:
        raise SystemExit(f"Failed to read favorites: {p}")


def _save_favorites(favs: dict[str, int]) -> None:
    p = _favorites_path()
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(
        json.dumps({"favorites": favs}, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def cmd_status(_: argparse.Namespace) -> dict:
    out = _req("GET", "/status")
    raw = out.get("raw_output") or []

    def _find(prefix: str) -> str | None:
        for line in raw:
            if isinstance(line, str) and line.strip().startswith(prefix):
                return line.split(":", 1)[-1].strip()
        return None

    node = out.get("node", "?")
    callsign = out.get("callsign", "")
    uptime = _find("Uptime") or "?"
    keyups = out.get("keyups_today") or _find("Keyups today") or "?"
    system = _find("System") or "?"
    sched = _find("Scheduler") or "?"
    sig = _find("Signal on input") or "?"

    header = f"Node {node} ({callsign})" if callsign else f"Node {node}"
    out["output"] = f"{header} | Up {uptime} | {keyups} keyups | System {system} | Sched {sched} | Signal {sig}"
    return out


def cmd_nodes(_: argparse.Namespace) -> dict:
    out = _req("GET", "/nodes")
    connected = out.get("connected_nodes") or []
    # de-dupe
    seen: set[str] = set()
    dedup: list[str] = []
    for n in connected:
        val = str(n.get("node", ""))
        if val and val not in seen:
            seen.add(val)
            dedup.append(val)
    count = len(dedup)
    out["output"] = f"{count} nodes: {', '.join(dedup)}" if count else "0 nodes connected"
    return out


def cmd_connect(args: argparse.Namespace) -> dict:
    body = {"node": str(args.node), "monitor_only": bool(args.monitor_only)}
    out = _req("POST", "/connect", json_body=body)
    mode = "monitor" if bool(args.monitor_only) else "transceive"
    out.setdefault("output", f"Connected to node {args.node} ({mode})" if out.get("success", True) else f"Failed to connect to node {args.node}")
    return out


def cmd_connect_fav(args: argparse.Namespace) -> dict:
    favs = _load_favorites()
    if args.name not in favs:
        return {
            "success": False,
            "error": f"Favorite not found: {args.name}",
            "output": f"Favorite not found: {args.name}",
            "favorites": favs,
        }
    node = favs[args.name]
    mode = "monitor" if bool(args.monitor_only) else "transceive"
    body = {"node": str(node), "monitor_only": bool(args.monitor_only)}
    out = _req("POST", "/connect", json_body=body)
    out["favorite"] = args.name
    out.setdefault("output", f"Connected to {args.name} (node {node}, {mode})" if out.get("success", True) else f"Failed to connect to {args.name} (node {node})")
    return out


def cmd_disconnect(args: argparse.Namespace) -> dict:
    out = _req("POST", "/disconnect", json_body={"node": str(args.node)})
    out.setdefault("output", f"Disconnected from node {args.node}" if out.get("success", True) else f"Failed to disconnect from node {args.node}")
    return out


def cmd_audit(args: argparse.Namespace) -> dict:
    return _req("GET", f"/audit?lines={int(args.lines)}")


def _format_report(status: dict[str, Any], nodes: dict[str, Any]) -> str:
    node = status.get("node", "?")
    callsign = status.get("callsign", "")

    # status fields from backend are currently strings
    uptime = None
    raw = status.get("raw_output") or []
    for line in raw:
        if isinstance(line, str) and line.strip().startswith("Uptime"):
            uptime = line.split(":", 1)[-1].strip()

    connected_list = nodes.get("connected_nodes") or []
    # de-dupe while preserving order
    seen = set()
    dedup = []
    for n in connected_list:
        val = str(n.get("node", ""))
        if not val or val in seen:
            continue
        seen.add(val)
        dedup.append(n)

    count = len(dedup)
    node_ids = ", ".join([str(n.get("node")) for n in dedup][:25])
    if count > 25:
        node_ids += ", ..."

    keyups_today = status.get("keyups_today", "?")

    lines = []
    lines.append(f"ASL Node Report: {node}{(' (' + callsign + ')') if callsign else ''}")
    if uptime:
        lines.append(f"Uptime: {uptime}")
    lines.append(f"Keyups today: {keyups_today}")
    lines.append(f"Connected nodes: {count}{(' - ' + node_ids) if node_ids else ''}")

    # Asterisk stats we commonly care about
    def _find(prefix: str) -> str | None:
        for line in raw:
            if isinstance(line, str) and line.strip().startswith(prefix):
                return line.split(":", 1)[-1].strip()
        return None

    system = _find("System")
    sched = _find("Scheduler")
    sig = _find("Signal on input")
    autopatch = _find("Autopatch")
    autopatch_state = _find("Autopatch state")

    if system:
        lines.append(f"System: {system}")
    if sched:
        lines.append(f"Scheduler: {sched}")
    if sig:
        lines.append(f"Signal on input: {sig}")
    if autopatch:
        lines.append(f"Autopatch: {autopatch}{(' (state ' + autopatch_state + ')') if autopatch_state else ''}")

    return "\n".join(lines)


def cmd_report(args: argparse.Namespace) -> dict:
    status = _req("GET", "/status")
    nodes = _req("GET", "/nodes")

    report_text = _format_report(status, nodes)

    out: dict[str, Any] = {
        "success": bool(status.get("success", True)) and bool(nodes.get("success", True)),
        "node": status.get("node"),
        "callsign": status.get("callsign"),
        "report": report_text,
        "status": status,
        "nodes": nodes,
    }

    if args.format == "text":
        # Still return JSON wrapper for deterministic parsing, but put report first.
        out["output"] = report_text
    return out


def cmd_fav_list(_: argparse.Namespace) -> dict:
    return {"success": True, "favorites": _load_favorites()}


def cmd_fav_set(args: argparse.Namespace) -> dict:
    favs = _load_favorites()
    favs[args.name] = int(args.node)
    _save_favorites(favs)
    return {"success": True, "favorites": favs}


def cmd_fav_remove(args: argparse.Namespace) -> dict:
    favs = _load_favorites()
    if args.name in favs:
        favs.pop(args.name)
        _save_favorites(favs)
        return {"success": True, "favorites": favs}
    return {"success": False, "error": f"Favorite not found: {args.name}", "favorites": favs}


def _load_net_profiles() -> dict[str, Any]:
    p = _net_profiles_path()
    if not p.exists():
        return {"profiles": {}}
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        raise SystemExit(f"Failed to read net profiles: {p}")


def _save_net_profiles(obj: dict[str, Any]) -> None:
    p = _net_profiles_path()
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(obj, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def cmd_net_list(_: argparse.Namespace) -> dict:
    return {"success": True, **_load_net_profiles()}


def cmd_net_set(args: argparse.Namespace) -> dict:
    obj = _load_net_profiles()
    profiles = obj.setdefault("profiles", {})
    profiles[args.name] = {
        "node": int(args.node),
        "monitor_only": bool(args.monitor_only),
        "duration_minutes": int(args.duration_minutes),
    }
    _save_net_profiles(obj)
    return {"success": True, **obj}


def cmd_net_remove(args: argparse.Namespace) -> dict:
    obj = _load_net_profiles()
    profiles = obj.setdefault("profiles", {})
    if args.name in profiles:
        profiles.pop(args.name)
        _save_net_profiles(obj)
        return {"success": True, **obj}
    return {"success": False, "error": f"Net profile not found: {args.name}", **obj}


def _load_net_session() -> dict[str, Any] | None:
    p = _net_session_path()
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return None


def _save_net_session(obj: dict[str, Any] | None) -> None:
    p = _net_session_path()
    p.parent.mkdir(parents=True, exist_ok=True)
    if obj is None:
        if p.exists():
            p.unlink()
        return
    p.write_text(json.dumps(obj, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def cmd_net_start(args: argparse.Namespace) -> dict:
    profs = _load_net_profiles().get("profiles", {})
    prof = profs.get(args.name)
    if not prof:
        return {"success": False, "error": f"Net profile not found: {args.name}", "profiles": list(profs.keys())}

    node = int(prof["node"])
    monitor_only = bool(prof.get("monitor_only", False))
    dur_min = int(prof.get("duration_minutes", 60))
    if args.duration_minutes is not None:
        dur_min = int(args.duration_minutes)

    # Connect now
    connect_out = _req("POST", "/connect", json_body={"node": str(node), "monitor_only": monitor_only})

    now = int(time.time())
    end_ts = now + dur_min * 60
    session = {
        "profile": args.name,
        "node": node,
        "monitor_only": monitor_only,
        "started_ts": now,
        "end_ts": end_ts,
    }
    _save_net_session(session)

    ok = bool(connect_out.get("success", True))
    mode = "monitor" if monitor_only else "transceive"
    out_text = (
        f"NET STARTED: {args.name} -> node {node} ({mode}) for {dur_min}m (auto-disconnect)"
        if ok
        else f"NET START FAILED: {args.name} -> node {node}"
    )

    return {
        "success": ok,
        "action": "net_start",
        "output": out_text,
        "session": session,
        "connect": connect_out,
        "note": "Auto-disconnect is default. Run: asl-tool.py net tick (cron-friendly) to enforce, or net stop to end early.",
    }


def cmd_net_status(_: argparse.Namespace) -> dict:
    sess = _load_net_session()
    if not sess:
        return {"success": True, "active": False, "output": "No active net session"}
    remaining = int(sess.get("end_ts", 0)) - int(time.time())
    rem = max(0, remaining)
    mins = rem // 60
    secs = rem % 60
    out = f"NET ACTIVE: {sess.get('profile')} -> node {sess.get('node')} (remaining {mins}m{secs:02d}s)"
    return {"success": True, "active": True, "session": sess, "remaining_seconds": rem, "output": out}


def cmd_net_stop(_: argparse.Namespace) -> dict:
    sess = _load_net_session()
    if not sess:
        return {"success": True, "active": False, "output": "No active net session"}
    node = int(sess.get("node"))
    out = _req("POST", "/disconnect", json_body={"node": str(node)})
    _save_net_session(None)
    ok = bool(out.get("success", True))
    return {
        "success": ok,
        "action": "net_stop",
        "output": f"NET STOPPED: disconnected node {node}" if ok else f"NET STOP FAILED: node {node}",
        "disconnect": out,
    }


def cmd_net_tick(_: argparse.Namespace) -> dict:
    """Cron-friendly enforcement: if active session expired, disconnect."""
    sess = _load_net_session()
    if not sess:
        return {"success": True, "active": False, "output": "No active net session"}

    now = int(time.time())
    end_ts = int(sess.get("end_ts", 0))
    if now < end_ts:
        rem = end_ts - now
        mins = rem // 60
        secs = rem % 60
        return {
            "success": True,
            "active": True,
            "action": "noop",
            "session": sess,
            "remaining_seconds": rem,
            "output": f"NET OK: {sess.get('profile')} remaining {mins}m{secs:02d}s",
        }

    node = int(sess.get("node"))
    out = _req("POST", "/disconnect", json_body={"node": str(node)})
    _save_net_session(None)
    ok = bool(out.get("success", True))
    return {
        "success": ok,
        "active": False,
        "action": "auto_disconnect",
        "output": f"NET AUTO-DISCONNECT: node {node}" if ok else f"NET AUTO-DISCONNECT FAILED: node {node}",
        "disconnect": out,
        "expired_session": sess,
    }


def _nodes_signature(nodes: dict[str, Any]) -> list[str]:
    lst = nodes.get("connected_nodes") or []
    out = []
    for n in lst:
        node = str(n.get("node", ""))
        mode = str(n.get("mode", ""))
        if node:
            out.append(f"{node}:{mode}")
    # de-dupe while preserving order
    seen = set()
    dedup = []
    for x in out:
        if x in seen:
            continue
        seen.add(x)
        dedup.append(x)
    return dedup


def cmd_watch(args: argparse.Namespace) -> dict:
    interval = float(args.interval)
    if interval < 1:
        return {"success": False, "error": "interval must be >= 1"}

    prev: list[str] | None = None
    start = time.time()

    # Stream events to stdout as JSON lines (one per change). Final return is a summary.
    changes = 0
    while True:
        nodes = _req("GET", "/nodes")
        sig = _nodes_signature(nodes)

        if prev is None:
            prev = sig
            if args.emit_initial:
                sys.stdout.write(json.dumps({"event": "initial", "nodes": sig}) + "\n")
                sys.stdout.flush()
        else:
            if sig != prev:
                prev_set = set(prev)
                sig_set = set(sig)
                joined = sorted(list(sig_set - prev_set))
                left = sorted(list(prev_set - sig_set))
                evt = {
                    "event": "change",
                    "joined": joined,
                    "left": left,
                    "nodes": sig,
                    "ts": int(time.time()),
                }
                sys.stdout.write(json.dumps(evt) + "\n")
                sys.stdout.flush()
                prev = sig
                changes += 1

        if args.max_seconds is not None and (time.time() - start) >= float(args.max_seconds):
            break
        time.sleep(interval)

    return {"success": True, "changes": changes}


def _emit(out: dict, out_mode: str) -> int:
    if out_mode == "text":
        text = out.get("output") or out.get("report")
        if not text:
            # fallback: compact one-line
            if out.get("success", True):
                text = "OK"
            else:
                text = out.get("error") or "ERROR"
        sys.stdout.write(str(text).rstrip() + "\n")
    else:
        sys.stdout.write(json.dumps(out, indent=2, sort_keys=False) + "\n")
    return 0 if out.get("success", True) else 2


def main(argv: list[str]) -> int:
    p = argparse.ArgumentParser(prog="asl-tool.py", add_help=True)
    sub = p.add_subparsers(dest="cmd", required=True)

    def add_out(sp: argparse.ArgumentParser) -> None:
        sp.add_argument("--out", choices=["json", "text"], default="json", help="Output format")

    sp = sub.add_parser("status", help="Get local node status")
    add_out(sp)
    sp.set_defaults(fn=cmd_status)

    sp = sub.add_parser("nodes", help="List connected nodes")
    add_out(sp)
    sp.set_defaults(fn=cmd_nodes)

    sp = sub.add_parser("report", help="Human-friendly report (wraps /status + /nodes)")
    add_out(sp)
    sp.add_argument("--format", choices=["json", "text"], default="text")
    sp.set_defaults(fn=cmd_report)

    sp = sub.add_parser("connect", help="Connect to a node")
    add_out(sp)
    sp.add_argument("node", type=int, help="Target node number")
    sp.add_argument("--monitor-only", action="store_true", help="RX-only monitor mode")
    sp.set_defaults(fn=cmd_connect)

    sp = sub.add_parser("connect-fav", help="Connect using a saved favorite name")
    add_out(sp)
    sp.add_argument("name", help="Favorite name")
    sp.add_argument("--monitor-only", action="store_true", help="RX-only monitor mode")
    sp.set_defaults(fn=cmd_connect_fav)

    sp = sub.add_parser("disconnect", help="Disconnect from a node")
    add_out(sp)
    sp.add_argument("node", type=int, help="Target node number")
    sp.set_defaults(fn=cmd_disconnect)

    sp = sub.add_parser("audit", help="Read audit log")
    add_out(sp)
    sp.add_argument("--lines", type=int, default=20, help="How many lines")
    sp.set_defaults(fn=cmd_audit)

    sp = sub.add_parser("favorites", help="Manage favorite node shortcuts")
    add_out(sp)
    fav_sub = sp.add_subparsers(dest="fav_cmd", required=True)

    sp2 = fav_sub.add_parser("list", help="List favorites")
    add_out(sp2)
    sp2.set_defaults(fn=cmd_fav_list)

    sp2 = fav_sub.add_parser("set", help="Set favorite name -> node")
    add_out(sp2)
    sp2.add_argument("name")
    sp2.add_argument("node", type=int)
    sp2.set_defaults(fn=cmd_fav_set)

    sp2 = fav_sub.add_parser("remove", help="Remove favorite")
    add_out(sp2)
    sp2.add_argument("name")
    sp2.set_defaults(fn=cmd_fav_remove)

    sp = sub.add_parser("net", help="Manage net profiles and run timed net sessions")
    add_out(sp)
    net_sub = sp.add_subparsers(dest="net_cmd", required=True)

    sp2 = net_sub.add_parser("list", help="List net profiles")
    add_out(sp2)
    sp2.set_defaults(fn=cmd_net_list)

    sp2 = net_sub.add_parser("set", help="Set net profile")
    add_out(sp2)
    sp2.add_argument("name")
    sp2.add_argument("node", type=int)
    sp2.add_argument("--monitor-only", action="store_true")
    sp2.add_argument("--duration-minutes", type=int, default=90)
    sp2.set_defaults(fn=cmd_net_set)

    sp2 = net_sub.add_parser("remove", help="Remove net profile")
    add_out(sp2)
    sp2.add_argument("name")
    sp2.set_defaults(fn=cmd_net_remove)

    sp2 = net_sub.add_parser("start", help="Start a net session (auto-disconnect default)")
    add_out(sp2)
    sp2.add_argument("name")
    sp2.add_argument("--duration-minutes", type=int, default=None)
    sp2.set_defaults(fn=cmd_net_start)

    sp2 = net_sub.add_parser("status", help="Show active net session")
    add_out(sp2)
    sp2.set_defaults(fn=cmd_net_status)

    sp2 = net_sub.add_parser("stop", help="Stop net session early")
    add_out(sp2)
    sp2.set_defaults(fn=cmd_net_stop)

    sp2 = net_sub.add_parser("tick", help="Enforce auto-disconnect (cron-friendly)")
    add_out(sp2)
    sp2.set_defaults(fn=cmd_net_tick)

    sp = sub.add_parser("watch", help="Watch connected nodes and emit JSON-line events")
    add_out(sp)
    sp.add_argument("--interval", type=float, default=5.0)
    sp.add_argument("--max-seconds", type=float, default=None)
    sp.add_argument("--emit-initial", action="store_true", help="Emit initial state event")
    sp.set_defaults(fn=cmd_watch)

    args = p.parse_args(argv)

    out_mode = getattr(args, "out", "json")

    # Dispatch favorites subcommand
    if args.cmd == "favorites":
        out = args.fn(args)
        return _emit(out, out_mode)

    # Dispatch net subcommand
    if args.cmd == "net":
        out = args.fn(args)
        return _emit(out, out_mode)

    out = args.fn(args)
    return _emit(out, out_mode)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
