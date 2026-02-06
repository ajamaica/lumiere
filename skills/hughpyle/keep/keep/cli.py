"""
CLI interface for reflective memory.

Usage:
    keepfind "query text"
    keepupdate file:///path/to/doc.md
    keepget file:///path/to/doc.md
"""

import json
import os
import re
import sys
from pathlib import Path
from typing import Optional

import typer
from typing_extensions import Annotated

# Pattern for version identifier suffix: @V{N} where N is digits only
VERSION_SUFFIX_PATTERN = re.compile(r'@V\{(\d+)\}$')

# URI scheme pattern per RFC 3986: scheme = ALPHA *( ALPHA / DIGIT / "+" / "-" / "." )
# Used to distinguish URIs from plain text in the update command
_URI_SCHEME_PATTERN = re.compile(r'^[a-zA-Z][a-zA-Z0-9+.-]*://')

from .api import Keeper, _text_content_id
from .document_store import VersionInfo
from .types import Item
from .logging_config import configure_quiet_mode, enable_debug_mode


# Configure quiet mode by default (suppress verbose library output)
# Set KEEP_VERBOSE=1 to enable debug mode via environment
if os.environ.get("KEEP_VERBOSE") == "1":
    enable_debug_mode()
else:
    configure_quiet_mode(quiet=True)


def _verbose_callback(value: bool):
    if value:
        enable_debug_mode()


# Global state for CLI options
_json_output = False
_ids_output = False
_full_output = False
_store_override: Optional[Path] = None


def _json_callback(value: bool):
    global _json_output
    _json_output = value


def _get_json_output() -> bool:
    return _json_output


def _ids_callback(value: bool):
    global _ids_output
    _ids_output = value


def _get_ids_output() -> bool:
    return _ids_output


def _full_callback(value: bool):
    global _full_output
    _full_output = value


def _get_full_output() -> bool:
    return _full_output


def _store_callback(value: Optional[Path]):
    global _store_override
    if value is not None:
        _store_override = value


def _get_store_override() -> Optional[Path]:
    return _store_override


app = typer.Typer(
    name="keep",
    help="Reflective memory with semantic search.",
    no_args_is_help=False,
    invoke_without_command=True,
    rich_markup_mode=None,
)


# -----------------------------------------------------------------------------
# Output Formatting
#
# Three output formats, controlled by global flags:
#   --ids:  versioned ID only (id@V{N})
#   --full: YAML frontmatter with tags, similar items, version nav
#   default: summary line (id@V{N} date summary)
#
# JSON output (--json) works with any of the above.
# -----------------------------------------------------------------------------

def _filter_display_tags(tags: dict) -> dict:
    """Filter out internal-only tags for display."""
    from .types import INTERNAL_TAGS
    return {k: v for k, v in tags.items() if k not in INTERNAL_TAGS}


def _format_yaml_frontmatter(
    item: Item,
    version_nav: Optional[dict[str, list[VersionInfo]]] = None,
    viewing_offset: Optional[int] = None,
    similar_items: Optional[list[Item]] = None,
    similar_offsets: Optional[dict[str, int]] = None,
) -> str:
    """
    Format item as YAML frontmatter with summary as content.

    Args:
        item: The item to format
        version_nav: Optional version navigation info (prev/next lists)
        viewing_offset: If viewing an old version, the offset (1=previous, 2=two ago)
        similar_items: Optional list of similar items to display
        similar_offsets: Version offsets for similar items (item.id -> offset)

    Note: Offset computation (v1, v2, etc.) assumes version_nav lists
    are ordered newest-first, matching list_versions() ordering.
    Changing that ordering would break the vN = -V N correspondence.
    """
    lines = ["---", f"id: {item.id}"]
    if viewing_offset is not None:
        lines.append(f"version: {viewing_offset}")
    display_tags = _filter_display_tags(item.tags)
    if display_tags:
        tag_items = ", ".join(f"{k}: {v}" for k, v in sorted(display_tags.items()))
        lines.append(f"tags: {{{tag_items}}}")
    if item.score is not None:
        lines.append(f"score: {item.score:.3f}")

    # Add similar items if available (version-scoped IDs with date and summary)
    if similar_items:
        lines.append("similar:")
        for sim_item in similar_items:
            base_id = sim_item.tags.get("_base_id", sim_item.id)
            offset = (similar_offsets or {}).get(sim_item.id, 0)
            score_str = f"({sim_item.score:.2f})" if sim_item.score else ""
            date_part = sim_item.tags.get("_updated", sim_item.tags.get("_created", ""))[:10]
            summary_preview = sim_item.summary[:40].replace("\n", " ")
            if len(sim_item.summary) > 40:
                summary_preview += "..."
            lines.append(f"  - {base_id}@V{{{offset}}} {score_str} {date_part} {summary_preview}")

    # Add version navigation (just @V{N} since ID is shown at top, with date + summary)
    if version_nav:
        # Current offset (0 if viewing current)
        current_offset = viewing_offset if viewing_offset is not None else 0

        if version_nav.get("prev"):
            lines.append("prev:")
            for i, v in enumerate(version_nav["prev"]):
                prev_offset = current_offset + i + 1
                date_part = v.created_at[:10] if v.created_at else ""
                summary_preview = v.summary[:40].replace("\n", " ")
                if len(v.summary) > 40:
                    summary_preview += "..."
                lines.append(f"  - @V{{{prev_offset}}} {date_part} {summary_preview}")
        if version_nav.get("next"):
            lines.append("next:")
            for i, v in enumerate(version_nav["next"]):
                next_offset = current_offset - i - 1
                date_part = v.created_at[:10] if v.created_at else ""
                summary_preview = v.summary[:40].replace("\n", " ")
                if len(v.summary) > 40:
                    summary_preview += "..."
                lines.append(f"  - @V{{{next_offset}}} {date_part} {summary_preview}")
        elif viewing_offset is not None:
            # Viewing old version and next is empty means current is next
            lines.append("next:")
            lines.append(f"  - @V{{0}}")

    lines.append("---")
    lines.append(item.summary)  # Summary IS the content
    return "\n".join(lines)


