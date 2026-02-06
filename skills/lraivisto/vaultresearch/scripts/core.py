import json
import sqlite3
import hashlib
import os
import re
import uuid
import requests
from typing import List, Optional, Dict, Any, Type, Tuple
from datetime import datetime, timedelta
import scripts.db as db
from scripts.scuttle import Connector, ArtifactDraft, IngestResult

class MissingAPIKeyError(Exception):
    pass

class IngestService:
    """Service to manage connector registration and ingestion routing."""
    
    def __init__(self):
        self._connectors: List[Connector] = []

    def register_connector(self, connector: Connector):
        self._connectors.append(connector)

    def get_connector_for(self, source: str) -> Optional[Connector]:
        for connector in self._connectors:
            if connector.can_handle(source):
                return connector
        return None

    def ingest(
        self,
        project_id: str,
        source: str,
        extra_tags: List[str] = None,
        branch: Optional[str] = None,
    ) -> IngestResult:
        connector = self.get_connector_for(source)
        if not connector:
            return IngestResult(success=False, error=f"No connector found for source: {source}")

        try:
            draft = connector.fetch(source)
            
            # Merge tags
            all_tags = draft.tags
            if extra_tags:
                all_tags.extend([t for t in extra_tags if t not in all_tags])
            
            # Add to database (Finding table)
            add_insight(
                project_id, 
                draft.title, 
                draft.content, 
                source_url=source, 
                tags=",".join(all_tags),
                confidence=draft.confidence,
                branch=branch,
            )
            # Log event
            log_event(
                project_id, 
                "INGEST", 
                "connector_fetch", 
                draft.raw_payload or {"title": draft.title},
                confidence=draft.confidence,
                source=draft.source,
                tags=",".join(all_tags),
                branch=branch,
            )
            return IngestResult(success=True, metadata={"title": draft.title, "source": draft.source})
        except Exception as e:
            return IngestResult(success=False, error=str(e))

def _safe_id_part(raw: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_-]", "_", (raw or "").strip())

def _make_branch_id(project_id: str, branch_name: str) -> str:
    return f"br_{_safe_id_part(project_id)}_{_safe_id_part(branch_name)}"

def ensure_branch(project_id: str, branch_name: str, parent_branch: Optional[str] = None, hypothesis: str = "") -> str:
    """Create a branch if missing and return its branch_id."""
    conn = db.get_connection()
    c = conn.cursor()
    now = datetime.now().isoformat()

    branch_name = (branch_name or "main").strip()
    if not branch_name:
        branch_name = "main"

    parent_id = None
    if parent_branch:
        c.execute("SELECT id FROM branches WHERE project_id=? AND name=?", (project_id, parent_branch))
        row = c.fetchone()
        if not row:
            conn.close()
            raise ValueError(f"Parent branch '{parent_branch}' not found for project '{project_id}'.")
        parent_id = row[0]

    branch_id = _make_branch_id(project_id, branch_name)
    c.execute(
        "INSERT OR IGNORE INTO branches (id, project_id, name, parent_id, hypothesis, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (branch_id, project_id, branch_name, parent_id, hypothesis or "", "active", now),
    )
    conn.commit()
    conn.close()
    return branch_id

def resolve_branch_id(project_id: str, branch: Optional[str]) -> str:
    """Resolve a branch name (or None) to a branch_id; defaults to the project's 'main' branch."""
    branch_name = (branch or "main").strip()
    if not branch_name:
        branch_name = "main"

    conn = db.get_connection()
    c = conn.cursor()
    c.execute("SELECT id FROM branches WHERE project_id=? AND name=?", (project_id, branch_name))
    row = c.fetchone()
    conn.close()
    if row:
        return row[0]

    if branch_name == "main":
        # Ensure default branch exists (for older DBs or manually-created projects).
        return ensure_branch(project_id, "main")

    raise ValueError(f"Branch '{branch_name}' not found for project '{project_id}'.")

def create_branch(project_id: str, name: str, parent: Optional[str] = None, hypothesis: str = "") -> str:
    """Create a new branch (explicit user action)."""
    return ensure_branch(project_id, name, parent_branch=parent, hypothesis=hypothesis)

def list_branches(project_id: str):
    conn = db.get_connection()
    c = conn.cursor()
    c.execute(
        "SELECT id, name, parent_id, hypothesis, status, created_at FROM branches WHERE project_id=? ORDER BY created_at ASC",
        (project_id,),
    )
    rows = c.fetchall()
    conn.close()
    return rows

