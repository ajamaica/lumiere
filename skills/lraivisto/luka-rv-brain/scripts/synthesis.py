import hashlib
import json
import math
import os
import re
import sqlite3
from array import array
from datetime import datetime
from typing import Any, Dict, Iterable, List, Optional, Tuple

import scripts.core as core
import scripts.db as db

SYNTHESIS_LINK_TYPE = "SYNTHESIS_SIMILARITY"
DEFAULT_MODEL = "hashing_v1"
DEFAULT_DIMS = 256

# Small stopword set to reduce junk collisions; keep fast and local.
_STOPWORDS = {
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


def _tokenize(text: str) -> List[str]:
    tokens = re.findall(r"[a-z0-9]{2,}", (text or "").lower())
    return [t for t in tokens if t not in _STOPWORDS]


def _content_hash(text: str) -> str:
    return hashlib.sha256((text or "").encode("utf-8", errors="ignore")).hexdigest()


def embed_text(text: str, dims: int = DEFAULT_DIMS) -> array:
    """Deterministic local embedding via signed feature hashing."""
    vec = array("f", [0.0]) * int(dims)
    for tok in _tokenize(text):
        h = hashlib.blake2b(tok.encode("utf-8"), digest_size=8).digest()
        hv = int.from_bytes(h, "big", signed=False)
        idx = hv % dims
        sign = 1.0 if ((hv >> 63) & 1) else -1.0
        vec[idx] += sign

    norm = math.sqrt(sum(v * v for v in vec))
    if norm > 0:
        for i in range(dims):
            vec[i] = vec[i] / norm
    return vec


def _blob_to_vec(blob: Any, dims: int) -> array:
    b = bytes(blob) if isinstance(blob, (bytes, bytearray, memoryview)) else blob
    vec = array("f")
    vec.frombytes(b)
    if len(vec) != dims:
        raise ValueError(f"Embedding dims mismatch: expected {dims}, got {len(vec)}")
    return vec


def _read_text_file(path: str, limit_chars: int = 20_000) -> str:
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            return f.read(limit_chars)
    except OSError:
        return ""


def _upsert_embedding(
    cursor: sqlite3.Cursor,
    entity_type: str,
    entity_id: str,
    model: str,
    dims: int,
    vector: array,
    content_hash: str,
    updated_at: str,
) -> None:
    cursor.execute(
        """
        INSERT INTO embeddings (entity_type, entity_id, model, dims, vector, content_hash, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(entity_type, entity_id, model) DO UPDATE SET
            dims=excluded.dims,
            vector=excluded.vector,
            content_hash=excluded.content_hash,
            updated_at=excluded.updated_at
        """,
        (
            entity_type,
            entity_id,
            model,
            int(dims),
            sqlite3.Binary(vector.tobytes()),
            content_hash,
            updated_at,
        ),
    )


def _get_existing_embedding(
    cursor: sqlite3.Cursor, entity_type: str, entity_id: str, model: str
) -> Optional[Tuple[str, int, array]]:
    cursor.execute(
        "SELECT content_hash, dims, vector FROM embeddings WHERE entity_type=? AND entity_id=? AND model=?",
        (entity_type, entity_id, model),
    )
    row = cursor.fetchone()
    if not row:
        return None
    chash, dims, blob = row
    return (chash, int(dims), _blob_to_vec(blob, int(dims)))


def _top_feature_indices(vec: array, n: int) -> List[int]:
    dims = len(vec)
    n = max(1, min(int(n), dims))
    return sorted(range(dims), key=lambda i: abs(vec[i]), reverse=True)[:n]


def _dot(a: array, b: array) -> float:
    return float(sum(a[i] * b[i] for i in range(len(a))))


def synthesize(
    project_id: str,
    branch: Optional[str] = None,
    *,
    threshold: float = 0.78,
    top_k: int = 5,
    max_links: int = 50,
    model: str = DEFAULT_MODEL,
    dims: int = DEFAULT_DIMS,
    persist: bool = True,
) -> List[Dict[str, Any]]:
    """
    Build/refresh local embeddings and write similarity links between related findings/artifacts.
    Returns a list of selected links (even if persist=False).
    """
    branch_id = core.resolve_branch_id(project_id, branch)
    conn = db.get_connection()
    c = conn.cursor()
    now = datetime.now().isoformat()

    # Gather entities.
    c.execute(
        "SELECT id, title, content, tags FROM findings WHERE project_id=? AND branch_id=?",
        (project_id, branch_id),
    )
    finding_rows = c.fetchall()

    c.execute(
        "SELECT id, type, path, metadata FROM artifacts WHERE project_id=? AND branch_id=?",
        (project_id, branch_id),
    )
    artifact_rows = c.fetchall()

    entities: List[Tuple[str, str, str]] = []  # (entity_type, entity_id, text)
    labels: Dict[str, Dict[str, str]] = {}

    for fid, title, content, tags in finding_rows:
        text = f"{title}\n\n{content}\n\n{tags or ''}"
        entities.append(("finding", fid, text))
        labels[fid] = {"type": "finding", "label": title or fid}

    for aid, atype, path, metadata in artifact_rows:
        meta_text = ""
        try:
            meta_text = json.dumps(json.loads(metadata or "{}"), ensure_ascii=True)
        except Exception:
            meta_text = str(metadata or "")
        file_text = _read_text_file(path) if path else ""
        if file_text:
            text = f"{meta_text}\n\n{file_text}".strip()
        else:
            text = (meta_text or os.path.basename(path or "")).strip()
        entities.append(("artifact", aid, text))
        labels[aid] = {"type": "artifact", "label": os.path.basename(path or "") or aid}

    if len(entities) < 2:
        conn.close()
        return []

    # Embeddings: load or compute/update.
    vectors: Dict[str, array] = {}
    for entity_type, entity_id, text in entities:
        chash = _content_hash(text)
        existing = _get_existing_embedding(c, entity_type, entity_id, model)
        if existing and existing[0] == chash and existing[1] == dims:
            vectors[entity_id] = existing[2]
            continue

        vec = embed_text(text, dims=dims)
        _upsert_embedding(c, entity_type, entity_id, model, dims, vec, chash, now)
        vectors[entity_id] = vec

    conn.commit()

    entity_ids = sorted(vectors.keys())

    # Candidate generation:
    # 1) Exact all-pairs for small N (best recall, still fast locally).
    # 2) Bucketed candidates for larger N (cuts N^2).
    pairs: set[Tuple[str, str]] = set()
    if len(entity_ids) <= 200:
        for i in range(len(entity_ids)):
            for j in range(i + 1, len(entity_ids)):
                pairs.add((entity_ids[i], entity_ids[j]))
    else:
        buckets: Dict[int, List[str]] = {}
        for entity_id, vec in vectors.items():
            for idx in _top_feature_indices(vec, n=24):
                buckets.setdefault(idx, []).append(entity_id)

        for ids in buckets.values():
            if len(ids) < 2 or len(ids) > 60:
                continue
            ids_sorted = sorted(set(ids))
            for i in range(len(ids_sorted)):
                for j in range(i + 1, len(ids_sorted)):
                    pairs.add((ids_sorted[i], ids_sorted[j]))

    scored: List[Tuple[float, str, str]] = []
    for a, b in pairs:
        score = _dot(vectors[a], vectors[b])
        if score >= float(threshold):
            scored.append((score, a, b))

    scored.sort(reverse=True, key=lambda t: t[0])

    # Select links with degree caps for more "disparate" coverage.
    degree: Dict[str, int] = {eid: 0 for eid in vectors.keys()}
    selected: List[Dict[str, Any]] = []
    for score, a, b in scored:
        if degree[a] >= int(top_k) or degree[b] >= int(top_k):
            continue
        degree[a] += 1
        degree[b] += 1
        selected.append(
            {
                "score": float(score),
                "source_id": min(a, b),
                "target_id": max(a, b),
                "source_type": labels.get(a, {}).get("type", "unknown"),
                "target_type": labels.get(b, {}).get("type", "unknown"),
                "source_label": labels.get(a, {}).get("label", a),
                "target_label": labels.get(b, {}).get("label", b),
            }
        )
        if len(selected) >= int(max_links):
            break

    if persist and selected:
        for link in selected:
            metadata = {
                "score": link["score"],
                "model": model,
                "dims": int(dims),
                "branch_id": branch_id,
            }
            c.execute(
                "INSERT OR REPLACE INTO links (source_id, target_id, link_type, metadata, created_at) VALUES (?, ?, ?, ?, ?)",
                (
                    link["source_id"],
                    link["target_id"],
                    SYNTHESIS_LINK_TYPE,
                    json.dumps(metadata, ensure_ascii=True),
                    now,
                ),
            )
        conn.commit()
        core.log_event(
            project_id,
            "SYNTHESIS",
            "synthesize",
            {"links": len(selected), "threshold": threshold, "top_k": top_k, "model": model},
            confidence=0.9,
            source="vault",
            tags="synthesis",
            branch=branch,
        )

    conn.close()
    return selected