def _format_summary_line(item: Item) -> str:
    """Format item as single summary line: id@version date summary"""
    # Get version-scoped ID
    base_id = item.tags.get("_base_id", item.id)
    version = item.tags.get("_version", "0")
    versioned_id = f"{base_id}@V{{{version}}}"

    # Get date (from _updated_date or _updated or _created)
    date = item.tags.get("_updated_date") or item.tags.get("_updated", "")[:10] or item.tags.get("_created", "")[:10] or ""

    # Truncate summary to ~60 chars, collapse newlines
    summary = item.summary.replace("\n", " ")
    if len(summary) > 60:
        summary = summary[:57].rsplit(" ", 1)[0] + "..."

    return f"{versioned_id} {date} {summary}"


def _format_versioned_id(item: Item) -> str:
    """Format item ID with version suffix: id@V{N}"""
    base_id = item.tags.get("_base_id", item.id)
    version = item.tags.get("_version", "0")
    return f"{base_id}@V{{{version}}}"


@app.callback(invoke_without_command=True)
def main_callback(
    ctx: typer.Context,
    verbose: Annotated[bool, typer.Option(
        "--verbose", "-v",
        help="Enable debug-level logging to stderr",
        callback=_verbose_callback,
        is_eager=True,
    )] = False,
    output_json: Annotated[bool, typer.Option(
        "--json", "-j",
        help="Output as JSON",
        callback=_json_callback,
        is_eager=True,
    )] = False,
    ids_only: Annotated[bool, typer.Option(
        "--ids", "-I",
        help="Output only IDs (for piping to xargs)",
        callback=_ids_callback,
        is_eager=True,
    )] = False,
    full_output: Annotated[bool, typer.Option(
        "--full", "-F",
        help="Output full items (overrides --ids)",
        callback=_full_callback,
        is_eager=True,
    )] = False,
    store: Annotated[Optional[Path], typer.Option(
        "--store", "-s",
        envvar="KEEP_STORE_PATH",
        help="Path to the store directory",
        callback=_store_callback,
        is_eager=True,
    )] = None,
):
    """Reflective memory with semantic search."""
    # If no subcommand provided, show the current context (now)
    if ctx.invoked_subcommand is None:
        from .api import NOWDOC_ID
        kp = _get_keeper(None, "default")
        item = kp.get_now()
        version_nav = kp.get_version_nav(NOWDOC_ID, None, collection="default")
        similar_items = kp.get_similar_for_display(NOWDOC_ID, limit=3, collection="default")
        similar_offsets = {s.id: kp.get_version_offset(s) for s in similar_items}
        typer.echo(_format_item(
            item,
            as_json=_get_json_output(),
            version_nav=version_nav,
            similar_items=similar_items,
            similar_offsets=similar_offsets,
        ))


# -----------------------------------------------------------------------------
# Common Options
# -----------------------------------------------------------------------------

StoreOption = Annotated[
    Optional[Path],
    typer.Option(
        "--store", "-s",
        envvar="KEEP_STORE_PATH",
        help="Path to the store directory (default: .keep/ at repo root)"
    )
]

CollectionOption = Annotated[
    str,
    typer.Option(
        "--collection", "-c",
        help="Collection name"
    )
]

LimitOption = Annotated[
    int,
    typer.Option(
        "--limit", "-n",
        help="Maximum results to return"
    )
]


SinceOption = Annotated[
    Optional[str],
    typer.Option(
        "--since",
        help="Only items updated since (ISO duration: P3D, P1W, PT1H; or date: 2026-01-15)"
    )
]


