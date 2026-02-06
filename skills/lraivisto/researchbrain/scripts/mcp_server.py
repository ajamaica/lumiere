import os
from typing import Any, Dict, List, Optional

from mcp.server.fastmcp import FastMCP

import scripts.core as core
import scripts.db as db
from scripts.synthesis import synthesize as synthesize_links


mcp = FastMCP("ResearchVault")


@mcp.tool()
def vault_list_projects() -> List[Dict[str, Any]]:
    """List projects ordered by priority/recency."""
    projects = core.list_projects()
    out: List[Dict[str, Any]] = []
    for p in projects:
        # p: id, name, objective, status, created_at, priority
        out.append(
            {
                "id": p[0],
                "name": p[1],
                "objective": p[2],
                "status": p[3],
                "created_at": p[4],
                "priority": p[5],
            }
        )
    return out


@mcp.tool()
def vault_create_project(
    project_id: str,
    objective: str,
    name: Optional[str] = None,
    priority: int = 0,
) -> Dict[str, Any]:
    """Create (or ensure) a project."""
    core.start_project(project_id, name or project_id, objective, priority=priority, silent=True)
    return {"id": project_id, "name": name or project_id, "objective": objective, "priority": priority}


@mcp.tool()
def vault_list_branches(project_id: str) -> List[Dict[str, Any]]:
    rows = core.list_branches(project_id)
    return [
        {
            "id": bid,
            "name": name,
            "parent_id": parent_id,
            "hypothesis": hypothesis,
            "status": status,
            "created_at": created_at,
        }
        for (bid, name, parent_id, hypothesis, status, created_at) in rows
    ]


@mcp.tool()
def vault_create_branch(
    project_id: str,
    name: str,
    parent: Optional[str] = None,
    hypothesis: str = "",
) -> Dict[str, Any]:
    bid = core.create_branch(project_id, name, parent=parent, hypothesis=hypothesis)
    return {"id": bid, "project_id": project_id, "name": name, "parent": parent, "hypothesis": hypothesis}


@mcp.tool()
def vault_add_finding(
    project_id: str,
    title: str,
    content: str,
    source_url: str = "",
    tags: str = "",
    confidence: float = 1.0,
    branch: Optional[str] = None,
) -> Dict[str, Any]:
    fid = core.add_insight(
        project_id,
        title,
        content,
        source_url=source_url,
        tags=tags,
        confidence=confidence,
        branch=branch,
    )
    return {"finding_id": fid}


@mcp.tool()
def vault_list_findings(
    project_id: str,
    branch: Optional[str] = None,
    tag_filter: Optional[str] = None,
    limit: int = 100,
) -> List[Dict[str, Any]]:
    branch_id = core.resolve_branch_id(project_id, branch)
    conn = db.get_connection()
    c = conn.cursor()
    params: List[Any] = [project_id, branch_id]
    query = (
        "SELECT id, title, content, evidence, tags, created_at, confidence FROM findings WHERE project_id=? AND branch_id=?"
    )
    if tag_filter:
        query += " AND tags LIKE ?"
        params.append(f"%{tag_filter}%")
    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(int(limit))
    c.execute(query, params)
    rows = c.fetchall()
    conn.close()

    out: List[Dict[str, Any]] = []
    for fid, title, content, evidence, tags, created_at, confidence in rows:
        out.append(
            {
                "id": fid,
                "title": title,
                "content": content,
                "evidence": evidence,
                "tags": tags,
                "created_at": created_at,
                "confidence": confidence,
            }
        )
    return out


@mcp.tool()
def vault_add_artifact(
    project_id: str,
    path: str,
    type: str = "FILE",
    metadata: Optional[Dict[str, Any]] = None,
    branch: Optional[str] = None,
) -> Dict[str, Any]:
    artifact_id = core.add_artifact(project_id, path, type=type, metadata=metadata or {}, branch=branch)
    return {"artifact_id": artifact_id}


@mcp.tool()
def vault_synthesize(
    project_id: str,
    branch: Optional[str] = None,
    threshold: float = 0.78,
    top_k: int = 5,
    max_links: int = 50,
    dry_run: bool = False,
) -> List[Dict[str, Any]]:
    return synthesize_links(
        project_id,
        branch=branch,
        threshold=threshold,
        top_k=top_k,
        max_links=max_links,
        persist=not dry_run,
    )


@mcp.tool()
def vault_verify_plan(
    project_id: str,
    branch: Optional[str] = None,
    threshold: float = 0.7,
    max_missions: int = 20,
) -> List[Dict[str, Any]]:
    missions = core.plan_verification_missions(
        project_id, branch=branch, threshold=threshold, max_missions=max_missions
    )
    return [{"mission_id": mid, "finding_id": fid, "query": q} for (mid, fid, q) in missions]


@mcp.tool()
def vault_verify_list(
    project_id: str,
    branch: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    rows = core.list_verification_missions(project_id, branch=branch, status=status, limit=limit)
    return [
        {
            "id": mid,
            "status": status,
            "priority": pri,
            "query": query,
            "finding_title": title,
            "finding_confidence": conf,
            "created_at": created_at,
            "completed_at": completed_at,
            "last_error": last_error,
        }
        for (mid, status, pri, query, title, conf, created_at, completed_at, last_error) in rows
    ]


@mcp.tool()
def vault_verify_run(
    project_id: str,
    branch: Optional[str] = None,
    status: str = "open",
    limit: int = 5,
) -> List[Dict[str, Any]]:
    return core.run_verification_missions(project_id, branch=branch, status=status, limit=limit)


def main() -> None:
    # IMPORTANT: keep stdout clean (MCP uses stdio). Any logging should go to stderr.
    db.init_db()
    mcp.run(transport=os.environ.get("RESEARCHVAULT_MCP_TRANSPORT", "stdio"))


if __name__ == "__main__":
    main()

