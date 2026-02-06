import hashlib
import json
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import scripts.core as core
import scripts.db as db


def _parse_iso(ts: Optional[str]) -> Optional[datetime]:
    if not ts:
        return None
    try:
        return datetime.fromisoformat(ts)
    except ValueError:
        return None


def _branch_name_for_id(branch_id: str) -> str:
    conn = db.get_connection()
    c = conn.cursor()
    c.execute("SELECT name FROM branches WHERE id=?", (branch_id,))
    row = c.fetchone()
    conn.close()
    return row[0] if row and row[0] else "main"


def _result_hash(result: Any) -> str:
    try:
        blob = json.dumps(result, sort_keys=True, ensure_ascii=True).encode()
    except Exception:
        blob = repr(result).encode()
    return hashlib.sha256(blob).hexdigest()


def _format_search_result(result: Any, query: str, limit: int = 5) -> str:
    if not isinstance(result, dict):
        return f"Query: {query}\n\nRaw:\n{repr(result)[:4000]}"

    web = result.get("web", {}) if isinstance(result.get("web"), dict) else {}
    results = web.get("results", []) if isinstance(web.get("results"), list) else []
    lines: List[str] = [f"Query: {query}", ""]
    for r in results[: max(1, int(limit))]:
        if not isinstance(r, dict):
            continue
        title = (r.get("title") or "").strip()
        url = (r.get("url") or "").strip()
        desc = (r.get("description") or "").strip()
        if title and url:
            lines.append(f"- {title}\n  {url}")
            if desc:
                lines.append(f"  {desc[:240]}")
    return "\n".join(lines)[:5000]


def run_once(
    *,
    project_id: Optional[str] = None,
    branch: Optional[str] = None,
    limit: int = 10,
    dry_run: bool = False,
) -> List[Dict[str, Any]]:
    """
    Execute due watch targets once. Returns a list of actions taken.
    """
    now = datetime.now()
    now_iso = now.isoformat()

    conn = db.get_connection()
    c = conn.cursor()
    params: List[Any] = ["active"]
    query = (
        "SELECT id, project_id, branch_id, target_type, target, tags, interval_s, last_run_at, last_result_hash "
        "FROM watch_targets WHERE status=?"
    )
    if project_id:
        query += " AND project_id=?"
        params.append(project_id)
    if branch:
        branch_id = core.resolve_branch_id(project_id or "", branch) if project_id else None
        if branch_id:
            query += " AND branch_id=?"
            params.append(branch_id)

    query += " ORDER BY updated_at ASC"
    c.execute(query, params)
    rows = c.fetchall()
    conn.close()

    due: List[Dict[str, Any]] = []
    for tid, pid, bid, ttype, target, tags, interval_s, last_run_at, last_hash in rows:
        last_dt = _parse_iso(last_run_at)
        interval = timedelta(seconds=int(interval_s or 0))
        if not last_dt or (now - last_dt) >= interval:
            due.append(
                {
                    "id": tid,
                    "project_id": pid,
                    "branch_id": bid,
                    "type": ttype,
                    "target": target,
                    "tags": tags or "",
                    "interval_s": int(interval_s or 0),
                    "last_result_hash": last_hash or "",
                }
            )

    actions: List[Dict[str, Any]] = []
    service = core.get_ingest_service()

    for target in due[: max(0, int(limit))]:
        tid = target["id"]
        pid = target["project_id"]
        bid = target["branch_id"]
        ttype = target["type"]
        val = target["target"]
        tags = target["tags"]
        branch_name = _branch_name_for_id(bid)
        tag_list = [t.strip() for t in tags.split(",") if t.strip()]

        if dry_run:
            actions.append({"id": tid, "project_id": pid, "type": ttype, "target": val, "status": "dry_run"})
            continue

        try:
            if ttype == "url":
                res = service.ingest(pid, val, extra_tags=tag_list + ["watchdog"], branch=branch_name)
                core.update_watch_target_run(tid, last_run_at=now_iso, last_error="" if res.success else (res.error or ""))
                actions.append({"id": tid, "project_id": pid, "type": ttype, "target": val, "success": res.success})
            elif ttype == "query":
                cached = core.check_search(val)
                if cached is None:
                    cached = core.perform_brave_search(val)
                    core.log_search(val, cached)

                rh = _result_hash(cached)
                if rh != (target["last_result_hash"] or ""):
                    content = _format_search_result(cached, val)
                    core.add_insight(
                        pid,
                        title=f"Watchdog: {val}",
                        content=content,
                        source_url="",
                        tags=",".join([t for t in (tag_list + ["watchdog", "search"]) if t]),
                        confidence=0.65,
                        branch=branch_name,
                    )
                    core.log_event(
                        pid,
                        "WATCHDOG",
                        "query",
                        {"target_id": tid, "query": val, "result_hash": rh},
                        confidence=0.8,
                        source="vault",
                        tags="watchdog,search",
                        branch=branch_name,
                    )
                    actions.append(
                        {"id": tid, "project_id": pid, "type": ttype, "target": val, "status": "ingested"}
                    )
                else:
                    actions.append({"id": tid, "project_id": pid, "type": ttype, "target": val, "status": "no_change"})

                core.update_watch_target_run(tid, last_run_at=now_iso, last_result_hash=rh, last_error="")
            else:
                core.update_watch_target_run(tid, last_run_at=now_iso, last_error=f"Unknown target_type: {ttype}")
                actions.append({"id": tid, "project_id": pid, "type": ttype, "target": val, "status": "error"})
        except core.MissingAPIKeyError as e:
            core.update_watch_target_run(tid, last_run_at=now_iso, last_error=str(e))
            actions.append({"id": tid, "project_id": pid, "type": ttype, "target": val, "status": "blocked"})
        except Exception as e:
            core.update_watch_target_run(tid, last_run_at=now_iso, last_error=str(e))
            actions.append({"id": tid, "project_id": pid, "type": ttype, "target": val, "status": "error"})

    return actions


def loop(interval_s: int = 300, *, limit: int = 10) -> None:
    """Run the watchdog forever (until Ctrl-C)."""
    while True:
        run_once(limit=limit)
        time.sleep(max(1, int(interval_s)))