def _format_item(
    item: Item,
    as_json: bool = False,
    version_nav: Optional[dict[str, list[VersionInfo]]] = None,
    viewing_offset: Optional[int] = None,
    similar_items: Optional[list[Item]] = None,
    similar_offsets: Optional[dict[str, int]] = None,
) -> str:
    """
    Format a single item for display.

    Output selection:
      --ids: versioned ID only
      --full or version_nav/similar_items present: YAML frontmatter
      default: summary line (id@V{N} date summary)

    Args:
        item: The item to format
        as_json: Output as JSON
        version_nav: Version navigation info (triggers full format)
        viewing_offset: Version offset if viewing old version (triggers full format)
        similar_items: Similar items to display (triggers full format)
        similar_offsets: Version offsets for similar items
    """
    if _get_ids_output():
        versioned_id = _format_versioned_id(item)
        return json.dumps(versioned_id) if as_json else versioned_id

    if as_json:
        result = {
            "id": item.id,
            "summary": item.summary,
            "tags": _filter_display_tags(item.tags),
            "score": item.score,
        }
        if viewing_offset is not None:
            result["version"] = viewing_offset
            result["vid"] = f"{item.id}@V{{{viewing_offset}}}"
        if similar_items:
            result["similar"] = [
                {
                    "id": f"{s.tags.get('_base_id', s.id)}@V{{{(similar_offsets or {}).get(s.id, 0)}}}",
                    "score": s.score,
                    "date": s.tags.get("_updated", s.tags.get("_created", ""))[:10],
                    "summary": s.summary[:60],
                }
                for s in similar_items
            ]
        if version_nav:
            current_offset = viewing_offset if viewing_offset is not None else 0
            result["version_nav"] = {}
            if version_nav.get("prev"):
                result["version_nav"]["prev"] = [
                    {
                        "offset": current_offset + i + 1,
                        "vid": f"{item.id}@V{{{current_offset + i + 1}}}",
                        "created_at": v.created_at,
                        "summary": v.summary[:60],
                    }
                    for i, v in enumerate(version_nav["prev"])
                ]
            if version_nav.get("next"):
                result["version_nav"]["next"] = [
                    {
                        "offset": current_offset - i - 1,
                        "vid": f"{item.id}@V{{{current_offset - i - 1}}}",
                        "created_at": v.created_at,
                        "summary": v.summary[:60],
                    }
                    for i, v in enumerate(version_nav["next"])
                ]
            elif viewing_offset is not None:
                result["version_nav"]["next"] = [{"offset": 0, "vid": f"{item.id}@V{{0}}", "label": "current"}]
        return json.dumps(result)

    # Full format when:
    # - --full flag is set
    # - version navigation or similar items are provided (can't display in summary)
    if _get_full_output() or version_nav or similar_items or viewing_offset is not None:
        return _format_yaml_frontmatter(item, version_nav, viewing_offset, similar_items, similar_offsets)
    return _format_summary_line(item)


def _format_items(items: list[Item], as_json: bool = False) -> str:
    """Format multiple items for display."""
    if _get_ids_output():
        ids = [_format_versioned_id(item) for item in items]
        return json.dumps(ids) if as_json else "\n".join(ids)

    if as_json:
        return json.dumps([
            {
                "id": item.id,
                "summary": item.summary,
                "tags": _filter_display_tags(item.tags),
                "score": item.score,
            }
            for item in items
        ], indent=2)

    if not items:
        return "No results."

    # Full format: YAML frontmatter with double-newline separator
    # Default: summary lines with single-newline separator
    if _get_full_output():
        return "\n\n".join(_format_yaml_frontmatter(item) for item in items)
    return "\n".join(_format_summary_line(item) for item in items)


def _get_keeper(store: Optional[Path], collection: str) -> Keeper:
    """Initialize memory, handling errors gracefully."""
    # Check global override from --store on main command
    actual_store = store if store is not None else _get_store_override()
    try:
        return Keeper(actual_store, collection=collection)
    except Exception as e:
        typer.echo(f"Error: {e}", err=True)
        raise typer.Exit(1)


def _parse_tags(tags: Optional[list[str]]) -> dict[str, str]:
    """Parse key=value tag list to dict."""
    if not tags:
        return {}
    parsed = {}
    for tag in tags:
        if "=" not in tag:
            typer.echo(f"Error: Invalid tag format '{tag}'. Use key=value", err=True)
            raise typer.Exit(1)
        k, v = tag.split("=", 1)
        parsed[k] = v
    return parsed


def _timestamp() -> str:
    """Generate timestamp for auto-generated IDs."""
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")


def _parse_frontmatter(text: str) -> tuple[str, dict[str, str]]:
    """Parse YAML frontmatter from text, return (content, tags)."""
    if text.startswith("---"):
        parts = text.split("---", 2)
        if len(parts) >= 3:
            import yaml
            frontmatter = yaml.safe_load(parts[1])
            content = parts[2].lstrip("\n")
            tags = frontmatter.get("tags", {}) if frontmatter else {}
            return content, {k: str(v) for k, v in tags.items()}
    return text, {}


# -----------------------------------------------------------------------------
# Commands
# -----------------------------------------------------------------------------

@app.command()
def find(
    query: Annotated[Optional[str], typer.Argument(help="Search query text")] = None,
    id: Annotated[Optional[str], typer.Option(
        "--id",
        help="Find items similar to this ID (instead of text search)"
    )] = None,
    include_self: Annotated[bool, typer.Option(
        help="Include the queried item (only with --id)"
    )] = False,
    store: StoreOption = None,
    collection: CollectionOption = "default",
    limit: LimitOption = 10,
    since: SinceOption = None,
):
    """
    Find items using semantic similarity search.

    \b
    Examples:
        keep find "authentication"              # Search by text
        keep find --id file:///path/to/doc.md   # Find similar to item
    """
    if id and query:
        typer.echo("Error: Specify either a query or --id, not both", err=True)
        raise typer.Exit(1)
    if not id and not query:
        typer.echo("Error: Specify a query or --id", err=True)
        raise typer.Exit(1)

    kp = _get_keeper(store, collection)

    if id:
        results = kp.find_similar(id, limit=limit, since=since, include_self=include_self)
    else:
        results = kp.find(query, limit=limit, since=since)

    typer.echo(_format_items(results, as_json=_get_json_output()))


