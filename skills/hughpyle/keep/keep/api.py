"""
Core API for reflective memory.

This is the minimal working implementation focused on:
- update(): fetch → embed → summarize → store
- remember(): embed → summarize → store  
- find(): embed query → search
- get(): retrieve by ID
"""

import hashlib
import importlib.resources
import logging
import re
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)


def _parse_since(since: str) -> str:
    """
    Parse a 'since' string and return a YYYY-MM-DD cutoff date.

    Accepts:
    - ISO 8601 duration: P3D (3 days), P1W (1 week), PT1H (1 hour), P1DT12H, etc.
    - ISO date: 2026-01-15
    - Date with slashes: 2026/01/15

    Returns:
        YYYY-MM-DD string for the cutoff date
    """
    since = since.strip()

    # ISO 8601 duration: P[n]Y[n]M[n]W[n]DT[n]H[n]M[n]S
    if since.upper().startswith("P"):
        duration_str = since.upper()

        # Parse duration components
        years = months = weeks = days = hours = minutes = seconds = 0

        # Split on T to separate date and time parts
        if "T" in duration_str:
            date_part, time_part = duration_str.split("T", 1)
        else:
            date_part = duration_str
            time_part = ""

        # Parse date part (P[n]Y[n]M[n]W[n]D)
        date_part = date_part[1:]  # Remove leading P
        for match in re.finditer(r"(\d+)([YMWD])", date_part):
            value, unit = int(match.group(1)), match.group(2)
            if unit == "Y":
                years = value
            elif unit == "M":
                months = value
            elif unit == "W":
                weeks = value
            elif unit == "D":
                days = value

        # Parse time part ([n]H[n]M[n]S)
        for match in re.finditer(r"(\d+)([HMS])", time_part):
            value, unit = int(match.group(1)), match.group(2)
            if unit == "H":
                hours = value
            elif unit == "M":
                minutes = value
            elif unit == "S":
                seconds = value

        # Convert to timedelta (approximate months/years)
        total_days = years * 365 + months * 30 + weeks * 7 + days
        delta = timedelta(days=total_days, hours=hours, minutes=minutes, seconds=seconds)
        cutoff = datetime.now(timezone.utc) - delta
        return cutoff.strftime("%Y-%m-%d")

    # Try parsing as date
    # ISO format: 2026-01-15 or 2026-01-15T...
    # Slash format: 2026/01/15
    date_str = since.replace("/", "-").split("T")[0]

    try:
        parsed = datetime.strptime(date_str, "%Y-%m-%d")
        return parsed.strftime("%Y-%m-%d")
    except ValueError:
        pass

    raise ValueError(
        f"Invalid 'since' format: {since}. "
        "Use ISO duration (P3D, PT1H, P1W) or date (2026-01-15)"
    )


def _filter_by_date(items: list, since: str) -> list:
    """Filter items to only those updated since the given date/duration."""
    cutoff = _parse_since(since)
    return [
        item for item in items
        if item.tags.get("_updated_date", "0000-00-00") >= cutoff
    ]


def _record_to_item(rec, score: float = None) -> "Item":
    """
    Convert a DocumentRecord to an Item with timestamp tags.

    Adds _updated, _created, _updated_date from the record's columns
    to ensure consistent timestamp exposure across all retrieval methods.
    """
    from .types import Item
    tags = {
        **rec.tags,
        "_updated": rec.updated_at,
        "_created": rec.created_at,
        "_updated_date": rec.updated_at[:10] if rec.updated_at else "",
    }
    return Item(id=rec.id, summary=rec.summary, tags=tags, score=score)


import os
import subprocess
import sys

from .config import load_or_create_config, save_config, StoreConfig, EmbeddingIdentity
from .paths import get_config_dir, get_default_store_path
from .pending_summaries import PendingSummaryQueue
from .providers import get_registry
from .providers.base import (
    DocumentProvider,
    EmbeddingProvider,
    SummarizationProvider,
)
from .providers.embedding_cache import CachingEmbeddingProvider
from .document_store import VersionInfo
from .store import ChromaStore
from .types import Item, filter_non_system_tags, SYSTEM_TAG_PREFIX


# Default max length for truncated placeholder summaries
TRUNCATE_LENGTH = 500

# Maximum attempts before giving up on a pending summary
MAX_SUMMARY_ATTEMPTS = 5


# Collection name validation: lowercase ASCII and underscores only
COLLECTION_NAME_PATTERN = re.compile(r"^[a-z][a-z0-9_]*$")

# Environment variable prefix for auto-applied tags
ENV_TAG_PREFIX = "KEEP_TAG_"

# Fixed ID for the current working context (singleton)
NOWDOC_ID = "_now:default"


def _get_system_doc_dir() -> Path:
    """
    Get path to system docs, works in both dev and installed environments.

    Tries in order:
    1. Package data via importlib.resources (installed packages)
    2. Relative path inside package (development)
    3. Legacy path outside package (backwards compatibility)
    """
    # Try package data first (works for installed packages)
    try:
        with importlib.resources.as_file(
            importlib.resources.files("keep.data.system")
        ) as path:
            if path.exists():
                return path
    except (ModuleNotFoundError, TypeError):
        pass

    # Fallback to relative path inside package (development)
    dev_path = Path(__file__).parent / "data" / "system"
    if dev_path.exists():
        return dev_path

    # Legacy fallback (old structure)
    return Path(__file__).parent.parent / "docs" / "system"


# Path to system documents
SYSTEM_DOC_DIR = _get_system_doc_dir()

# Stable IDs for system documents (path-independent)
SYSTEM_DOC_IDS = {
    "now.md": "_system:now",
    "conversations.md": "_system:conversations",
    "domains.md": "_system:domains",
}


def _load_frontmatter(path: Path) -> tuple[str, dict[str, str]]:
    """
    Load content and tags from a file with optional YAML frontmatter.

    Args:
        path: Path to the file

    Returns:
        (content, tags) tuple. Tags empty if no frontmatter.

    Raises:
        FileNotFoundError: If the file doesn't exist
    """
    text = path.read_text()

    # Parse YAML frontmatter if present
    if text.startswith("---"):
        parts = text.split("---", 2)
        if len(parts) >= 3:
            import yaml
            frontmatter = yaml.safe_load(parts[1])
            content = parts[2].lstrip("\n")
            if frontmatter:
                tags = frontmatter.get("tags", {})
                # Ensure all tag values are strings
                tags = {k: str(v) for k, v in tags.items()}
                return content, tags
            return content, {}

    return text, {}