def add_hypothesis(
    project_id: str,
    branch: str,
    statement: str,
    rationale: str = "",
    confidence: float = 0.5,
    status: str = "open",
):
    branch_id = resolve_branch_id(project_id, branch)
    conn = db.get_connection()
    c = conn.cursor()
    now = datetime.now().isoformat()
    hypothesis_id = f"hyp_{uuid.uuid4().hex[:10]}"
    c.execute(
        "INSERT INTO hypotheses (id, branch_id, statement, rationale, confidence, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (hypothesis_id, branch_id, statement, rationale or "", confidence, status, now, now),
    )
    conn.commit()
    conn.close()
    return hypothesis_id

def list_hypotheses(project_id: str, branch: Optional[str] = None):
    conn = db.get_connection()
    c = conn.cursor()
    if branch:
        branch_id = resolve_branch_id(project_id, branch)
        c.execute(
            """SELECT h.id, b.name, h.statement, h.rationale, h.confidence, h.status, h.created_at, h.updated_at
               FROM hypotheses h
               JOIN branches b ON b.id = h.branch_id
               WHERE b.project_id=? AND h.branch_id=?
               ORDER BY h.created_at DESC""",
            (project_id, branch_id),
        )
    else:
        c.execute(
            """SELECT h.id, b.name, h.statement, h.rationale, h.confidence, h.status, h.created_at, h.updated_at
               FROM hypotheses h
               JOIN branches b ON b.id = h.branch_id
               WHERE b.project_id=?
               ORDER BY h.created_at DESC""",
            (project_id,),
        )
    rows = c.fetchall()
    conn.close()
    return rows

def perform_brave_search(query):
    api_key = os.environ.get("BRAVE_API_KEY")
    if not api_key:
        raise MissingAPIKeyError("BRAVE_API_KEY not found in environment variables.")
        
    url = "https://api.search.brave.com/res/v1/web/search"
    headers = {
        "X-Subscription-Token": api_key,
        "Accept": "application/json"
    }
    params = {"q": query}
    
    response = requests.get(url, headers=headers, params=params)
    response.raise_for_status()
    return response.json()

def log_search(query, result):
    query_hash = hashlib.sha256(query.lower().strip().encode()).hexdigest()
    conn = db.get_connection()
    c = conn.cursor()
    now = datetime.now().isoformat()
    c.execute("INSERT OR REPLACE INTO search_cache VALUES (?, ?, ?, ?)",
              (query_hash, query, json.dumps(result), now))
    conn.commit()
    conn.close()

def check_search(query, ttl_hours=24):
    query_hash = hashlib.sha256(query.lower().strip().encode()).hexdigest()
    conn = db.get_connection()
    c = conn.cursor()
    c.execute("SELECT result, timestamp FROM search_cache WHERE query_hash=?", (query_hash,))
    row = c.fetchone()
    conn.close()
    if row:
        result, timestamp = row
        try:
            cached_time = datetime.fromisoformat(timestamp)
            if datetime.now() - cached_time < timedelta(hours=ttl_hours):
                return json.loads(result)
        except ValueError:
            pass
    return None

def start_project(project_id, name, objective, priority=0, silent: bool = False):
    conn = db.get_connection()
    c = conn.cursor()
    now = datetime.now().isoformat()
    c.execute(
        "INSERT OR IGNORE INTO projects (id, name, objective, status, created_at, priority) VALUES (?, ?, ?, ?, ?, ?)",
        (project_id, name, objective, "active", now, priority),
    )
    conn.commit()
    conn.close()
    # Ensure default branch exists.
    ensure_branch(project_id, "main")
    if not silent:
        print(f"Project '{name}' ({project_id}) initialized with priority {priority}.")

def log_event(
    project_id,
    event_type,
    step,
    payload,
    confidence=1.0,
    source="unknown",
    tags="",
    branch: Optional[str] = None,
):
    conn = db.get_connection()
    c = conn.cursor()
    now = datetime.now().isoformat()
    branch_id = resolve_branch_id(project_id, branch)
    c.execute(
        "INSERT INTO events (project_id, event_type, step, payload, confidence, source, tags, timestamp, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (project_id, event_type, step, json.dumps(payload), confidence, source, tags, now, branch_id),
    )
    conn.commit()
    conn.close()