@app.command()
def search(
    query: Annotated[str, typer.Argument(default=..., help="Full-text search query")],
    store: StoreOption = None,
    collection: CollectionOption = "default",
    limit: LimitOption = 10,
    since: SinceOption = None,
):
    """
    Search item summaries using full-text search.
    """
    kp = _get_keeper(store, collection)
    results = kp.query_fulltext(query, limit=limit, since=since)
    typer.echo(_format_items(results, as_json=_get_json_output()))


@app.command("list")
def list_recent(
    store: StoreOption = None,
    collection: CollectionOption = "default",
    limit: Annotated[int, typer.Option(
        "--limit", "-n",
        help="Number of items to show"
    )] = 10,
    tag: Annotated[Optional[list[str]], typer.Option(
        "--tag", "-t",
        help="Filter by tag (key or key=value, repeatable)"
    )] = None,
    tags: Annotated[Optional[str], typer.Option(
        "--tags", "-T",
        help="List tag keys (--tags=), or values for KEY (--tags=KEY)"
    )] = None,
    since: SinceOption = None,
):
    """
    List recent items, filter by tags, or list tag keys/values.

    \b
    Examples:
        keep list                      # Recent items
        keep list --tag foo            # Items with tag 'foo' (any value)
        keep list --tag foo=bar        # Items with tag foo=bar
        keep list --tag foo --tag bar  # Items with both tags
        keep list --tags=              # List all tag keys
        keep list --tags=foo           # List values for tag 'foo'
        keep list --since P3D          # Items updated in last 3 days
    """
    kp = _get_keeper(store, collection)

    # --tags mode: list keys or values
    if tags is not None:
        # Empty string means list all keys, otherwise list values for key
        key = tags if tags else None
        values = kp.list_tags(key, collection=collection)
        if _get_json_output():
            typer.echo(json.dumps(values))
        else:
            if not values:
                if key:
                    typer.echo(f"No values for tag '{key}'.")
                else:
                    typer.echo("No tags found.")
            else:
                for v in values:
                    typer.echo(v)
        return

    # --tag mode: filter items by tag(s)
    if tag:
        # Parse each tag as key or key=value
        # Multiple tags require all to match (AND)
        results = None
        for t in tag:
            if "=" in t:
                key, value = t.split("=", 1)
                matches = kp.query_tag(key, value, limit=limit, since=since, collection=collection)
            else:
                # Key only - find items with this tag key (any value)
                matches = kp.query_tag(t, limit=limit, since=since, collection=collection)

            if results is None:
                results = {item.id: item for item in matches}
            else:
                # Intersect with previous results
                match_ids = {item.id for item in matches}
                results = {id: item for id, item in results.items() if id in match_ids}

        items = list(results.values()) if results else []
        typer.echo(_format_items(items[:limit], as_json=_get_json_output()))
        return

    # Default: recent items
    results = kp.list_recent(limit=limit, since=since, collection=collection)
    typer.echo(_format_items(results, as_json=_get_json_output()))


@app.command("tag-update")
def tag_update(
    ids: Annotated[list[str], typer.Argument(default=..., help="Document IDs to tag")],
    tags: Annotated[Optional[list[str]], typer.Option(
        "--tag", "-t",
        help="Tag as key=value (empty value removes: key=)"
    )] = None,
    remove: Annotated[Optional[list[str]], typer.Option(
        "--remove", "-r",
        help="Tag keys to remove"
    )] = None,
    store: StoreOption = None,
    collection: CollectionOption = "default",
):
    """
    Add, update, or remove tags on existing documents.

    Does not re-process the document - only updates tags.

    \b
    Examples:
        keep tag-update doc:1 --tag project=myapp
        keep tag-update doc:1 doc:2 --tag status=reviewed
        keep tag-update doc:1 --remove obsolete_tag
        keep tag-update doc:1 --tag temp=  # Remove via empty value
    """
    kp = _get_keeper(store, collection)

    # Parse tags from key=value format
    tag_changes: dict[str, str] = {}
    if tags:
        for tag in tags:
            if "=" not in tag:
                typer.echo(f"Error: Invalid tag format '{tag}'. Use key=value (or key= to remove)", err=True)
                raise typer.Exit(1)
            k, v = tag.split("=", 1)
            tag_changes[k] = v  # Empty v means delete

    # Add explicit removals as empty strings
    if remove:
        for key in remove:
            tag_changes[key] = ""

    if not tag_changes:
        typer.echo("Error: Specify at least one --tag or --remove", err=True)
        raise typer.Exit(1)

    # Process each document
    results = []
    for doc_id in ids:
        item = kp.tag(doc_id, tags=tag_changes, collection=collection)
        if item is None:
            typer.echo(f"Not found: {doc_id}", err=True)
        else:
            results.append(item)

    if _get_json_output():
        typer.echo(_format_items(results, as_json=True))
    else:
        for item in results:
            typer.echo(_format_item(item, as_json=False))


