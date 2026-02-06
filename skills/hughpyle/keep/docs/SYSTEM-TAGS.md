# System Tags Reference

System tags are automatically managed metadata prefixed with underscore (`_`). Users cannot set or modify these tags directly - they are protected by the `filter_non_system_tags()` function in `keep/types.py`.

## Implemented Tags

These tags are actively set and maintained by the system.

### `_created`

**Purpose:** ISO 8601 timestamp of when the item was first indexed.

**Set by:** `DocumentStore.upsert()` in `document_store.py`, `ChromaStore.upsert()` in `store.py`

**Behavior:** Set once on first insert, preserved on updates. Both stores maintain this independently.

**Example:** `"2026-01-15T10:30:00.123456+00:00"`

**Access:** Read via `item.created` property or `item.tags["_created"]`

---

### `_updated`

**Purpose:** ISO 8601 timestamp of the last modification.

**Set by:** `DocumentStore.upsert()` in `document_store.py`, `ChromaStore.upsert()` in `store.py`

**Behavior:** Updated on every modification (content, summary, or tags). Both stores maintain this independently.

**Example:** `"2026-02-02T14:45:00.789012+00:00"`

**Access:** Read via `item.updated` property or `item.tags["_updated"]`

---

### `_updated_date`

**Purpose:** Date portion of `_updated` for efficient date-based queries.

**Set by:** `DocumentStore.upsert()` in `document_store.py`, `ChromaStore.upsert()` in `store.py`

**Behavior:** Always set alongside `_updated`. Format: `YYYY-MM-DD`. Both stores maintain this independently.

**Example:** `"2026-02-02"`

**Usage:** Used by `--since` filtering in CLI commands.

---

### `_content_type`

**Purpose:** MIME type of the document content.

**Set by:** `Keeper.update()` in `api.py` (only for URI-based documents)

**Behavior:** Set if the document provider returns a content type.

**Example:** `"text/markdown"`, `"text/html"`, `"application/pdf"`

**Note:** Not set for inline content (CLI: `keep update "text"`, API: `kp.remember()`).

---

### `_source`

**Purpose:** How the content was obtained.

**Set by:** `Keeper.update()` and `Keeper.remember()` in `api.py`

**Values:**

- `"uri"` - Content fetched from a URI (CLI: `keep update <uri>`, API: `kp.update()`)
- `"inline"` - Inline content (CLI: `keep update "text"`, API: `kp.remember()`)

**Usage:** Query with `kp.query_tag("_source", "inline")` to find remembered content.

---

## Protection Mechanism

System tags are protected from user modification:

```python
# In keep/types.py
SYSTEM_TAG_PREFIX = "_"

def filter_non_system_tags(tags: dict[str, str]) -> dict[str, str]:
    """Filter out any system tags (those starting with '_')."""
    return {k: v for k, v in tags.items() if not k.startswith(SYSTEM_TAG_PREFIX)}
```

This function is called before merging user-provided tags in `update()` (API), `remember()` (API), and `tag()` methods.

## Tag Merge Order

When indexing documents, tags are merged in this order (later wins on collision):

1. **Existing tags** - Preserved from previous version
2. **Config tags** - From `[tags]` section in `keep.toml`
3. **Environment tags** - From `KEEP_TAG_*` variables
4. **User tags** - Passed to `update()`, `remember()`, or `tag()`
5. **System tags** - Added/updated by system (cannot be overridden)

## Querying by System Tags

```python
# Find items by source
inline_items = kp.query_tag("_source", "inline")
uri_items = kp.query_tag("_source", "uri")

# Find items by date
today = kp.query_tag("_updated_date", "2026-02-02")

# Find system documents
system_docs = kp.query_tag("_system", "true")
```

## Versioning and System Tags

When a document is updated, the previous version (including all its system tags) is archived in the `document_versions` table. This preserves the complete tag state at each point in history.

```python
# Current version has current timestamps
current = kp.get("doc:1")
print(current.tags["_updated"])  # "2026-02-02T14:45:00..."

# Previous version has its own timestamps
prev = kp.get_version("doc:1", offset=1)
print(prev.tags["_updated"])  # "2026-02-01T10:30:00..."
```

## See Also

- [REFERENCE.md](REFERENCE.md) - API reference card
- [QUICKSTART.md](QUICKSTART.md) - Getting started guide
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