def get_status(project_id, tag_filter=None, branch: Optional[str] = None):
    conn = db.get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM projects WHERE id=?", (project_id,))
    project = c.fetchone()
    if not project:
        conn.close()
        return None
    
    branch_id = resolve_branch_id(project_id, branch)
    query = "SELECT event_type, step, payload, confidence, source, timestamp, tags FROM events WHERE project_id=? AND branch_id=?"
    params = [project_id, branch_id]
    if tag_filter:
        query += " AND tags LIKE ?"
        params.append(f"%{tag_filter}%")
    query += " ORDER BY id DESC LIMIT 10"
    
    c.execute(query, params)
    events = c.fetchall()
    conn.close()
    return {"project": project, "recent_events": events}

def update_status(project_id, status=None, priority=None):
    try:
        conn = db.get_connection()
        c = conn.cursor()
        if status:
            c.execute("UPDATE projects SET status=? WHERE id=?", (status, project_id))
            if c.rowcount == 0:
                print(f"Error: Project '{project_id}' not found.")
            else:
                print(f"Project '{project_id}' status updated to '{status}'.")
        if priority is not None:
            c.execute("UPDATE projects SET priority=? WHERE id=?", (priority, project_id))
            if c.rowcount == 0:
                print(f"Error: Project '{project_id}' not found.")
            else:
                print(f"Project '{project_id}' priority updated to {priority}.")
        conn.commit()
    except sqlite3.Error as e:
        print(f"Database error: {e}")
    finally:
        if conn:
            conn.close()

def list_projects():
    conn = db.get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM projects ORDER BY priority DESC, created_at DESC")
    projects = c.fetchall()
    conn.close()
    return projects