@app.command()
def update(
    source: Annotated[Optional[str], typer.Argument(
        help="URI to fetch, text content, or '-' for stdin"
    )] = None,
    id: Annotated[Optional[str], typer.Option(
        "--id", "-i",
        help="Document ID (auto-generated for text/stdin modes)"
    )] = None,
    store: StoreOption = None,
    collection: CollectionOption = "default",
    tags: Annotated[Optional[list[str]], typer.Option(
        "--tag", "-t",
        help="Tag as key=value (can be repeated)"
    )] = None,
    summary: Annotated[Optional[str], typer.Option(
        "--summary",
        help="User-provided summary (skips auto-summarization)"
    )] = None,
    lazy: Annotated[bool, typer.Option(
        "--lazy",
        help="Fast mode: use truncated summary, queue for later processing"
    )] = False,
):
    """
    Add or update a document in the store.

    \b
    Three input modes (auto-detected):
      keep update file:///path       # URI mode: has ://
      keep update "my note"          # Text mode: content-addressed ID
      keep update -                  # Stdin mode: explicit -
      echo "pipe" | keep update      # Stdin mode: piped input

    \b
    Text mode uses content-addressed IDs for versioning:
      keep update "my note"           # Creates _text:{hash}
      keep update "my note" -t done   # Same ID, new version (tag change)
      keep update "different note"    # Different ID (new doc)
    """
    kp = _get_keeper(store, collection)
    parsed_tags = _parse_tags(tags)

    # Determine mode based on source content
    if source == "-" or (source is None and not sys.stdin.isatty()):
        # Stdin mode: explicit '-' or piped input
        content = sys.stdin.read()
        content, frontmatter_tags = _parse_frontmatter(content)
        parsed_tags = {**frontmatter_tags, **parsed_tags}  # CLI tags override
        # Use content-addressed ID for stdin text (enables versioning)
        doc_id = id or _text_content_id(content)
        item = kp.remember(content, id=doc_id, summary=summary, tags=parsed_tags or None, lazy=lazy)
    elif source and _URI_SCHEME_PATTERN.match(source):
        # URI mode: fetch from URI (ID is the URI itself)
        item = kp.update(source, tags=parsed_tags or None, summary=summary, lazy=lazy)
    elif source:
        # Text mode: inline content (no :// in source)
        # Use content-addressed ID for text (enables versioning)
        doc_id = id or _text_content_id(source)
        item = kp.remember(source, id=doc_id, summary=summary, tags=parsed_tags or None, lazy=lazy)
    else:
        typer.echo("Error: Provide content, URI, or '-' for stdin", err=True)
        raise typer.Exit(1)

    typer.echo(_format_item(item, as_json=_get_json_output()))


