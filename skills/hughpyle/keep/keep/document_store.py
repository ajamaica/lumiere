"""
Document store using SQLite.

Stores canonical document records separate from embeddings.
This enables multiple embedding providers to index the same documents.

The document store is the source of truth for:
- Document identity (URI / custom ID)
- Summary text
- Tags (source + system)
- Timestamps

Embeddings are stored in ChromaDB collections, keyed by embedding provider.
"""

import json
import sqlite3
import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional


# Schema version for migrations
SCHEMA_VERSION = 1


@dataclass
class VersionInfo:
    """
    Information about a document version.

    Used for version navigation and history display.
    """
    version: int  # 1=oldest archived, increasing
    summary: str
    tags: dict[str, str]
    created_at: str
    content_hash: Optional[str] = None


@dataclass
class DocumentRecord:
    """
    A canonical document record.

    This is the source of truth, independent of any embedding index.
    """
    id: str
    collection: str
    summary: str
    tags: dict[str, str]
    created_at: str
    updated_at: str
    content_hash: Optional[str] = None


class DocumentStore:
    """
    SQLite-backed store for canonical document records.
    
    Separates document metadata from embedding storage, enabling:
    - Multiple embedding providers per document
    - Efficient tag/metadata queries without ChromaDB
    - Clear separation of concerns
    """
    
    def __init__(self, store_path: Path):
        """
        Args:
            store_path: Path to SQLite database file
        """
        self._db_path = store_path
        self._conn: Optional[sqlite3.Connection] = None
        self._lock = threading.Lock()
        self._init_db()
    
    def _init_db(self) -> None:
        """Initialize the SQLite database."""
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(str(self._db_path), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row

        # Enable WAL mode for better concurrent access across processes
        self._conn.execute("PRAGMA journal_mode=WAL")
        # Wait up to 5 seconds for locks instead of failing immediately
        self._conn.execute("PRAGMA busy_timeout=5000")

        self._conn.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT NOT NULL,
                collection TEXT NOT NULL,
                summary TEXT NOT NULL,
                tags_json TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                content_hash TEXT,
                PRIMARY KEY (id, collection)
            )
        """)

        # Migration: add content_hash column if missing (for existing databases)
        cursor = self._conn.execute("PRAGMA table_info(documents)")
        columns = {row[1] for row in cursor.fetchall()}
        if "content_hash" not in columns:
            self._conn.execute("ALTER TABLE documents ADD COLUMN content_hash TEXT")

        # Index for collection queries
        self._conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_documents_collection
            ON documents(collection)
        """)

        # Index for timestamp queries
        self._conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_documents_updated
            ON documents(updated_at)
        """)

        self._conn.commit()

        # Run schema migrations
        self._migrate_schema()

    def _migrate_schema(self) -> None:
        """
        Run schema migrations using PRAGMA user_version.

        Migrations:
        - Version 0 → 1: Create document_versions table
        """
        cursor = self._conn.execute("PRAGMA user_version")
        current_version = cursor.fetchone()[0]

        if current_version < 1:
            # Create versions table for document history
            self._conn.execute("""
                CREATE TABLE IF NOT EXISTS document_versions (
                    id TEXT NOT NULL,
                    collection TEXT NOT NULL,
                    version INTEGER NOT NULL,
                    summary TEXT NOT NULL,
                    tags_json TEXT NOT NULL,
                    content_hash TEXT,
                    created_at TEXT NOT NULL,
                    PRIMARY KEY (id, collection, version)
                )
            """)

            # Index for efficient version lookups
            self._conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_versions_doc
                ON document_versions(id, collection, version DESC)
            """)

            self._conn.execute(f"PRAGMA user_version = {SCHEMA_VERSION}")
            self._conn.commit()
    
    def _now(self) -> str:
        """Current timestamp in ISO format."""
        return datetime.now(timezone.utc).isoformat()

    def _get_unlocked(self, collection: str, id: str) -> Optional[DocumentRecord]:
        """Get a document by ID without acquiring the lock (for use within locked contexts)."""
        cursor = self._conn.execute("""
            SELECT id, collection, summary, tags_json, created_at, updated_at, content_hash
            FROM documents
            WHERE id = ? AND collection = ?
        """, (id, collection))

        row = cursor.fetchone()
        if row is None:
            return None

        return DocumentRecord(
            id=row["id"],
            collection=row["collection"],
            summary=row["summary"],
            tags=json.loads(row["tags_json"]),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            content_hash=row["content_hash"],
        )
    
    # -------------------------------------------------------------------------
    # Write Operations
    # -------------------------------------------------------------------------
    
    def upsert(
        self,
        collection: str,
        id: str,
        summary: str,
        tags: dict[str, str],
        content_hash: Optional[str] = None,
    ) -> tuple[DocumentRecord, bool]:
        """
        Insert or update a document record.

        Preserves created_at on update. Updates updated_at always.
        Archives the current version to history before updating.

        Args:
            collection: Collection name
            id: Document identifier (URI or custom)
            summary: Document summary text
            tags: All tags (source + system)
            content_hash: SHA256 hash of content (for change detection)

        Returns:
            Tuple of (stored DocumentRecord, content_changed bool).
            content_changed is True if content hash differs from previous,
            False if only tags/summary changed or if new document.
        """
        now = self._now()
        tags_json = json.dumps(tags, ensure_ascii=False)

        with self._lock:
            # Check if exists to preserve created_at and archive
            existing = self._get_unlocked(collection, id)
            created_at = existing.created_at if existing else now
            content_changed = False

            if existing:
                # Archive current version before updating
                self._archive_current_unlocked(collection, id, existing)
                # Detect content change
                content_changed = (
                    content_hash is not None
                    and existing.content_hash != content_hash
                )

            self._conn.execute("""
                INSERT OR REPLACE INTO documents
                (id, collection, summary, tags_json, created_at, updated_at, content_hash)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (id, collection, summary, tags_json, created_at, now, content_hash))
            self._conn.commit()

        return DocumentRecord(
            id=id,
            collection=collection,
            summary=summary,
            tags=tags,
            created_at=created_at,
            updated_at=now,
            content_hash=content_hash,
        ), content_changed

    def _archive_current_unlocked(
        self,
        collection: str,
        id: str,
        current: DocumentRecord,
    ) -> int:
        """
        Archive the current version to the versions table.

        Must be called within a lock context.

        Args:
            collection: Collection name
            id: Document identifier
            current: Current document record to archive

        Returns:
            The version number assigned to the archived version
        """
        # Get the next version number
        cursor = self._conn.execute("""
            SELECT COALESCE(MAX(version), 0) + 1
            FROM document_versions
            WHERE id = ? AND collection = ?
        """, (id, collection))
        next_version = cursor.fetchone()[0]

        # Insert the current state as a version
        self._conn.execute("""
            INSERT INTO document_versions
            (id, collection, version, summary, tags_json, content_hash, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            id,
            collection,
            next_version,
            current.summary,
            json.dumps(current.tags, ensure_ascii=False),
            current.content_hash,
            current.updated_at,  # Use updated_at as the version's timestamp
        ))

        return next_version
    
    def update_summary(self, collection: str, id: str, summary: str) -> bool:
        """
        Update just the summary of an existing document.
        
        Used by lazy summarization to replace placeholder summaries.
        
        Args:
            collection: Collection name
            id: Document identifier
            summary: New summary text
            
        Returns:
            True if document was found and updated, False otherwise
        """
        now = self._now()

        with self._lock:
            cursor = self._conn.execute("""
                UPDATE documents
                SET summary = ?, updated_at = ?
                WHERE id = ? AND collection = ?
            """, (summary, now, id, collection))
            self._conn.commit()

        return cursor.rowcount > 0
    
    def update_tags(
        self,
        collection: str,
        id: str,
        tags: dict[str, str],
    ) -> bool:
        """
        Update tags of an existing document.

        Args:
            collection: Collection name
            id: Document identifier
            tags: New tags dict (replaces existing)

        Returns:
            True if document was found and updated, False otherwise
        """
        now = self._now()
        tags_json = json.dumps(tags, ensure_ascii=False)

        with self._lock:
            cursor = self._conn.execute("""
                UPDATE documents
                SET tags_json = ?, updated_at = ?
                WHERE id = ? AND collection = ?
            """, (tags_json, now, id, collection))
            self._conn.commit()

        return cursor.rowcount > 0
    
    def delete(self, collection: str, id: str, delete_versions: bool = True) -> bool:
        """
        Delete a document record and optionally its version history.

        Args:
            collection: Collection name
            id: Document identifier
            delete_versions: If True, also delete version history

        Returns:
            True if document existed and was deleted
        """
        with self._lock:
            cursor = self._conn.execute("""
                DELETE FROM documents
                WHERE id = ? AND collection = ?
            """, (id, collection))

            if delete_versions:
                self._conn.execute("""
                    DELETE FROM document_versions
                    WHERE id = ? AND collection = ?
                """, (id, collection))

            self._conn.commit()

        return cursor.rowcount > 0
    
    # -------------------------------------------------------------------------
    # Read Operations
    # -------------------------------------------------------------------------
    
    def get(self, collection: str, id: str) -> Optional[DocumentRecord]:
        """
        Get a document by ID.

        Args:
            collection: Collection name
            id: Document identifier

        Returns:
            DocumentRecord if found, None otherwise
        """
        cursor = self._conn.execute("""
            SELECT id, collection, summary, tags_json, created_at, updated_at, content_hash
            FROM documents
            WHERE id = ? AND collection = ?
        """, (id, collection))

        row = cursor.fetchone()
        if row is None:
            return None

        return DocumentRecord(
            id=row["id"],
            collection=row["collection"],
            summary=row["summary"],
            tags=json.loads(row["tags_json"]),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            content_hash=row["content_hash"],
        )

    def get_version(
        self,
        collection: str,
        id: str,
        offset: int = 0,
    ) -> Optional[VersionInfo]:
        """
        Get a specific version of a document by offset.

        Offset semantics:
        - 0 = current version (returns None, use get() instead)
        - 1 = previous version (most recent archived)
        - 2 = two versions ago
        - etc.

        Args:
            collection: Collection name
            id: Document identifier
            offset: Version offset (0=current, 1=previous, etc.)

        Returns:
            VersionInfo if found, None if offset 0 or version doesn't exist
        """
        if offset == 0:
            # Offset 0 means current - caller should use get()
            return None

        # Get max version to calculate the target
        cursor = self._conn.execute("""
            SELECT MAX(version) FROM document_versions
            WHERE id = ? AND collection = ?
        """, (id, collection))
        max_version = cursor.fetchone()[0]

        if max_version is None:
            return None  # No versions archived

        # offset=1 → max_version, offset=2 → max_version-1, etc.
        target_version = max_version - (offset - 1)

        if target_version < 1:
            return None  # Requested version doesn't exist

        cursor = self._conn.execute("""
            SELECT version, summary, tags_json, content_hash, created_at
            FROM document_versions
            WHERE id = ? AND collection = ? AND version = ?
        """, (id, collection, target_version))

        row = cursor.fetchone()
        if row is None:
            return None

        return VersionInfo(
            version=row["version"],
            summary=row["summary"],
            tags=json.loads(row["tags_json"]),
            created_at=row["created_at"],
            content_hash=row["content_hash"],
        )

    def list_versions(
        self,
        collection: str,
        id: str,
        limit: int = 10,
    ) -> list[VersionInfo]:
        """
        List version history for a document.

        Returns versions in reverse chronological order (newest first).

        Args:
            collection: Collection name
            id: Document identifier
            limit: Maximum versions to return

        Returns:
            List of VersionInfo, newest archived first
        """
        cursor = self._conn.execute("""
            SELECT version, summary, tags_json, content_hash, created_at
            FROM document_versions
            WHERE id = ? AND collection = ?
            ORDER BY version DESC
            LIMIT ?
        """, (id, collection, limit))

        versions = []
        for row in cursor:
            versions.append(VersionInfo(
                version=row["version"],
                summary=row["summary"],
                tags=json.loads(row["tags_json"]),
                created_at=row["created_at"],
                content_hash=row["content_hash"],
            ))

        return versions

    def get_version_nav(
        self,
        collection: str,
        id: str,
        current_version: Optional[int] = None,
        limit: int = 3,
    ) -> dict[str, list[VersionInfo]]:
        """
        Get version navigation info (prev/next) for display.

        Args:
            collection: Collection name
            id: Document identifier
            current_version: The version being viewed (None = current/live version)
            limit: Max previous versions to return when viewing current

        Returns:
            Dict with 'prev' and optionally 'next' lists of VersionInfo.
            When viewing current (None): {'prev': [up to limit versions]}
            When viewing old version N: {'prev': [N-1 if exists], 'next': [N+1 if exists]}
        """
        result: dict[str, list[VersionInfo]] = {"prev": []}

        if current_version is None:
            # Viewing current version: get up to `limit` previous versions
            versions = self.list_versions(collection, id, limit=limit)
            result["prev"] = versions
        else:
            # Viewing an old version: get prev (N-1) and next (N+1)
            # Previous version (older)
            if current_version > 1:
                cursor = self._conn.execute("""
                    SELECT version, summary, tags_json, content_hash, created_at
                    FROM document_versions
                    WHERE id = ? AND collection = ? AND version = ?
                """, (id, collection, current_version - 1))
                row = cursor.fetchone()
                if row:
                    result["prev"] = [VersionInfo(
                        version=row["version"],
                        summary=row["summary"],
                        tags=json.loads(row["tags_json"]),
                        created_at=row["created_at"],
                        content_hash=row["content_hash"],
                    )]

            # Next version (newer)
            cursor = self._conn.execute("""
                SELECT version, summary, tags_json, content_hash, created_at
                FROM document_versions
                WHERE id = ? AND collection = ? AND version = ?
            """, (id, collection, current_version + 1))
            row = cursor.fetchone()
            if row:
                result["next"] = [VersionInfo(
                    version=row["version"],
                    summary=row["summary"],
                    tags=json.loads(row["tags_json"]),
                    created_at=row["created_at"],
                    content_hash=row["content_hash"],
                )]
            else:
                # Check if there's a current version (meaning we're at newest archived)
                if self.exists(collection, id):
                    # Next is "current" - indicate this with empty next
                    # (caller knows to check current doc)
                    result["next"] = []

        return result

    def version_count(self, collection: str, id: str) -> int:
        """Count archived versions for a document."""
        cursor = self._conn.execute("""
            SELECT COUNT(*) FROM document_versions
            WHERE id = ? AND collection = ?
        """, (id, collection))
        return cursor.fetchone()[0]

    def get_many(
        self,
        collection: str,
        ids: list[str],
    ) -> dict[str, DocumentRecord]:
        """
        Get multiple documents by ID.

        Args:
            collection: Collection name
            ids: List of document identifiers

        Returns:
            Dict mapping id → DocumentRecord (missing IDs omitted)
        """
        if not ids:
            return {}

        placeholders = ",".join("?" * len(ids))
        cursor = self._conn.execute(f"""
            SELECT id, collection, summary, tags_json, created_at, updated_at, content_hash
            FROM documents
            WHERE collection = ? AND id IN ({placeholders})
        """, (collection, *ids))

        results = {}
        for row in cursor:
            results[row["id"]] = DocumentRecord(
                id=row["id"],
                collection=row["collection"],
                summary=row["summary"],
                tags=json.loads(row["tags_json"]),
                created_at=row["created_at"],
                updated_at=row["updated_at"],
                content_hash=row["content_hash"],
            )

        return results
    
    def exists(self, collection: str, id: str) -> bool:
        """Check if a document exists."""
        cursor = self._conn.execute("""
            SELECT 1 FROM documents
            WHERE id = ? AND collection = ?
        """, (id, collection))
        return cursor.fetchone() is not None
    
    def list_ids(
        self,
        collection: str,
        limit: Optional[int] = None,
    ) -> list[str]:
        """
        List document IDs in a collection.
        
        Args:
            collection: Collection name
            limit: Maximum number to return (None for all)
            
        Returns:
            List of document IDs
        """
        if limit:
            cursor = self._conn.execute("""
                SELECT id FROM documents
                WHERE collection = ?
                ORDER BY updated_at DESC
                LIMIT ?
            """, (collection, limit))
        else:
            cursor = self._conn.execute("""
                SELECT id FROM documents
                WHERE collection = ?
                ORDER BY updated_at DESC
            """, (collection,))
        
        return [row["id"] for row in cursor]

    def list_recent(
        self,
        collection: str,
        limit: int = 10,
    ) -> list[DocumentRecord]:
        """
        List recent documents ordered by update time.

        Args:
            collection: Collection name
            limit: Maximum number to return

        Returns:
            List of DocumentRecords, most recently updated first
        """
        cursor = self._conn.execute("""
            SELECT id, collection, summary, tags_json, created_at, updated_at, content_hash
            FROM documents
            WHERE collection = ?
            ORDER BY updated_at DESC
            LIMIT ?
        """, (collection, limit))

        return [
            DocumentRecord(
                id=row["id"],
                collection=row["collection"],
                summary=row["summary"],
                tags=json.loads(row["tags_json"]),
                created_at=row["created_at"],
                updated_at=row["updated_at"],
                content_hash=row["content_hash"],
            )
            for row in cursor
        ]

    def count(self, collection: str) -> int:
        """Count documents in a collection."""
        cursor = self._conn.execute("""
            SELECT COUNT(*) FROM documents
            WHERE collection = ?
        """, (collection,))
        return cursor.fetchone()[0]
    
    def count_all(self) -> int:
        """Count total documents across all collections."""
        cursor = self._conn.execute("SELECT COUNT(*) FROM documents")
        return cursor.fetchone()[0]

    def query_by_id_prefix(
        self,
        collection: str,
        prefix: str,
    ) -> list[DocumentRecord]:
        """
        Query documents by ID prefix.

        Args:
            collection: Collection name
            prefix: ID prefix to match (e.g., "_system:")

        Returns:
            List of matching DocumentRecords
        """
        cursor = self._conn.execute("""
            SELECT id, collection, summary, tags_json, created_at, updated_at, content_hash
            FROM documents
            WHERE collection = ? AND id LIKE ?
            ORDER BY id
        """, (collection, f"{prefix}%"))

        results = []
        for row in cursor:
            results.append(DocumentRecord(
                id=row["id"],
                collection=row["collection"],
                summary=row["summary"],
                tags=json.loads(row["tags_json"]),
                created_at=row["created_at"],
                updated_at=row["updated_at"],
                content_hash=row["content_hash"],
            ))

        return results

    # -------------------------------------------------------------------------
    # Tag Queries
    # -------------------------------------------------------------------------

    def list_distinct_tag_keys(self, collection: str) -> list[str]:
        """
        List all distinct tag keys used in the collection.

        Excludes system tags (prefixed with _).

        Returns:
            Sorted list of distinct tag keys
        """
        cursor = self._conn.execute("""
            SELECT tags_json FROM documents
            WHERE collection = ?
        """, (collection,))

        keys: set[str] = set()
        for row in cursor:
            tags = json.loads(row["tags_json"])
            for key in tags:
                if not key.startswith("_"):
                    keys.add(key)

        return sorted(keys)

    def list_distinct_tag_values(self, collection: str, key: str) -> list[str]:
        """
        List all distinct values for a given tag key.

        Args:
            collection: Collection name
            key: Tag key to get values for

        Returns:
            Sorted list of distinct values
        """
        cursor = self._conn.execute("""
            SELECT tags_json FROM documents
            WHERE collection = ?
        """, (collection,))

        values: set[str] = set()
        for row in cursor:
            tags = json.loads(row["tags_json"])
            if key in tags:
                values.add(tags[key])

        return sorted(values)

    def query_by_tag_key(
        self,
        collection: str,
        key: str,
        limit: int = 100,
        since_date: Optional[str] = None,
    ) -> list[DocumentRecord]:
        """
        Find documents that have a specific tag key (any value).

        Args:
            collection: Collection name
            key: Tag key to search for
            limit: Maximum results
            since_date: Only include items updated on or after this date (YYYY-MM-DD)

        Returns:
            List of matching DocumentRecords
        """
        # SQLite JSON functions for tag key existence
        # json_extract returns NULL if key doesn't exist
        params: list[Any] = [collection, f"$.{key}"]

        sql = """
            SELECT id, collection, summary, tags_json, created_at, updated_at, content_hash
            FROM documents
            WHERE collection = ?
              AND json_extract(tags_json, ?) IS NOT NULL
        """

        if since_date is not None:
            # Compare against the date portion of updated_at
            sql += "  AND updated_at >= ?\n"
            params.append(since_date)

        sql += "ORDER BY updated_at DESC\nLIMIT ?"
        params.append(limit)

        cursor = self._conn.execute(sql, params)

        results = []
        for row in cursor:
            results.append(DocumentRecord(
                id=row["id"],
                collection=row["collection"],
                summary=row["summary"],
                tags=json.loads(row["tags_json"]),
                created_at=row["created_at"],
                updated_at=row["updated_at"],
                content_hash=row["content_hash"],
            ))

        return results

    # -------------------------------------------------------------------------
    # Collection Management
    # -------------------------------------------------------------------------
    
    def list_collections(self) -> list[str]:
        """List all collection names."""
        cursor = self._conn.execute("""
            SELECT DISTINCT collection FROM documents
            ORDER BY collection
        """)
        return [row["collection"] for row in cursor]
    
    def delete_collection(self, collection: str) -> int:
        """
        Delete all documents in a collection.

        Args:
            collection: Collection name

        Returns:
            Number of documents deleted
        """
        with self._lock:
            cursor = self._conn.execute("""
                DELETE FROM documents
                WHERE collection = ?
            """, (collection,))
            self._conn.commit()
        return cursor.rowcount
    
    # -------------------------------------------------------------------------
    # Lifecycle
    # -------------------------------------------------------------------------
    
    def close(self) -> None:
        """Close the database connection."""
        if self._conn is not None:
            self._conn.close()
            self._conn = None
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
        return False
    
    def __del__(self):
        self.close()