def add_insight(project_id, title, content, source_url="", tags="", confidence=1.0, branch: Optional[str] = None):
    conn = db.get_connection()
    c = conn.cursor()
    now = datetime.now().isoformat()
    finding_id = f"fnd_{uuid.uuid4().hex[:8]}"
    evidence = json.dumps({"source_url": source_url})
    branch_id = resolve_branch_id(project_id, branch)
    c.execute(
        """INSERT INTO findings (id, project_id, title, content, evidence, confidence, tags, created_at, branch_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (finding_id, project_id, title, content, evidence, confidence, tags, now, branch_id),
    )
    conn.commit()
    conn.close()
    return finding_id

def add_artifact(
    project_id: str,
    path: str,
    type: str = "FILE",
    metadata: Optional[Dict[str, Any]] = None,
    branch: Optional[str] = None,
) -> str:
    artifact_id = f"art_{uuid.uuid4().hex[:10]}"
    now = datetime.now().isoformat()
    branch_id = resolve_branch_id(project_id, branch)
    conn = db.get_connection()
    c = conn.cursor()
    c.execute(
        """INSERT INTO artifacts (id, project_id, type, path, metadata, created_at, branch_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (artifact_id, project_id, type, path, json.dumps(metadata or {}), now, branch_id),
    )
    conn.commit()
    conn.close()
    log_event(
        project_id,
        "ARTIFACT",
        "add",
        {"artifact_id": artifact_id, "path": path, "type": type},
        source="vault",
        tags="artifact",
        branch=branch,
    )
    return artifact_id

def list_artifacts(project_id: str, branch: Optional[str] = None):
    branch_id = resolve_branch_id(project_id, branch)
    conn = db.get_connection()
    c = conn.cursor()
    c.execute(
        "SELECT id, type, path, metadata, created_at FROM artifacts WHERE project_id=? AND branch_id=? ORDER BY created_at DESC",
        (project_id, branch_id),
    )
    rows = c.fetchall()
    conn.close()
    return rows

def _normalize_query(query: str) -> str:
    return " ".join((query or "").strip().lower().split())

def _query_hash(query: str) -> str:
    return hashlib.sha256(_normalize_query(query).encode()).hexdigest()

def _extract_keywords(text: str, limit: int = 8) -> List[str]:
    stop = {
        "a",
        "an",
        "and",
        "are",
        "as",
        "at",
        "be",
        "but",
        "by",
        "for",
        "from",
        "has",
        "have",
        "if",
        "in",
        "into",
        "is",
        "it",
        "its",
        "of",
        "on",
        "or",
        "that",
        "the",
        "their",
        "then",
        "there",
        "these",
        "this",
        "to",
        "was",
        "were",
        "will",
        "with",
    }
    tokens = re.findall(r"[a-z0-9]{3,}", (text or "").lower())
    freq: Dict[str, int] = {}
    for t in tokens:
        if t in stop:
            continue
        freq[t] = freq.get(t, 0) + 1
    ranked = sorted(freq.items(), key=lambda kv: (-kv[1], kv[0]))
    return [t for (t, _) in ranked[: max(1, int(limit))]]

def plan_verification_missions(
    project_id: str,
    branch: Optional[str] = None,
    *,
    threshold: float = 0.7,
    max_missions: int = 20,
) -> List[Tuple[str, str, str]]:
    """
    Create SEARCH missions for low-confidence or explicitly unverified findings.
    Returns inserted missions as tuples: (mission_id, finding_id, query).
    """
    branch_id = resolve_branch_id(project_id, branch)
    conn = db.get_connection()
    c = conn.cursor()
    now = datetime.now().isoformat()

    c.execute(
        """SELECT id, title, content, evidence, tags, confidence
           FROM findings
           WHERE project_id=? AND branch_id=?
             AND (confidence < ? OR tags LIKE '%unverified%')
           ORDER BY confidence ASC, created_at DESC""",
        (project_id, branch_id, float(threshold)),
    )
    findings = c.fetchall()

    inserted: List[Tuple[str, str, str]] = []
    for finding_id, title, content, evidence, tags, confidence in findings:
        if len(inserted) >= int(max_missions):
            break

        source_url = ""
        try:
            ev = json.loads(evidence or "{}")
            source_url = ev.get("source_url", "") or ""
        except Exception:
            source_url = ""

        keywords = _extract_keywords(f"{title}\n{content}", limit=6)
        base = (title or "").strip()
        kw = " ".join(keywords[:4]).strip()

        queries: List[str] = []
        if base:
            queries.append(base)
        if base and kw and kw not in base.lower():
            queries.append(f"{base} {kw}")
        if source_url:
            try:
                from urllib.parse import urlparse

                host = urlparse(source_url).hostname or ""
                if host:
                    queries.append(f"site:{host} {base or kw}".strip())
            except Exception:
                pass
        if kw:
            queries.append(kw)
        if base:
            queries.append(f"{base} evidence")

        # Dedup queries while preserving order.
        seen_q: set[str] = set()
        uniq_queries: List[str] = []
        for q in queries:
            nq = _normalize_query(q)
            if not nq or nq in seen_q:
                continue
            seen_q.add(nq)
            uniq_queries.append(q.strip())

        for q in uniq_queries:
            if len(inserted) >= int(max_missions):
                break

            qhash = _query_hash(q)
            dedup_hash = hashlib.sha256(f"{project_id}|{branch_id}|{finding_id}|{qhash}".encode()).hexdigest()
            mission_id = f"mis_{uuid.uuid4().hex[:10]}"
            priority = int(max(0, min(100, round((1.0 - float(confidence or 0.0)) * 100))))
            question = f"Corroborate: {base}" if base else "Corroborate finding"
            rationale = "Auto-generated for low-confidence finding"

            c.execute(
                """INSERT OR IGNORE INTO verification_missions
                   (id, project_id, branch_id, finding_id, mission_type, query, query_hash,
                    question, rationale, status, priority, result_meta, last_error,
                    created_at, updated_at, completed_at, dedup_hash)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    mission_id,
                    project_id,
                    branch_id,
                    finding_id,
                    "SEARCH",
                    q.strip(),
                    qhash,
                    question,
                    rationale,
                    "open",
                    priority,
                    "",
                    "",
                    now,
                    now,
                    None,
                    dedup_hash,
                ),
            )
            if c.rowcount == 1:
                inserted.append((mission_id, finding_id, q.strip()))

    conn.commit()
    conn.close()
    if inserted:
        log_event(
            project_id,
            "VERIFY",
            "plan",
            {"missions": len(inserted), "threshold": threshold},
            confidence=0.9,
            source="vault",
            tags="verify",
            branch=branch,
        )
    return inserted

def list_verification_missions(
    project_id: str,
    branch: Optional[str] = None,
    *,
    status: Optional[str] = None,
    limit: int = 50,
):
    branch_id = resolve_branch_id(project_id, branch)
    conn = db.get_connection()
    c = conn.cursor()
    params: List[Any] = [project_id, branch_id]
    query = (
        """SELECT m.id, m.status, m.priority, m.query, f.title, f.confidence,
                  m.created_at, m.completed_at, m.last_error
           FROM verification_missions m
           JOIN findings f ON f.id = m.finding_id
           WHERE m.project_id=? AND m.branch_id=?"""
    )
    if status:
        query += " AND m.status=?"
        params.append(status)
    query += " ORDER BY m.priority DESC, m.created_at ASC LIMIT ?"
    params.append(int(limit))
    c.execute(query, params)
    rows = c.fetchall()
    conn.close()
    return rows

def set_verification_mission_status(mission_id: str, status: str, note: str = "") -> None:
    conn = db.get_connection()
    c = conn.cursor()
    now = datetime.now().isoformat()
    completed_at = now if status in {"done", "cancelled"} else None
    c.execute(
        "UPDATE verification_missions SET status=?, last_error=?, updated_at=?, completed_at=COALESCE(completed_at, ?) WHERE id=?",
        (status, note or "", now, completed_at, mission_id),
    )
    conn.commit()
    conn.close()

def run_verification_missions(
    project_id: str,
    branch: Optional[str] = None,
    *,
    status: str = "open",
    limit: int = 5,
) -> List[Dict[str, Any]]:
    branch_id = resolve_branch_id(project_id, branch)
    conn = db.get_connection()
    c = conn.cursor()
    c.execute(
        """SELECT id, query
           FROM verification_missions
           WHERE project_id=? AND branch_id=? AND status=?
           ORDER BY priority DESC, created_at ASC
           LIMIT ?""",
        (project_id, branch_id, status, int(limit)),
    )
    rows = c.fetchall()
    now = datetime.now().isoformat()

    results: List[Dict[str, Any]] = []
    for mission_id, query in rows:
        c.execute(
            "UPDATE verification_missions SET status=?, updated_at=? WHERE id=?",
            ("in_progress", now, mission_id),
        )
        conn.commit()

        try:
            cached = check_search(query)
            if cached is None:
                cached = perform_brave_search(query)
                log_search(query, cached)

            meta = {"query_hash": _query_hash(query)}
            # Best-effort extraction for UI, structure varies.
            try:
                web = cached.get("web", {}) if isinstance(cached, dict) else {}
                results_list = web.get("results", []) if isinstance(web, dict) else []
                meta["result_count"] = len(results_list)
                if results_list:
                    top = results_list[0]
                    if isinstance(top, dict):
                        meta["top_url"] = top.get("url", "")
                        meta["top_title"] = top.get("title", "")
            except Exception:
                pass

            c.execute(
                """UPDATE verification_missions
                   SET status=?, result_meta=?, last_error=?, completed_at=?, updated_at=?
                   WHERE id=?""",
                ("done", json.dumps(meta, ensure_ascii=True), "", now, now, mission_id),
            )
            conn.commit()

            log_event(
                project_id,
                "VERIFY",
                "run",
                {"mission_id": mission_id, "query": query, "result_meta": meta},
                confidence=0.85,
                source="vault",
                tags="verify,search",
                branch=branch,
            )
            results.append({"id": mission_id, "status": "done", "query": query, "meta": meta})
        except MissingAPIKeyError as e:
            c.execute(
                "UPDATE verification_missions SET status=?, last_error=?, updated_at=? WHERE id=?",
                ("blocked", str(e), now, mission_id),
            )
            conn.commit()
            results.append({"id": mission_id, "status": "blocked", "query": query, "error": str(e)})
        except Exception as e:
            c.execute(
                "UPDATE verification_missions SET status=?, last_error=?, updated_at=? WHERE id=?",
                ("open", str(e), now, mission_id),
            )
            conn.commit()
            results.append({"id": mission_id, "status": "open", "query": query, "error": str(e)})

    conn.close()
    return results

def add_watch_target(
    project_id: str,
    target_type: str,
    target: str,
    *,
    interval_s: int = 3600,
    tags: str = "",
    branch: Optional[str] = None,
) -> str:
    if target_type not in {"url", "query"}:
        raise ValueError("target_type must be 'url' or 'query'")
    if not (target or "").strip():
        raise ValueError("target must be non-empty")

    branch_id = resolve_branch_id(project_id, branch)
    now = datetime.now().isoformat()
    norm_target = target.strip()
    if target_type == "query":
        norm_target = _normalize_query(norm_target)
    else:
        norm_target = norm_target.lower()

    dedup_hash = hashlib.sha256(f"{project_id}|{branch_id}|{target_type}|{norm_target}".encode()).hexdigest()
    target_id = f"wt_{uuid.uuid4().hex[:10]}"

    conn = db.get_connection()
    c = conn.cursor()
    c.execute(
        """INSERT OR IGNORE INTO watch_targets
           (id, project_id, branch_id, target_type, target, tags, interval_s, status,
            last_run_at, last_result_hash, last_error, created_at, updated_at, dedup_hash)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            target_id,
            project_id,
            branch_id,
            target_type,
            target.strip(),
            tags or "",
            int(interval_s),
            "active",
            None,
            "",
            "",
            now,
            now,
            dedup_hash,
        ),
    )
    if c.rowcount != 1:
        c.execute("SELECT id FROM watch_targets WHERE dedup_hash=?", (dedup_hash,))
        row = c.fetchone()
        if row:
            target_id = row[0]
    conn.commit()
    conn.close()
    log_event(
        project_id,
        "WATCH",
        "add",
        {"target_id": target_id, "type": target_type, "target": target.strip(), "interval_s": interval_s},
        confidence=0.9,
        source="vault",
        tags="watch",
        branch=branch,
    )
    return target_id