@app.command()
def now(
    content: Annotated[Optional[str], typer.Argument(
        help="Content to set (omit to show current)"
    )] = None,
    file: Annotated[Optional[Path], typer.Option(
        "--file", "-f",
        help="Read content from file"
    )] = None,
    reset: Annotated[bool, typer.Option(
        "--reset",
        help="Reset to default from system"
    )] = False,
    version: Annotated[Optional[int], typer.Option(
        "--version", "-V",
        help="Get specific version (0=current, 1=previous, etc.)"
    )] = None,
    history: Annotated[bool, typer.Option(
        "--history", "-H",
        help="List all versions"
    )] = False,
    store: StoreOption = None,
    collection: CollectionOption = "default",
    tags: Annotated[Optional[list[str]], typer.Option(
        "--tag", "-t",
        help="Tag as key=value (can be repeated)"
    )] = None,
):
    """
    Get or set the current working context.

    With no arguments, displays the current context.
    With content, replaces it.

    \b
    Examples:
        keep now                         # Show current context
        keep now "What's important now"  # Update context
        keep now -f context.md           # Read content from file
        keep now --reset                 # Reset to default from system
        keep now -V 1                    # Previous version
        keep now --history               # List all versions
    """
    from .api import NOWDOC_ID

    kp = _get_keeper(store, collection)

    # Handle history listing
    if history:
        versions = kp.list_versions(NOWDOC_ID, limit=50, collection=collection)
        current = kp.get(NOWDOC_ID, collection=collection)

        if _get_ids_output():
            # Output version identifiers, one per line
            if current:
                typer.echo(f"{NOWDOC_ID}@V{{0}}")
            for i in range(1, len(versions) + 1):
                typer.echo(f"{NOWDOC_ID}@V{{{i}}}")
        elif _get_json_output():
            result = {
                "id": NOWDOC_ID,
                "current": {
                    "summary": current.summary if current else None,
                    "offset": 0,
                    "vid": f"{NOWDOC_ID}@V{{0}}",
                } if current else None,
                "versions": [
                    {
                        "offset": i + 1,
                        "vid": f"{NOWDOC_ID}@V{{{i + 1}}}",
                        "version": v.version,
                        "summary": v.summary[:60],
                        "created_at": v.created_at,
                    }
                    for i, v in enumerate(versions)
                ],
            }
            typer.echo(json.dumps(result, indent=2))
        else:
            if current:
                summary_preview = current.summary[:60].replace("\n", " ")
                if len(current.summary) > 60:
                    summary_preview += "..."
                typer.echo(f"v0 (current): {summary_preview}")
            if versions:
                typer.echo(f"\nArchived:")
                for i, v in enumerate(versions, start=1):
                    date_part = v.created_at[:10] if v.created_at else "unknown"
                    summary_preview = v.summary[:50].replace("\n", " ")
                    if len(v.summary) > 50:
                        summary_preview += "..."
                    typer.echo(f"  v{i} ({date_part}): {summary_preview}")
            else:
                typer.echo("No version history.")
        return

    # Handle version retrieval
    if version is not None:
        offset = version
        if offset == 0:
            item = kp.get_now()
            internal_version = None
        else:
            item = kp.get_version(NOWDOC_ID, offset, collection=collection)
            # Get internal version number for API call
            versions = kp.list_versions(NOWDOC_ID, limit=1, collection=collection)
            if versions:
                internal_version = versions[0].version - (offset - 1)
            else:
                internal_version = None

        if item is None:
            typer.echo(f"Version not found (offset {offset})", err=True)
            raise typer.Exit(1)

        version_nav = kp.get_version_nav(NOWDOC_ID, internal_version, collection=collection)
        typer.echo(_format_item(
            item,
            as_json=_get_json_output(),
            version_nav=version_nav,
            viewing_offset=offset if offset > 0 else None,
        ))
        return

    # Determine if we're getting or setting
    setting = content is not None or file is not None or reset

    if setting:
        if reset:
            # Reset to default from system (delete first to clear old tags)
            from .api import _load_frontmatter, SYSTEM_DOC_DIR
            kp.delete(NOWDOC_ID)
            try:
                new_content, default_tags = _load_frontmatter(SYSTEM_DOC_DIR / "now.md")
                parsed_tags = default_tags
            except FileNotFoundError:
                typer.echo("Error: Builtin now.md not found", err=True)
                raise typer.Exit(1)
        elif file is not None:
            if not file.exists():
                typer.echo(f"Error: File not found: {file}", err=True)
                raise typer.Exit(1)
            new_content = file.read_text()
            parsed_tags = {}
        else:
            new_content = content
            parsed_tags = {}

        # Parse user-provided tags (merge with default if reset)
        if tags:
            for tag in tags:
                if "=" not in tag:
                    typer.echo(f"Error: Invalid tag format '{tag}'. Use key=value", err=True)
                    raise typer.Exit(1)
                k, v = tag.split("=", 1)
                parsed_tags[k] = v

        item = kp.set_now(new_content, tags=parsed_tags or None)
        typer.echo(_format_item(item, as_json=_get_json_output()))
    else:
        # Get current context with version navigation and similar items
        item = kp.get_now()
        version_nav = kp.get_version_nav(NOWDOC_ID, None, collection=collection)
        similar_items = kp.get_similar_for_display(NOWDOC_ID, limit=3, collection=collection)
        similar_offsets = {s.id: kp.get_version_offset(s) for s in similar_items}
        typer.echo(_format_item(
            item,
            as_json=_get_json_output(),
            version_nav=version_nav,
            similar_items=similar_items,
            similar_offsets=similar_offsets,
        ))


