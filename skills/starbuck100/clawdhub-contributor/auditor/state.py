"""Audit state management backed by SQLite."""

from __future__ import annotations

import json
import logging
import sqlite3
import time
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger(__name__)

SCHEMA = """
CREATE TABLE IF NOT EXISTS audits (
    skill_slug TEXT NOT NULL,
    version    TEXT NOT NULL,
    audited_at REAL NOT NULL,
    result     TEXT NOT NULL,
    risk_score INTEGER NOT NULL,
    findings   TEXT NOT NULL,
    PRIMARY KEY (skill_slug, version)
);
CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"""


@dataclass
class AuditRecord:
    skill_slug: str
    version: str
    audited_at: float
    result: str
    risk_score: int
    findings_json: str


class AuditState:
    """Persistent audit state using SQLite."""

    def __init__(self, db_path: str | Path) -> None:
        self._db_path = Path(db_path)
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(str(self._db_path))
        self._conn.executescript(SCHEMA)
        self._conn.commit()
        logger.debug("Audit state DB at %s", self._db_path)

    def close(self) -> None:
        """Close the database connection."""
        self._conn.close()

    def is_audited(self, slug: str, version: str) -> bool:
        """Check if a specific skill version has been audited."""
        cur = self._conn.execute(
            "SELECT 1 FROM audits WHERE skill_slug=? AND version=?",
            (slug, version),
        )
        return cur.fetchone() is not None

    def record_audit(
        self,
        slug: str,
        version: str,
        result: str,
        risk_score: int,
        findings: list[dict],
    ) -> None:
        """Record an audit result."""
        self._conn.execute(
            "INSERT OR REPLACE INTO audits (skill_slug, version, audited_at, result, risk_score, findings) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (slug, version, time.time(), result, risk_score, json.dumps(findings)),
        )
        self._conn.commit()
        logger.debug("Recorded audit: %s@%s → %s", slug, version, result)

    def get_audit(self, slug: str, version: str) -> AuditRecord | None:
        """Retrieve an audit record."""
        cur = self._conn.execute(
            "SELECT skill_slug, version, audited_at, result, risk_score, findings "
            "FROM audits WHERE skill_slug=? AND version=?",
            (slug, version),
        )
        row = cur.fetchone()
        if row is None:
            return None
        return AuditRecord(*row)

    def get_all_audited_slugs(self) -> dict[str, str]:
        """Return {slug: latest_audited_version}."""
        cur = self._conn.execute(
            "SELECT skill_slug, version FROM audits ORDER BY audited_at DESC"
        )
        result: dict[str, str] = {}
        for slug, version in cur:
            if slug not in result:
                result[slug] = version
        return result

    def build_queue(self, available: list[dict[str, str]]) -> list[dict[str, str]]:
        """Given a list of {'slug': ..., 'version': ...}, return those not yet audited.

        Args:
            available: List of dicts with at least 'slug' and 'version' keys.

        Returns:
            Filtered list of skills that need auditing.
        """
        return [
            s for s in available
            if not self.is_audited(s["slug"], s.get("version", "unknown"))
        ]

    def set_meta(self, key: str, value: str) -> None:
        """Store a metadata key-value pair."""
        self._conn.execute(
            "INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)",
            (key, value),
        )
        self._conn.commit()

    def get_meta(self, key: str) -> str | None:
        """Retrieve a metadata value."""
        cur = self._conn.execute("SELECT value FROM meta WHERE key=?", (key,))
        row = cur.fetchone()
        return row[0] if row else None