def list_watch_targets(
    project_id: str,
    branch: Optional[str] = None,
    *,
    status: Optional[str] = "active",
):
    branch_id = resolve_branch_id(project_id, branch)
    conn = db.get_connection()
    c = conn.cursor()
    params: List[Any] = [project_id, branch_id]
    query = (
        "SELECT id, target_type, target, tags, interval_s, status, last_run_at, last_error, created_at "
        "FROM watch_targets WHERE project_id=? AND branch_id=?"
    )
    if status:
        query += " AND status=?"
        params.append(status)
    query += " ORDER BY created_at DESC"
    c.execute(query, params)
    rows = c.fetchall()
    conn.close()
    return rows

def disable_watch_target(target_id: str) -> None:
    now = datetime.now().isoformat()
    conn = db.get_connection()
    c = conn.cursor()
    c.execute("UPDATE watch_targets SET status=?, updated_at=? WHERE id=?", ("disabled", now, target_id))
    conn.commit()
    conn.close()

def update_watch_target_run(
    target_id: str,
    *,
    last_run_at: str,
    last_result_hash: str = "",
    last_error: str = "",
) -> None:
    now = datetime.now().isoformat()
    conn = db.get_connection()
    c = conn.cursor()
    c.execute(
        "UPDATE watch_targets SET last_run_at=?, last_result_hash=?, last_error=?, updated_at=? WHERE id=?",
        (last_run_at, last_result_hash or "", last_error or "", now, target_id),
    )
    conn.commit()
    conn.close()

def get_insights(project_id, tag_filter=None, branch: Optional[str] = None):
    conn = db.get_connection()
    c = conn.cursor()
    # Migration v2 uses 'findings' table.
    branch_id = resolve_branch_id(project_id, branch)
    if tag_filter:
        c.execute(
            "SELECT title, content, evidence, tags, created_at, confidence FROM findings WHERE project_id=? AND branch_id=? AND tags LIKE ? ORDER BY created_at DESC",
            (project_id, branch_id, f"%{tag_filter}%"),
        )
    else:
        c.execute(
            "SELECT title, content, evidence, tags, created_at, confidence FROM findings WHERE project_id=? AND branch_id=? ORDER BY created_at DESC",
            (project_id, branch_id),
        )
    rows = c.fetchall()
    conn.close()
    return rows

def get_ingest_service():
    """Returns a pre-configured IngestService with all connectors registered."""
    from scripts.scuttle import RedditScuttler, MoltbookScuttler, GrokipediaConnector, YouTubeConnector, WebScuttler
    service = IngestService()
    service.register_connector(RedditScuttler())
    service.register_connector(MoltbookScuttler())
    service.register_connector(GrokipediaConnector())
    service.register_connector(YouTubeConnector())
    service.register_connector(WebScuttler())
    return service