@app.command()
def get(
    id: Annotated[str, typer.Argument(default=..., help="URI of item (append @V{N} for version)")],
    version: Annotated[Optional[int], typer.Option(
        "--version", "-V",
        help="Get specific version (0=current, 1=previous, etc.)"
    )] = None,
    history: Annotated[bool, typer.Option(
        "--history", "-H",
        help="List all versions"
    )] = False,
    similar: Annotated[bool, typer.Option(
        "--similar", "-S",
        help="List similar items"
    )] = False,
    no_similar: Annotated[bool, typer.Option(
        "--no-similar",
        help="Suppress similar items in output"
    )] = False,
    limit: Annotated[int, typer.Option(
        "--limit", "-n",
        help="Max items for --history or --similar (default: 10)"
    )] = 10,
    store: StoreOption = None,
    collection: CollectionOption = "default",
):
    """
    Retrieve a specific item by ID.

    Version identifiers: Append @V{N} to get a specific version.

    \b
    Examples:
        keep get doc:1                  # Current version with similar items
        keep get doc:1 -V 1             # Previous version with prev/next nav
        keep get "doc:1@V{1}"           # Same as -V 1
        keep get doc:1 --history        # List all versions
        keep get doc:1 --similar        # List similar items
        keep get doc:1 --no-similar     # Suppress similar items
    """
    kp = _get_keeper(store, collection)

    # Parse @V{N} version identifier from ID (security: check literal first)
    actual_id = id
    version_from_id = None

    if kp.exists(id, collection=collection):
        # Literal ID exists - use it directly (prevents confusion attacks)
        actual_id = id
    else:
        # Try parsing @V{N} suffix
        match = VERSION_SUFFIX_PATTERN.search(id)
        if match:
            version_from_id = int(match.group(1))
            actual_id = id[:match.start()]

    # Version from ID only applies if --version not explicitly provided
    if version is None and version_from_id is not None:
        version = version_from_id

    if history:
        # List all versions
        versions = kp.list_versions(actual_id, limit=limit, collection=collection)
        current = kp.get(actual_id, collection=collection)

        if _get_ids_output():
            # Output version identifiers, one per line
            if current:
                typer.echo(f"{actual_id}@V{{0}}")
            for i in range(1, len(versions) + 1):
                typer.echo(f"{actual_id}@V{{{i}}}")
        elif _get_json_output():
            result = {
                "id": actual_id,
                "current": {
                    "summary": current.summary if current else None,
                    "tags": current.tags if current else {},
                    "offset": 0,
                    "vid": f"{actual_id}@V{{0}}",
                } if current else None,
                "versions": [
                    {
                        "offset": i + 1,
                        "vid": f"{actual_id}@V{{{i + 1}}}",
                        "version": v.version,
                        "summary": v.summary,
                        "created_at": v.created_at,
                    }
                    for i, v in enumerate(versions)
                ],
            }
            typer.echo(json.dumps(result, indent=2))
        else:
            if current:
                summary_preview = current.summary[:60].replace("\n", " ")
                if len(current.summary) > 60:
                    summary_preview += "..."
                typer.echo(f"v0 (current): {summary_preview}")
            if versions:
                typer.echo(f"\nArchived:")
                for i, v in enumerate(versions, start=1):
                    date_part = v.created_at[:10] if v.created_at else "unknown"
                    summary_preview = v.summary[:50].replace("\n", " ")
                    if len(v.summary) > 50:
                        summary_preview += "..."
                    typer.echo(f"  v{i} ({date_part}): {summary_preview}")
            else:
                typer.echo("No version history.")
        return

    if similar:
        # List similar items
        similar_items = kp.get_similar_for_display(actual_id, limit=limit, collection=collection)
        similar_offsets = {s.id: kp.get_version_offset(s) for s in similar_items}

        if _get_ids_output():
            # Output version-scoped IDs one per line
            for item in similar_items:
                base_id = item.tags.get("_base_id", item.id)
                offset = similar_offsets.get(item.id, 0)
                typer.echo(f"{base_id}@V{{{offset}}}")
        elif _get_json_output():
            result = {
                "id": actual_id,
                "similar": [
                    {
                        "id": f"{item.tags.get('_base_id', item.id)}@V{{{similar_offsets.get(item.id, 0)}}}",
                        "score": item.score,
                        "date": item.tags.get("_updated", item.tags.get("_created", ""))[:10],
                        "summary": item.summary[:60],
                    }
                    for item in similar_items
                ],
            }
            typer.echo(json.dumps(result, indent=2))
        else:
            typer.echo(f"Similar to {actual_id}:")
            if similar_items:
                for item in similar_items:
                    base_id = item.tags.get("_base_id", item.id)
                    offset = similar_offsets.get(item.id, 0)
                    score_str = f"({item.score:.2f})" if item.score else ""
                    date_part = item.tags.get("_updated", item.tags.get("_created", ""))[:10]
                    summary_preview = item.summary[:50].replace("\n", " ")
                    if len(item.summary) > 50:
                        summary_preview += "..."
                    typer.echo(f"  {base_id}@V{{{offset}}} {score_str} {date_part} {summary_preview}")
            else:
                typer.echo("  No similar items found.")
        return

    # Get specific version or current
    offset = version if version is not None else 0

    if offset == 0:
        item = kp.get(actual_id, collection=collection)
        internal_version = None
    else:
        item = kp.get_version(actual_id, offset, collection=collection)
        # Calculate internal version number for API call
        versions = kp.list_versions(actual_id, limit=1, collection=collection)
        if versions:
            internal_version = versions[0].version - (offset - 1)
        else:
            internal_version = None

    if item is None:
        if offset > 0:
            typer.echo(f"Version not found: {actual_id} (offset {offset})", err=True)
        else:
            typer.echo(f"Not found: {actual_id}", err=True)
        raise typer.Exit(1)

    # Get version navigation
    version_nav = kp.get_version_nav(actual_id, internal_version, collection=collection)

    # Get similar items (unless suppressed or viewing old version)
    similar_items = None
    similar_offsets = None
    if not no_similar and offset == 0:
        similar_items = kp.get_similar_for_display(actual_id, limit=3, collection=collection)
        similar_offsets = {s.id: kp.get_version_offset(s) for s in similar_items}

    typer.echo(_format_item(
        item,
        as_json=_get_json_output(),
        version_nav=version_nav,
        viewing_offset=offset if offset > 0 else None,
        similar_items=similar_items,
        similar_offsets=similar_offsets,
    ))


@app.command("collections")
def list_collections(
    store: StoreOption = None,
):
    """
    List all collections in the store.
    """
    kp = _get_keeper(store, "default")
    collections = kp.list_collections()

    if _get_json_output():
        typer.echo(json.dumps(collections))
    else:
        if not collections:
            typer.echo("No collections.")
        else:
            for c in collections:
                typer.echo(c)