def _get_env_tags() -> dict[str, str]:
    """
    Collect tags from KEEP_TAG_* environment variables.

    KEEP_TAG_PROJECT=foo -> {"project": "foo"}
    KEEP_TAG_MyTag=bar   -> {"mytag": "bar"}

    Tag keys are lowercased for consistency.
    """
    tags = {}
    for key, value in os.environ.items():
        if key.startswith(ENV_TAG_PREFIX) and value:
            tag_key = key[len(ENV_TAG_PREFIX):].lower()
            tags[tag_key] = value
    return tags


def _content_hash(content: str) -> str:
    """SHA256 hash of content for change detection."""
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def _text_content_id(content: str) -> str:
    """
    Generate a content-addressed ID for text updates.

    This makes text updates versioned by content:
    - `keep update "my note"` → ID = _text:{hash[:12]}
    - `keep update "my note" -t status=done` → same ID, new version
    - `keep update "different note"` → different ID

    Args:
        content: The text content

    Returns:
        Content-addressed ID in format _text:{hash[:12]}
    """
    content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()[:12]
    return f"_text:{content_hash}"


class Keeper:
    """
    Reflective memory keeper - persistent storage with similarity search.

    Example:
        kp = Keeper()
        kp.update("file:///path/to/readme.md")
        results = kp.find("installation instructions")
    """
    
    def __init__(
        self,
        store_path: Optional[str | Path] = None,
        collection: str = "default",
        decay_half_life_days: float = 30.0
    ) -> None:
        """
        Initialize or open an existing reflective memory store.

        Args:
            store_path: Path to store directory. Uses default if not specified.
                       Overrides any store.path setting in config.
            collection: Default collection name.
            decay_half_life_days: Memory decay half-life in days (ACT-R model).
                After this many days, an item's effective relevance is halved.
                Set to 0 or negative to disable decay.
        """
        # Validate collection name
        if not COLLECTION_NAME_PATTERN.match(collection):
            raise ValueError(
                f"Invalid collection name '{collection}'. "
                "Must be lowercase ASCII, starting with a letter."
            )
        self._default_collection = collection
        self._decay_half_life_days = decay_half_life_days

        # Resolve config and store paths
        # If store_path is explicitly provided, use it as both config and store location
        # Otherwise, discover config via tree-walk and let config determine store
        if store_path is not None:
            self._store_path = Path(store_path).resolve()
            config_dir = self._store_path
        else:
            # Discover config directory (tree-walk or envvar)
            config_dir = get_config_dir()

        # Load or create configuration
        self._config: StoreConfig = load_or_create_config(config_dir)

        # If store_path wasn't explicit, resolve from config
        if store_path is None:
            self._store_path = get_default_store_path(self._config)

        # Initialize document provider (needed for most operations)
        registry = get_registry()
        self._document_provider: DocumentProvider = registry.create_document(
            self._config.document.name,
            self._config.document.params,
        )

        # Lazy-loaded providers (created on first use to avoid network access for read-only ops)
        self._embedding_provider: Optional[EmbeddingProvider] = None
        self._summarization_provider: Optional[SummarizationProvider] = None

        # Initialize pending summary queue
        queue_path = self._store_path / "pending_summaries.db"
        self._pending_queue = PendingSummaryQueue(queue_path)

        # Initialize document store (canonical records)
        from .document_store import DocumentStore
        doc_store_path = self._store_path / "documents.db"
        self._document_store = DocumentStore(doc_store_path)

        # Initialize ChromaDB store (embedding index)
        # Use dimension from stored identity if available (allows offline read-only access)
        embedding_dim = None
        if self._config.embedding_identity:
            embedding_dim = self._config.embedding_identity.dimension
        self._store = ChromaStore(
            self._store_path,
            embedding_dimension=embedding_dim,
        )

        # Migrate and ensure system documents (idempotent)
        self._migrate_system_documents()

    def _migrate_system_documents(self) -> dict:
        """
        Migrate system documents to stable IDs and current version.

        Handles:
        - Migration from old file:// URIs to _system:{name} IDs
        - Fresh creation for new stores
        - Version upgrades when bundled content changes
        - Cleanup of old file:// URIs (from before path was changed)

        Called during init. Only loads docs that don't already exist,
        so user modifications are preserved. Updates config version
        after successful migration.

        Returns:
            Dict with migration stats: created, migrated, skipped, cleaned
        """
        from .config import SYSTEM_DOCS_VERSION, save_config

        stats = {"created": 0, "migrated": 0, "skipped": 0, "cleaned": 0}

        # Skip if already at current version
        if self._config.system_docs_version >= SYSTEM_DOCS_VERSION:
            return stats

        # Build reverse lookup: filename -> new stable ID
        filename_to_id = {name: doc_id for name, doc_id in SYSTEM_DOC_IDS.items()}

        # First pass: clean up old file:// URIs with category=system tag
        # These may have different paths than current SYSTEM_DOC_DIR
        try:
            old_system_docs = self.query_tag("category", "system")
            for doc in old_system_docs:
                if doc.id.startswith("file://") and doc.id.endswith(".md"):
                    # Extract filename from path
                    filename = Path(doc.id.replace("file://", "")).name
                    new_id = filename_to_id.get(filename)
                    if new_id and not self.exists(new_id):
                        # Migrate content to new ID
                        self.remember(doc.summary, id=new_id, tags=doc.tags)
                        self.delete(doc.id)
                        stats["migrated"] += 1
                        logger.info("Migrated system doc: %s -> %s", doc.id, new_id)
                    elif new_id:
                        # New ID already exists, just clean up old one
                        self.delete(doc.id)
                        stats["cleaned"] += 1
                        logger.info("Cleaned up old system doc: %s", doc.id)
        except Exception as e:
            logger.debug("Error scanning old system docs: %s", e)

        # Second pass: create any missing system docs from bundled content
        for path in SYSTEM_DOC_DIR.glob("*.md"):
            new_id = SYSTEM_DOC_IDS.get(path.name)
            if new_id is None:
                logger.debug("Skipping unknown system doc: %s", path.name)
                continue

            # Skip if already exists
            if self.exists(new_id):
                stats["skipped"] += 1
                continue

            try:
                content, tags = _load_frontmatter(path)
                tags["category"] = "system"
                self.remember(content, id=new_id, tags=tags)
                stats["created"] += 1
                logger.info("Created system doc: %s", new_id)
            except FileNotFoundError:
                # System file missing - skip silently
                pass

        # Update config version
        self._config.system_docs_version = SYSTEM_DOCS_VERSION
        save_config(self._config)

        return stats

    def _get_embedding_provider(self) -> EmbeddingProvider:
        """
        Get embedding provider, creating it lazily on first use.

        This allows read-only operations to work offline without loading
        the embedding model (which may try to reach HuggingFace).
        """
        if self._embedding_provider is None:
            registry = get_registry()
            base_provider = registry.create_embedding(
                self._config.embedding.name,
                self._config.embedding.params,
            )
            cache_path = self._store_path / "embedding_cache.db"
            self._embedding_provider = CachingEmbeddingProvider(
                base_provider,
                cache_path=cache_path,
            )
            # Validate or record embedding identity
            self._validate_embedding_identity(self._embedding_provider)
            # Update store's embedding dimension if it wasn't known at init
            if self._store._embedding_dimension is None:
                self._store._embedding_dimension = self._embedding_provider.dimension
        return self._embedding_provider

    def _get_summarization_provider(self) -> SummarizationProvider:
        """
        Get summarization provider, creating it lazily on first use.
        """
        if self._summarization_provider is None:
            registry = get_registry()
            self._summarization_provider = registry.create_summarization(
                self._config.summarization.name,
                self._config.summarization.params,
            )
        return self._summarization_provider

    def _validate_embedding_identity(self, provider: EmbeddingProvider) -> None:
        """
        Validate embedding provider matches stored identity, or record it.

        On first use, records the embedding identity to config.
        On subsequent uses, validates that the current provider matches.

        Raises:
            ValueError: If embedding provider changed incompatibly
        """
        # Get current provider's identity
        current = EmbeddingIdentity(
            provider=self._config.embedding.name,
            model=getattr(provider, "model_name", "unknown"),
            dimension=provider.dimension,
        )

        stored = self._config.embedding_identity

        if stored is None:
            # First use: record the identity
            self._config.embedding_identity = current
            save_config(self._config)
        else:
            # Validate compatibility
            if (stored.provider != current.provider or
                stored.model != current.model or
                stored.dimension != current.dimension):
                raise ValueError(
                    f"Embedding provider mismatch!\n"
                    f"  Stored: {stored.provider}/{stored.model} ({stored.dimension}d)\n"
                    f"  Current: {current.provider}/{current.model} ({current.dimension}d)\n"
                    f"\n"
                    f"Changing embedding providers invalidates existing embeddings.\n"
                    f"Options:\n"
                    f"  1. Use the original provider\n"
                    f"  2. Delete .keep/ and re-index\n"
                    f"  3. (Future) Run migration to re-embed with new provider"
                )

    @property
    def embedding_identity(self) -> EmbeddingIdentity | None:
        """Current embedding identity (provider, model, dimension)."""
        return self._config.embedding_identity
    
    def _resolve_collection(self, collection: Optional[str]) -> str:
        """Resolve collection name, validating if provided."""
        if collection is None:
            return self._default_collection
        if not COLLECTION_NAME_PATTERN.match(collection):
            raise ValueError(f"Invalid collection name: {collection}")
        return collection
    
    # -------------------------------------------------------------------------
    # Write Operations
    # -------------------------------------------------------------------------
    
    def update(
        self,
        id: str,
        tags: Optional[dict[str, str]] = None,
        *,
        summary: Optional[str] = None,
        source_tags: Optional[dict[str, str]] = None,  # Deprecated alias
        collection: Optional[str] = None,
        lazy: bool = False
    ) -> Item:
        """
        Insert or update a document in the store.

        Fetches the document, generates embeddings and summary, then stores it.

        **Update behavior:**
        - Summary: Replaced with user-provided or newly generated summary
        - Tags: Merged - existing tags are preserved, new tags override
          on key collision. System tags (prefixed with _) are always managed by
          the system.

        Args:
            id: URI of document to fetch and index
            tags: User-provided tags to merge with existing tags
            summary: User-provided summary (skips auto-summarization if given)
            source_tags: Deprecated alias for 'tags'
            collection: Target collection (uses default if None)
            lazy: If True, use truncated placeholder summary and queue for
                  background processing. Use `process_pending()` to generate
                  real summaries later. Ignored if summary is provided.

        Returns:
            The stored Item with merged tags and new summary
        """
        # Handle deprecated source_tags parameter
        if source_tags is not None:
            import warnings
            warnings.warn(
                "source_tags is deprecated, use 'tags' instead",
                DeprecationWarning,
                stacklevel=2
            )
            if tags is None:
                tags = source_tags

        coll = self._resolve_collection(collection)

        # Get existing item to preserve tags (check document store first, fall back to ChromaDB)
        existing_tags = {}
        existing_doc = self._document_store.get(coll, id)
        if existing_doc:
            existing_tags = filter_non_system_tags(existing_doc.tags)
        else:
            # Fall back to ChromaDB for legacy data
            existing = self._store.get(coll, id)
            if existing:
                existing_tags = filter_non_system_tags(existing.tags)

        # Fetch document
        doc = self._document_provider.fetch(id)

        # Compute content hash for change detection
        new_hash = _content_hash(doc.content)

        # Generate embedding
        embedding = self._get_embedding_provider().embed(doc.content)

        # Determine summary - skip if content unchanged
        max_len = self._config.max_summary_length
        content_unchanged = (
            existing_doc is not None
            and existing_doc.content_hash == new_hash
        )

        if content_unchanged and summary is None:
            # Content unchanged - preserve existing summary
            logger.debug("Content unchanged, skipping summarization for %s", id)
            final_summary = existing_doc.summary
        elif summary is not None:
            # User-provided summary - validate length
            if len(summary) > max_len:
                import warnings
                warnings.warn(
                    f"Summary exceeds max_summary_length ({len(summary)} > {max_len}), truncating",
                    UserWarning,
                    stacklevel=2
                )
                summary = summary[:max_len]
            final_summary = summary
        elif lazy:
            # Truncated placeholder for lazy mode
            if len(doc.content) > max_len:
                final_summary = doc.content[:max_len] + "..."
            else:
                final_summary = doc.content
            # Queue for background processing
            self._pending_queue.enqueue(id, coll, doc.content)
        else:
            # Auto-generate summary
            final_summary = self._get_summarization_provider().summarize(doc.content)

        # Build tags: existing → config → env → user (later wins on collision)
        merged_tags = {**existing_tags}

        # Merge config default tags
        if self._config.default_tags:
            merged_tags.update(self._config.default_tags)

        # Merge environment variable tags
        env_tags = _get_env_tags()
        merged_tags.update(env_tags)

        # Merge in user-provided tags (filtered to prevent system tag override)
        if tags:
            merged_tags.update(filter_non_system_tags(tags))

        # Add system tags
        merged_tags["_source"] = "uri"
        if doc.content_type:
            merged_tags["_content_type"] = doc.content_type

        # Get existing doc info for versioning before upsert
        old_doc = self._document_store.get(coll, id)

        # Dual-write: document store (canonical) + ChromaDB (embedding index)
        # DocumentStore.upsert now returns (record, content_changed) and archives old version
        doc_record, content_changed = self._document_store.upsert(
            collection=coll,
            id=id,
            summary=final_summary,
            tags=merged_tags,
            content_hash=new_hash,
        )

        # Store embedding for current version
        self._store.upsert(
            collection=coll,
            id=id,
            embedding=embedding,
            summary=final_summary,
            tags=merged_tags,
        )

        # If content changed and we archived a version, also store versioned embedding
        # Skip if content hash is same (only tags/summary changed)
        if old_doc is not None and content_changed:
            # Get the version number that was just archived
            version_count = self._document_store.version_count(coll, id)
            if version_count > 0:
                # Re-embed the old content for the archived version
                old_embedding = self._get_embedding_provider().embed(old_doc.summary)
                self._store.upsert_version(
                    collection=coll,
                    id=id,
                    version=version_count,
                    embedding=old_embedding,
                    summary=old_doc.summary,
                    tags=old_doc.tags,
                )

        # Spawn background processor if lazy (only if summary wasn't user-provided and content changed)
        if lazy and summary is None and not content_unchanged:
            self._spawn_processor()

        # Return the stored item
        doc_record = self._document_store.get(coll, id)
        return _record_to_item(doc_record)

    def remember(
        self,
        content: str,
        *,
        id: Optional[str] = None,
        summary: Optional[str] = None,
        tags: Optional[dict[str, str]] = None,
        source_tags: Optional[dict[str, str]] = None,  # Deprecated alias
        collection: Optional[str] = None,
        lazy: bool = False
    ) -> Item:
        """
        Store inline content directly (without fetching from a URI).

        Use for conversation snippets, notes, insights.

        **Smart summary behavior:**
        - If summary is provided, use it (skips auto-summarization)
        - If content is short (≤ max_summary_length), use content verbatim
        - Otherwise, generate summary via summarization provider

        **Update behavior (when id already exists):**
        - Summary: Replaced with user-provided, content, or generated summary
        - Tags: Merged - existing tags preserved, new tags override
          on key collision. System tags (prefixed with _) are always managed by
          the system.

        Args:
            content: Text to store and index
            id: Optional custom ID (auto-generated if None)
            summary: User-provided summary (skips auto-summarization if given)
            tags: User-provided tags to merge with existing tags
            source_tags: Deprecated alias for 'tags'
            collection: Target collection (uses default if None)
            lazy: If True and content is long, use truncated placeholder summary
                  and queue for background processing. Ignored if content is
                  short or summary is provided.

        Returns:
            The stored Item with merged tags and new summary
        """
        # Handle deprecated source_tags parameter
        if source_tags is not None:
            import warnings
            warnings.warn(
                "source_tags is deprecated, use 'tags' instead",
                DeprecationWarning,
                stacklevel=2
            )
            if tags is None:
                tags = source_tags

        coll = self._resolve_collection(collection)

        # Generate ID if not provided
        if id is None:
            timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")
            id = f"mem:{timestamp}"

        # Get existing item to preserve tags (check document store first, fall back to ChromaDB)
        existing_tags = {}
        existing_doc = self._document_store.get(coll, id)
        if existing_doc:
            existing_tags = filter_non_system_tags(existing_doc.tags)
        else:
            existing = self._store.get(coll, id)
            if existing:
                existing_tags = filter_non_system_tags(existing.tags)

        # Compute content hash for change detection
        new_hash = _content_hash(content)

        # Generate embedding
        embedding = self._get_embedding_provider().embed(content)

        # Determine summary (smart behavior for remember) - skip if content unchanged
        max_len = self._config.max_summary_length
        content_unchanged = (
            existing_doc is not None
            and existing_doc.content_hash == new_hash
        )

        if content_unchanged and summary is None:
            # Content unchanged - preserve existing summary
            logger.debug("Content unchanged, skipping summarization for %s", id)
            final_summary = existing_doc.summary
        elif summary is not None:
            # User-provided summary - validate length
            if len(summary) > max_len:
                import warnings
                warnings.warn(
                    f"Summary exceeds max_summary_length ({len(summary)} > {max_len}), truncating",
                    UserWarning,
                    stacklevel=2
                )
                summary = summary[:max_len]
            final_summary = summary
        elif len(content) <= max_len:
            # Content is short enough - use verbatim (smart summary)
            final_summary = content
        elif lazy:
            # Content is long and lazy mode - truncated placeholder
            final_summary = content[:max_len] + "..."
            # Queue for background processing
            self._pending_queue.enqueue(id, coll, content)
        else:
            # Content is long - generate summary
            final_summary = self._get_summarization_provider().summarize(content)

        # Build tags: existing → config → env → user (later wins on collision)
        merged_tags = {**existing_tags}

        # Merge config default tags
        if self._config.default_tags:
            merged_tags.update(self._config.default_tags)

        # Merge environment variable tags
        env_tags = _get_env_tags()
        merged_tags.update(env_tags)

        # Merge in user-provided tags (filtered)
        if tags:
            merged_tags.update(filter_non_system_tags(tags))

        # Add system tags
        merged_tags["_source"] = "inline"

        # Get existing doc info for versioning before upsert
        old_doc = self._document_store.get(coll, id)

        # Dual-write: document store (canonical) + ChromaDB (embedding index)
        # DocumentStore.upsert now returns (record, content_changed) and archives old version
        doc_record, content_changed = self._document_store.upsert(
            collection=coll,
            id=id,
            summary=final_summary,
            tags=merged_tags,
            content_hash=new_hash,
        )

        # Store embedding for current version
        self._store.upsert(
            collection=coll,
            id=id,
            embedding=embedding,
            summary=final_summary,
            tags=merged_tags,
        )

        # If content changed and we archived a version, also store versioned embedding
        # Skip if content hash is same (only tags/summary changed)
        if old_doc is not None and content_changed:
            # Get the version number that was just archived
            version_count = self._document_store.version_count(coll, id)
            if version_count > 0:
                # Re-embed the old content for the archived version
                old_embedding = self._get_embedding_provider().embed(old_doc.summary)
                self._store.upsert_version(
                    collection=coll,
                    id=id,
                    version=version_count,
                    embedding=old_embedding,
                    summary=old_doc.summary,
                    tags=old_doc.tags,
                )

        # Spawn background processor if lazy and content was queued (only if content changed)
        if lazy and summary is None and len(content) > max_len and not content_unchanged:
            self._spawn_processor()

        # Return the stored item
        doc_record = self._document_store.get(coll, id)
        return _record_to_item(doc_record)

    # -------------------------------------------------------------------------
    # Query Operations
    # -------------------------------------------------------------------------
    
    def _apply_recency_decay(self, items: list[Item]) -> list[Item]:
        """
        Apply ACT-R style recency decay to search results.
        
        Multiplies each item's similarity score by a decay factor based on
        time since last update. Uses exponential decay with configurable half-life.
        
        Formula: effective_score = similarity × 0.5^(days_elapsed / half_life)
        """
        if self._decay_half_life_days <= 0:
            return items  # Decay disabled
        
        now = datetime.now(timezone.utc)
        decayed_items = []
        
        for item in items:
            # Get last update time from tags
            updated_str = item.tags.get("_updated")
            if updated_str and item.score is not None:
                try:
                    # Parse ISO timestamp
                    updated = datetime.fromisoformat(updated_str.replace("Z", "+00:00"))
                    days_elapsed = (now - updated).total_seconds() / 86400
                    
                    # Exponential decay: 0.5^(days/half_life)
                    decay_factor = 0.5 ** (days_elapsed / self._decay_half_life_days)
                    decayed_score = item.score * decay_factor
                    
                    # Create new Item with decayed score
                    decayed_items.append(Item(
                        id=item.id,
                        summary=item.summary,
                        tags=item.tags,
                        score=decayed_score
                    ))
                except (ValueError, TypeError):
                    # If timestamp parsing fails, keep original
                    decayed_items.append(item)
            else:
                decayed_items.append(item)
        
        # Re-sort by decayed score (highest first)
        decayed_items.sort(key=lambda x: x.score if x.score is not None else 0, reverse=True)
        
        return decayed_items
    
    def find(
        self,
        query: str,
        *,
        limit: int = 10,
        since: Optional[str] = None,
        collection: Optional[str] = None
    ) -> list[Item]:
        """
        Find items using semantic similarity search.

        Scores are adjusted by recency decay (ACT-R model) - older items
        have reduced effective relevance unless recently accessed.

        Args:
            query: Search query text
            limit: Maximum results to return
            since: Only include items updated since (ISO duration like P3D, or date)
            collection: Target collection
        """
        coll = self._resolve_collection(collection)

        # Embed query
        embedding = self._get_embedding_provider().embed(query)

        # Search (fetch extra to account for re-ranking and date filtering)
        fetch_limit = limit * 2 if self._decay_half_life_days > 0 else limit
        if since is not None:
            fetch_limit = max(fetch_limit, limit * 3)  # Fetch more when filtering
        results = self._store.query_embedding(coll, embedding, limit=fetch_limit)

        # Convert to Items and apply decay
        items = [r.to_item() for r in results]
        items = self._apply_recency_decay(items)

        # Apply date filter if specified
        if since is not None:
            items = _filter_by_date(items, since)

        return items[:limit]
    
    def find_similar(
        self,
        id: str,
        *,
        limit: int = 10,
        since: Optional[str] = None,
        include_self: bool = False,
        collection: Optional[str] = None
    ) -> list[Item]:
        """
        Find items similar to an existing item.

        Args:
            id: ID of item to find similar items for
            limit: Maximum results to return
            since: Only include items updated since (ISO duration like P3D, or date)
            include_self: Include the queried item in results
            collection: Target collection
        """
        coll = self._resolve_collection(collection)

        # Get the item to find its embedding
        item = self._store.get(coll, id)
        if item is None:
            raise KeyError(f"Item not found: {id}")

        # Search using the summary's embedding (fetch extra when filtering)
        embedding = self._get_embedding_provider().embed(item.summary)
        actual_limit = limit + 1 if not include_self else limit
        if since is not None:
            actual_limit = max(actual_limit, limit * 3)
        results = self._store.query_embedding(coll, embedding, limit=actual_limit)

        # Filter self if needed
        if not include_self:
            results = [r for r in results if r.id != id]

        # Convert to Items and apply decay
        items = [r.to_item() for r in results]
        items = self._apply_recency_decay(items)

        # Apply date filter if specified
        if since is not None:
            items = _filter_by_date(items, since)

        return items[:limit]

    def get_similar_for_display(
        self,
        id: str,
        *,
        limit: int = 3,
        collection: Optional[str] = None
    ) -> list[Item]:
        """
        Find similar items for frontmatter display using stored embedding.

        Optimized for display: uses stored embedding (no re-embedding),
        filters to distinct base documents, excludes source document versions.

        Args:
            id: ID of item to find similar items for
            limit: Maximum results to return
            collection: Target collection

        Returns:
            List of similar items, one per unique base document
        """
        coll = self._resolve_collection(collection)

        # Get the stored embedding (no re-embedding)
        embedding = self._store.get_embedding(coll, id)
        if embedding is None:
            return []

        # Fetch more than needed to account for version filtering
        fetch_limit = limit * 3
        results = self._store.query_embedding(coll, embedding, limit=fetch_limit)

        # Convert to Items
        items = [r.to_item() for r in results]

        # Extract base ID of source document
        source_base_id = id.split("@v")[0] if "@v" in id else id

        # Filter to distinct base IDs, excluding source document
        seen_base_ids: set[str] = set()
        filtered: list[Item] = []
        for item in items:
            # Get base ID from tags or parse from ID
            base_id = item.tags.get("_base_id", item.id.split("@v")[0] if "@v" in item.id else item.id)

            # Skip versions of source document
            if base_id == source_base_id:
                continue

            # Keep only first version of each document
            if base_id not in seen_base_ids:
                seen_base_ids.add(base_id)
                filtered.append(item)

                if len(filtered) >= limit:
                    break

        return filtered

    def get_version_offset(self, item: Item, collection: Optional[str] = None) -> int:
        """
        Get version offset (0=current, 1=previous, ...) for an item.

        Converts the internal version number (1=oldest, 2=next...) to the
        user-visible offset format (0=current, 1=previous, 2=two-ago...).

        Args:
            item: Item to get version offset for
            collection: Target collection

        Returns:
            Version offset (0 for current version)
        """
        version_tag = item.tags.get("_version")
        if not version_tag:
            return 0  # Current version
        base_id = item.tags.get("_base_id", item.id)
        coll = self._resolve_collection(collection)
        version_count = self._document_store.version_count(coll, base_id)
        return version_count - int(version_tag) + 1

    def query_fulltext(
        self,
        query: str,
        *,
        limit: int = 10,
        since: Optional[str] = None,
        collection: Optional[str] = None
    ) -> list[Item]:
        """
        Search item summaries using full-text search.

        Args:
            query: Text to search for in summaries
            limit: Maximum results to return
            since: Only include items updated since (ISO duration like P3D, or date)
            collection: Target collection
        """
        coll = self._resolve_collection(collection)

        # Fetch extra when filtering by date
        fetch_limit = limit * 3 if since is not None else limit
        results = self._store.query_fulltext(coll, query, limit=fetch_limit)
        items = [r.to_item() for r in results]

        # Apply date filter if specified
        if since is not None:
            items = _filter_by_date(items, since)

        return items[:limit]
    
    def query_tag(
        self,
        key: Optional[str] = None,
        value: Optional[str] = None,
        *,
        limit: int = 100,
        since: Optional[str] = None,
        collection: Optional[str] = None,
        **tags: str
    ) -> list[Item]:
        """
        Find items by tag(s).

        Usage:
            # Key only: find all docs with this tag key (any value)
            query_tag("project")

            # Key with value: find docs with specific tag value
            query_tag("project", "myapp")

            # Multiple tags via kwargs
            query_tag(tradition="buddhist", source="mn22")

        Args:
            key: Tag key to search for
            value: Tag value (optional, any value if not provided)
            limit: Maximum results to return
            since: Only include items updated since (ISO duration like P3D, or date)
            collection: Target collection
            **tags: Additional tag filters as keyword arguments
        """
        coll = self._resolve_collection(collection)

        # Key-only query: find docs that have this tag key (any value)
        # Uses DocumentStore which supports efficient SQL date filtering
        if key is not None and value is None and not tags:
            # Convert since to cutoff date for SQL query
            since_date = _parse_since(since) if since else None
            docs = self._document_store.query_by_tag_key(
                coll, key, limit=limit, since_date=since_date
            )
            return [_record_to_item(d) for d in docs]

        # Build tag filter from positional or keyword args
        tag_filter = {}

        if key is not None and value is not None:
            tag_filter[key] = value

        if tags:
            tag_filter.update(tags)

        if not tag_filter:
            raise ValueError("At least one tag must be specified")

        # Build where clause for tag filters only
        # (ChromaDB $gte doesn't support string dates, so date filtering is done post-query)
        where_conditions = [{k: v} for k, v in tag_filter.items()]

        # Use $and if multiple conditions, otherwise single condition
        if len(where_conditions) == 1:
            where = where_conditions[0]
        else:
            where = {"$and": where_conditions}

        # Fetch extra when filtering by date
        fetch_limit = limit * 3 if since is not None else limit
        results = self._store.query_metadata(coll, where, limit=fetch_limit)
        items = [r.to_item() for r in results]

        # Apply date filter if specified (post-filter)
        if since is not None:
            items = _filter_by_date(items, since)

        return items[:limit]

    def list_tags(
        self,
        key: Optional[str] = None,
        *,
        collection: Optional[str] = None,
    ) -> list[str]:
        """
        List distinct tag keys or values.

        Args:
            key: If provided, list distinct values for this key.
                 If None, list distinct tag keys.
            collection: Target collection

        Returns:
            Sorted list of distinct keys or values
        """
        coll = self._resolve_collection(collection)

        if key is None:
            return self._document_store.list_distinct_tag_keys(coll)
        else:
            return self._document_store.list_distinct_tag_values(coll, key)
    
    # -------------------------------------------------------------------------
    # Direct Access
    # -------------------------------------------------------------------------
    
    def get(self, id: str, *, collection: Optional[str] = None) -> Optional[Item]:
        """
        Retrieve a specific item by ID.
        
        Reads from document store (canonical), falls back to ChromaDB for legacy data.
        """
        coll = self._resolve_collection(collection)
        
        # Try document store first (canonical)
        doc_record = self._document_store.get(coll, id)
        if doc_record:
            return _record_to_item(doc_record)
        
        # Fall back to ChromaDB for legacy data
        result = self._store.get(coll, id)
        if result is None:
            return None
        return result.to_item()

    def get_version(
        self,
        id: str,
        offset: int = 0,
        *,
        collection: Optional[str] = None,
    ) -> Optional[Item]:
        """
        Get a specific version of a document by offset.

        Offset semantics:
        - 0 = current version
        - 1 = previous version
        - 2 = two versions ago
        - etc.

        Args:
            id: Document identifier
            offset: Version offset (0=current, 1=previous, etc.)
            collection: Target collection

        Returns:
            Item if found, None if version doesn't exist
        """
        coll = self._resolve_collection(collection)

        if offset == 0:
            # Current version
            return self.get(id, collection=collection)

        # Get archived version
        version_info = self._document_store.get_version(coll, id, offset)
        if version_info is None:
            return None

        return Item(
            id=id,
            summary=version_info.summary,
            tags=version_info.tags,
        )

    def list_versions(
        self,
        id: str,
        limit: int = 10,
        *,
        collection: Optional[str] = None,
    ) -> list[VersionInfo]:
        """
        List version history for a document.

        Returns versions in reverse chronological order (newest archived first).
        Does not include the current version.

        Args:
            id: Document identifier
            limit: Maximum versions to return
            collection: Target collection

        Returns:
            List of VersionInfo, newest archived first
        """
        coll = self._resolve_collection(collection)
        return self._document_store.list_versions(coll, id, limit)

    def get_version_nav(
        self,
        id: str,
        current_version: Optional[int] = None,
        limit: int = 3,
        *,
        collection: Optional[str] = None,
    ) -> dict[str, list[VersionInfo]]:
        """
        Get version navigation info (prev/next) for display.

        Args:
            id: Document identifier
            current_version: The version being viewed (None = current/live version)
            limit: Max previous versions to return when viewing current
            collection: Target collection

        Returns:
            Dict with 'prev' and optionally 'next' lists of VersionInfo.
        """
        coll = self._resolve_collection(collection)
        return self._document_store.get_version_nav(coll, id, current_version, limit)

    def exists(self, id: str, *, collection: Optional[str] = None) -> bool:
        """
        Check if an item exists in the store.
        """
        coll = self._resolve_collection(collection)
        # Check document store first, then ChromaDB
        return self._document_store.exists(coll, id) or self._store.exists(coll, id)
    
    def delete(
        self,
        id: str,
        *,
        collection: Optional[str] = None,
        delete_versions: bool = True,
    ) -> bool:
        """
        Delete an item from both stores.

        Args:
            id: Document identifier
            collection: Target collection
            delete_versions: If True, also delete version history

        Returns:
            True if item existed and was deleted.
        """
        coll = self._resolve_collection(collection)
        # Delete from both stores (including versions)
        doc_deleted = self._document_store.delete(coll, id, delete_versions=delete_versions)
        chroma_deleted = self._store.delete(coll, id, delete_versions=delete_versions)
        return doc_deleted or chroma_deleted

    # -------------------------------------------------------------------------
    # Current Working Context (Now)
    # -------------------------------------------------------------------------

    def get_now(self) -> Item:
        """
        Get the current working context.

        A singleton document representing what you're currently working on.
        If it doesn't exist, creates one with default content and tags from
        the bundled system now.md file.

        Returns:
            The current context Item (never None - auto-creates if missing)
        """
        item = self.get(NOWDOC_ID)
        if item is None:
            # First-time initialization with default content and tags
            try:
                default_content, default_tags = _load_frontmatter(SYSTEM_DOC_DIR / "now.md")
            except FileNotFoundError:
                # Fallback if system file is missing
                default_content = "# Now\n\nYour working context."
                default_tags = {}
            item = self.set_now(default_content, tags=default_tags)
        return item

    def set_now(
        self,
        content: str,
        *,
        tags: Optional[dict[str, str]] = None,
    ) -> Item:
        """
        Set the current working context.

        Updates the singleton context with new content. Uses remember()
        internally with the fixed NOWDOC_ID.

        Args:
            content: New content for the current context
            tags: Optional additional tags to apply

        Returns:
            The updated context Item
        """
        return self.remember(content, id=NOWDOC_ID, tags=tags)

    def list_system_documents(
        self,
        *,
        collection: Optional[str] = None,
    ) -> list[Item]:
        """
        List all system documents.

        System documents are identified by the `category: system` tag.
        These are preloaded on init and provide foundational content.

        Args:
            collection: Target collection (default: default collection)

        Returns:
            List of system document Items
        """
        return self.query_tag("category", "system", collection=collection)

    def reset_system_documents(self) -> dict:
        """
        Force reload all system documents from bundled content.

        This overwrites any user modifications to system documents.
        Use with caution - primarily for recovery or testing.

        Returns:
            Dict with stats: reset count
        """
        from .config import SYSTEM_DOCS_VERSION, save_config

        stats = {"reset": 0}

        for path in SYSTEM_DOC_DIR.glob("*.md"):
            new_id = SYSTEM_DOC_IDS.get(path.name)
            if new_id is None:
                continue

            try:
                content, tags = _load_frontmatter(path)
                tags["category"] = "system"

                # Delete existing (if any) and create fresh
                self.delete(new_id)
                self.remember(content, id=new_id, tags=tags)
                stats["reset"] += 1
                logger.info("Reset system doc: %s", new_id)

            except FileNotFoundError:
                logger.warning("System doc file not found: %s", path)

        # Update config version
        self._config.system_docs_version = SYSTEM_DOCS_VERSION
        save_config(self._config)

        return stats

    def tag(
        self,
        id: str,
        tags: Optional[dict[str, str]] = None,
        *,
        collection: Optional[str] = None,
    ) -> Optional[Item]:
        """
        Update tags on an existing document without re-processing.

        Does NOT re-fetch, re-embed, or re-summarize. Only updates tags.

        Tag behavior:
        - Provided tags are merged with existing user tags
        - Empty string value ("") deletes that tag
        - System tags (_prefixed) cannot be modified via this method

        Args:
            id: Document identifier
            tags: Tags to add/update/delete (empty string = delete)
            collection: Target collection

        Returns:
            Updated Item if found, None if document doesn't exist
        """
        coll = self._resolve_collection(collection)

        # Get existing item (prefer document store, fall back to ChromaDB)
        existing = self.get(id, collection=collection)
        if existing is None:
            return None

        # Start with existing tags, separate system from user
        current_tags = dict(existing.tags)
        system_tags = {k: v for k, v in current_tags.items()
                       if k.startswith(SYSTEM_TAG_PREFIX)}
        user_tags = {k: v for k, v in current_tags.items()
                     if not k.startswith(SYSTEM_TAG_PREFIX)}

        # Apply tag changes (filter out system tags from input)
        if tags:
            for key, value in tags.items():
                if key.startswith(SYSTEM_TAG_PREFIX):
                    continue  # Cannot modify system tags
                if value == "":
                    # Empty string = delete
                    user_tags.pop(key, None)
                else:
                    user_tags[key] = value

        # Merge back: user tags + system tags
        final_tags = {**user_tags, **system_tags}

        # Dual-write to both stores
        self._document_store.update_tags(coll, id, final_tags)
        self._store.update_tags(coll, id, final_tags)

        # Return updated item
        return self.get(id, collection=collection)

    # -------------------------------------------------------------------------
    # Collection Management
    # -------------------------------------------------------------------------
    
    def list_collections(self) -> list[str]:
        """
        List all collections in the store.
        """
        # Merge collections from both stores
        doc_collections = set(self._document_store.list_collections())
        chroma_collections = set(self._store.list_collections())
        return sorted(doc_collections | chroma_collections)
    
    def count(self, *, collection: Optional[str] = None) -> int:
        """
        Count items in a collection.

        Returns count from document store if available, else ChromaDB.
        """
        coll = self._resolve_collection(collection)
        doc_count = self._document_store.count(coll)
        if doc_count > 0:
            return doc_count
        return self._store.count(coll)

    def list_recent(
        self,
        limit: int = 10,
        *,
        since: Optional[str] = None,
        collection: Optional[str] = None,
    ) -> list[Item]:
        """
        List recent items ordered by update time.

        Args:
            limit: Maximum number to return (default 10)
            since: Only include items updated since (ISO duration like P3D, or date)
            collection: Collection to query (uses default if not specified)

        Returns:
            List of Items, most recently updated first
        """
        coll = self._resolve_collection(collection)

        # Fetch extra when filtering by date
        fetch_limit = limit * 3 if since is not None else limit
        records = self._document_store.list_recent(coll, fetch_limit)
        items = [_record_to_item(rec) for rec in records]

        # Apply date filter if specified
        if since is not None:
            items = _filter_by_date(items, since)

        return items[:limit]

    def embedding_cache_stats(self) -> dict:
        """
        Get embedding cache statistics.

        Returns dict with: entries, hits, misses, hit_rate, cache_path
        Returns {"loaded": False} if embedding provider hasn't been loaded yet.
        """
        if self._embedding_provider is None:
            return {"loaded": False}
        if isinstance(self._embedding_provider, CachingEmbeddingProvider):
            return self._embedding_provider.stats()
        return {"enabled": False}

    # -------------------------------------------------------------------------
    # Pending Summaries
    # -------------------------------------------------------------------------

    def process_pending(self, limit: int = 10) -> int:
        """
        Process pending summaries queued by lazy update/remember.

        Generates real summaries for items that were indexed with
        truncated placeholders. Updates the stored items in place.

        Items that fail MAX_SUMMARY_ATTEMPTS times are removed from
        the queue (the truncated placeholder remains in the store).

        Args:
            limit: Maximum number of items to process in this batch

        Returns:
            Number of items successfully processed
        """
        items = self._pending_queue.dequeue(limit=limit)
        processed = 0

        for item in items:
            # Skip items that have failed too many times
            # (attempts was already incremented by dequeue, so check >= MAX)
            if item.attempts >= MAX_SUMMARY_ATTEMPTS:
                # Give up - remove from queue, keep truncated placeholder
                self._pending_queue.complete(item.id, item.collection)
                continue

            try:
                # Generate real summary
                summary = self._get_summarization_provider().summarize(item.content)

                # Update summary in both stores
                self._document_store.update_summary(item.collection, item.id, summary)
                self._store.update_summary(item.collection, item.id, summary)

                # Remove from queue
                self._pending_queue.complete(item.id, item.collection)
                processed += 1

            except Exception:
                # Leave in queue for retry (attempt counter already incremented)
                pass

        return processed

    def pending_count(self) -> int:
        """Get count of pending summaries awaiting processing."""
        return self._pending_queue.count()

    def pending_stats(self) -> dict:
        """
        Get pending summary queue statistics.

        Returns dict with: pending, collections, max_attempts, oldest, queue_path
        """
        return self._pending_queue.stats()

    @property
    def _processor_pid_path(self) -> Path:
        """Path to the processor PID file."""
        return self._store_path / "processor.pid"

    def _is_processor_running(self) -> bool:
        """Check if a processor is already running."""
        pid_path = self._processor_pid_path
        if not pid_path.exists():
            return False

        try:
            pid = int(pid_path.read_text().strip())
            # Check if process is alive by sending signal 0
            os.kill(pid, 0)
            return True
        except (ValueError, ProcessLookupError, PermissionError):
            # PID file invalid, process dead, or permission issue
            # Clean up stale PID file
            try:
                pid_path.unlink()
            except OSError:
                pass
            return False

    def _spawn_processor(self) -> bool:
        """
        Spawn a background processor if not already running.

        Returns True if a new processor was spawned, False if one was
        already running or spawn failed.
        """
        if self._is_processor_running():
            return False

        try:
            # Spawn detached process
            # Use sys.executable to ensure we use the same Python
            cmd = [
                sys.executable, "-m", "keep.cli",
                "process-pending",
                "--daemon",
                "--store", str(self._store_path),
            ]

            # Platform-specific detachment
            kwargs: dict = {
                "stdout": subprocess.DEVNULL,
                "stderr": subprocess.DEVNULL,
                "stdin": subprocess.DEVNULL,
            }

            if sys.platform != "win32":
                # Unix: start new session to fully detach
                kwargs["start_new_session"] = True
            else:
                # Windows: use CREATE_NEW_PROCESS_GROUP
                kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP

            subprocess.Popen(cmd, **kwargs)
            return True

        except Exception as e:
            # Spawn failed - log for debugging, queue will be processed later
            logger.warning("Failed to spawn background processor: %s", e)
            return False

    def reconcile(
        self,
        collection: Optional[str] = None,
        fix: bool = False,
    ) -> dict:
        """
        Check and optionally fix consistency between DocumentStore and ChromaDB.

        Detects:
        - Documents in DocumentStore missing from ChromaDB (not searchable)
        - Documents in ChromaDB missing from DocumentStore (orphaned embeddings)

        Args:
            collection: Collection to check (None = default collection)
            fix: If True, re-index documents missing from ChromaDB

        Returns:
            Dict with 'missing_from_chroma', 'orphaned_in_chroma', 'fixed' counts
        """
        coll = self._resolve_collection(collection)

        # Get IDs from both stores
        doc_ids = set(self._document_store.list_ids(coll))
        chroma_ids = set(self._store.list_ids(coll))

        missing_from_chroma = doc_ids - chroma_ids
        orphaned_in_chroma = chroma_ids - doc_ids

        fixed = 0
        if fix and missing_from_chroma:
            for doc_id in missing_from_chroma:
                try:
                    # Re-fetch and re-index
                    doc_record = self._document_store.get(coll, doc_id)
                    if doc_record:
                        # Fetch original content
                        doc = self._document_provider.fetch(doc_id)
                        embedding = self._get_embedding_provider().embed(doc.content)

                        # Write to ChromaDB
                        self._store.upsert(
                            collection=coll,
                            id=doc_id,
                            embedding=embedding,
                            summary=doc_record.summary,
                            tags=doc_record.tags,
                        )
                        fixed += 1
                        logger.info("Reconciled: %s", doc_id)
                except Exception as e:
                    logger.warning("Failed to reconcile %s: %s", doc_id, e)

        return {
            "missing_from_chroma": len(missing_from_chroma),
            "orphaned_in_chroma": len(orphaned_in_chroma),
            "fixed": fixed,
            "missing_ids": list(missing_from_chroma) if missing_from_chroma else [],
            "orphaned_ids": list(orphaned_in_chroma) if orphaned_in_chroma else [],
        }

    def close(self) -> None:
        """
        Close resources (embedding cache connection, pending queue, etc.).

        Good practice to call when done, though Python's GC will clean up eventually.
        """
        # Close embedding cache if it was loaded
        if self._embedding_provider is not None:
            if hasattr(self._embedding_provider, '_cache'):
                cache = self._embedding_provider._cache
                if hasattr(cache, 'close'):
                    cache.close()

        # Close pending summary queue
        if hasattr(self, '_pending_queue'):
            self._pending_queue.close()

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - close resources."""
        self.close()
        return False

    def __del__(self):
        """Cleanup on deletion."""
        self.close()