@app.command()
def init(
    reset_system_docs: Annotated[bool, typer.Option(
        "--reset-system-docs",
        help="Force reload system documents from bundled content (overwrites modifications)"
    )] = False,
    store: StoreOption = None,
    collection: CollectionOption = "default",
):
    """
    Initialize or verify the store is ready.
    """
    kp = _get_keeper(store, collection)

    # Handle reset if requested
    if reset_system_docs:
        stats = kp.reset_system_documents()
        typer.echo(f"Reset {stats['reset']} system documents")

    # Show config and store paths
    config = kp._config
    config_path = config.config_path if config else None
    store_path = kp._store_path

    # Show paths
    typer.echo(f"Config: {config_path}")
    if config and config.config_dir and config.config_dir.resolve() != store_path.resolve():
        typer.echo(f"Store:  {store_path}")

    typer.echo(f"Collections: {kp.list_collections()}")

    # Show detected providers
    if config:
        typer.echo(f"\nProviders:")
        typer.echo(f"  Embedding: {config.embedding.name}")
        typer.echo(f"  Summarization: {config.summarization.name}")



@app.command()
def config(
    store: StoreOption = None,
):
    """
    Show current configuration and store location.
    """
    kp = _get_keeper(store, "default")

    cfg = kp._config
    config_path = cfg.config_path if cfg else None
    store_path = kp._store_path

    if _get_json_output():
        result = {
            "store": str(store_path),
            "config": str(config_path) if config_path else None,
            "collections": kp.list_collections(),
        }
        if cfg:
            result["embedding"] = cfg.embedding.name
            result["summarization"] = cfg.summarization.name
        typer.echo(json.dumps(result, indent=2))
    else:
        # Show paths
        typer.echo(f"Config: {config_path}")
        if cfg and cfg.config_dir and cfg.config_dir.resolve() != store_path.resolve():
            typer.echo(f"Store:  {store_path}")

        typer.echo(f"Collections: {kp.list_collections()}")

        if cfg:
            typer.echo(f"\nProviders:")
            typer.echo(f"  Embedding: {cfg.embedding.name}")
            typer.echo(f"  Summarization: {cfg.summarization.name}")


@app.command("process-pending")
def process_pending(
    store: StoreOption = None,
    limit: Annotated[int, typer.Option(
        "--limit", "-n",
        help="Maximum items to process in this batch"
    )] = 10,
    all_items: Annotated[bool, typer.Option(
        "--all", "-a",
        help="Process all pending items (ignores --limit)"
    )] = False,
    daemon: Annotated[bool, typer.Option(
        "--daemon",
        hidden=True,
        help="Run as background daemon (used internally)"
    )] = False,
):
    """
    Process pending summaries from lazy indexing.

    Items indexed with --lazy use a truncated placeholder summary.
    This command generates real summaries for those items.
    """
    kp = _get_keeper(store, "default")

    # Daemon mode: write PID, process all, remove PID, exit silently
    if daemon:
        import signal

        pid_path = kp._processor_pid_path
        shutdown_requested = False

        def handle_signal(signum, frame):
            nonlocal shutdown_requested
            shutdown_requested = True

        # Handle common termination signals gracefully
        signal.signal(signal.SIGTERM, handle_signal)
        signal.signal(signal.SIGINT, handle_signal)

        try:
            # Write PID file
            pid_path.write_text(str(os.getpid()))

            # Process all items until queue empty or shutdown requested
            while not shutdown_requested:
                processed = kp.process_pending(limit=50)
                if processed == 0:
                    break

        finally:
            # Clean up PID file
            try:
                pid_path.unlink()
            except OSError:
                pass
            # Close resources
            kp.close()
        return

    # Interactive mode
    pending_before = kp.pending_count()

    if pending_before == 0:
        if _get_json_output():
            typer.echo(json.dumps({"processed": 0, "remaining": 0}))
        else:
            typer.echo("No pending summaries.")
        return

    if all_items:
        # Process all items in batches
        total_processed = 0
        while True:
            processed = kp.process_pending(limit=50)
            total_processed += processed
            if processed == 0:
                break
            if not _get_json_output():
                typer.echo(f"  Processed {total_processed}...")

        remaining = kp.pending_count()
        if _get_json_output():
            typer.echo(json.dumps({
                "processed": total_processed,
                "remaining": remaining
            }))
        else:
            typer.echo(f"✓ Processed {total_processed} items, {remaining} remaining")
    else:
        # Process limited batch
        processed = kp.process_pending(limit=limit)
        remaining = kp.pending_count()

        if _get_json_output():
            typer.echo(json.dumps({
                "processed": processed,
                "remaining": remaining
            }))
        else:
            typer.echo(f"✓ Processed {processed} items, {remaining} remaining")


# -----------------------------------------------------------------------------
# Entry point
# -----------------------------------------------------------------------------

def main():
    try:
        app()
    except SystemExit:
        raise  # Let typer handle exit codes
    except KeyboardInterrupt:
        raise SystemExit(130)  # Standard exit code for Ctrl+C
    except Exception as e:
        # Log full traceback to file, show clean message to user
        from .errors import log_exception, ERROR_LOG_PATH
        log_exception(e, context="keep CLI")
        typer.echo(f"Error: {e}", err=True)
        typer.echo(f"Details logged to {ERROR_LOG_PATH}", err=True)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
