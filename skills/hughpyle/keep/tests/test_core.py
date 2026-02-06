"""
Test harness for keep.

Sample documents in docs/library/:
- an5.57: Upajjhāyasutta (Five Remembrances) - English JSON
- fortytwo_chapters: 佛說四十二章經 (Sutra in 42 Sections) - Chinese text
- ancrenewisse: Ancrene Wisse (Anchoresses' Guide) - PDF
- mumford_sticks_and_stones: Lewis Mumford on American architecture - English text

These represent diverse content: languages, formats, traditions.
Test data files are discovered dynamically to support adding more.
"""

import pytest
from pathlib import Path

from keep import (
    Item,
    filter_non_system_tags,
    SYSTEM_TAG_PREFIX,
)
from keep.types import Item


# -----------------------------------------------------------------------------
# Fixtures
# -----------------------------------------------------------------------------

@pytest.fixture
def data_dir() -> Path:
    """Path to test data directory."""
    return Path(__file__).parent.parent / "docs" / "library"


@pytest.fixture
def an5_57_path(data_dir: Path) -> Path:
    """Upajjhāyasutta (Five Remembrances) - English JSON."""
    return data_dir / "an5.57_translation-en-sujato.json"


@pytest.fixture
def fortytwo_chapters_path(data_dir: Path) -> Path:
    """Sutra in 42 Sections - Chinese text."""
    return data_dir / "fortytwo_chapters.txt"


@pytest.fixture
def mumford_path(data_dir: Path) -> Path:
    """Sticks and Stones - English text."""
    return data_dir / "mumford_sticks_and_stones.txt"


@pytest.fixture
def ancrenewisse_path(data_dir: Path) -> Path:
    """Ancrene Wisse - PDF."""
    return data_dir / "ancrenewisse.pdf"


# -----------------------------------------------------------------------------
# Item Tests
# -----------------------------------------------------------------------------

class TestItem:
    """Tests for Item dataclass."""
    
    def test_item_creation_minimal(self):
        """Item can be created with just id and summary."""
        item = Item(id="test:1", summary="A test item")
        assert item.id == "test:1"
        assert item.summary == "A test item"
        assert item.tags == {}
        assert item.score is None
    
    def test_item_timestamps_from_tags(self):
        """Timestamps are accessed via properties from tags."""
        item = Item(
            id="test:2",
            summary="Test",
            tags={
                "_created": "2026-01-30T10:00:00Z",
                "_updated": "2026-01-30T11:00:00Z",
            }
        )
        assert item.created == "2026-01-30T10:00:00Z"
        assert item.updated == "2026-01-30T11:00:00Z"
    
    def test_item_timestamps_missing(self):
        """Timestamp properties return None if tags missing."""
        item = Item(id="test:3", summary="Test")
        assert item.created is None
        assert item.updated is None
    
    def test_item_with_score(self):
        """Item can have a similarity score (search results)."""
        item = Item(id="test:4", summary="Test", score=0.95)
        assert item.score == 0.95
    
    def test_item_str(self):
        """Item string representation is readable."""
        item = Item(id="test:5", summary="A" * 100)
        s = str(item)
        assert "test:5" in s
        assert "..." in s  # Truncated


# -----------------------------------------------------------------------------
# System Tag Protection Tests
# -----------------------------------------------------------------------------

class TestSystemTagProtection:
    """Tests for system tag filtering."""
    
    def test_filter_removes_system_tags(self):
        """filter_non_system_tags removes underscore-prefixed tags."""
        tags = {
            "project": "myapp",
            "category": "docs",
            "_created": "2026-01-30T10:00:00Z",
            "_sneaky": "should be removed",
        }
        filtered = filter_non_system_tags(tags)
        
        assert "project" in filtered
        assert "category" in filtered
        assert "_created" not in filtered
        assert "_sneaky" not in filtered
    
    def test_filter_preserves_non_system_tags(self):
        """filter_non_system_tags preserves regular tags."""
        tags = {"a": "1", "b": "2", "c": "3"}
        filtered = filter_non_system_tags(tags)
        assert filtered == tags
    
    def test_filter_empty_dict(self):
        """filter_non_system_tags handles empty dict."""
        assert filter_non_system_tags({}) == {}
    
    def test_filter_all_system_tags(self):
        """filter_non_system_tags can return empty dict."""
        tags = {"_a": "1", "_b": "2"}
        assert filter_non_system_tags(tags) == {}
    
    def test_system_tag_prefix(self):
        """SYSTEM_TAG_PREFIX is underscore."""
        assert SYSTEM_TAG_PREFIX == "_"


# -----------------------------------------------------------------------------
# Test Data Validation
# -----------------------------------------------------------------------------

class TestDataFiles:
    """Verify test data files are present and readable.

    Uses dynamic discovery to ensure all files in docs/library/ are tested.
    """

    def test_all_data_files_exist(self, data_dir: Path):
        """All test data files (non-README) exist and are readable."""
        files = list(data_dir.glob("*"))
        data_files = [f for f in files if f.is_file() and f.name != "INDEX.md"]

        assert len(data_files) >= 4, f"Expected at least 4 data files, found {len(data_files)}"

        for f in data_files:
            assert f.exists(), f"File {f.name} should exist"
            assert f.stat().st_size > 0, f"File {f.name} should not be empty"

    def test_all_text_files_readable(self, data_dir: Path):
        """All .txt files are readable as UTF-8."""
        for txt_file in data_dir.glob("*.txt"):
            content = txt_file.read_text(encoding="utf-8")
            assert len(content) > 100, f"{txt_file.name} should have substantial content"

    def test_all_json_files_valid(self, data_dir: Path):
        """All .json files are valid JSON."""
        import json
        for json_file in data_dir.glob("*.json"):
            data = json.loads(json_file.read_text())
            assert isinstance(data, (dict, list)), f"{json_file.name} should parse as dict or list"

    def test_all_pdf_files_valid(self, data_dir: Path):
        """All .pdf files have valid PDF header."""
        for pdf_file in data_dir.glob("*.pdf"):
            content = pdf_file.read_bytes()
            assert content.startswith(b"%PDF"), f"{pdf_file.name} should be a valid PDF"

    # Specific content tests for known files

    def test_an5_57_content(self, an5_57_path: Path):
        """Upajjhāyasutta (Five Remembrances) contains expected content."""
        import json
        data = json.loads(an5_57_path.read_text())
        assert "an5.57:0.3" in data
        assert "Reviewing" in data["an5.57:0.3"]

    def test_fortytwo_chapters_content(self, fortytwo_chapters_path: Path):
        """Sutra of Forty-Two Chapters contains Chinese text."""
        content = fortytwo_chapters_path.read_text()
        assert "佛" in content  # Buddha
        assert "沙門" in content  # śramaṇa

    def test_ancrenewisse_is_pdf(self, ancrenewisse_path: Path):
        """Ancrene Wisse is a valid PDF."""
        content = ancrenewisse_path.read_bytes()
        assert content.startswith(b"%PDF")

    def test_mumford_content(self, mumford_path: Path):
        """Mumford text contains expected content."""
        content = mumford_path.read_text()
        assert "architecture" in content.lower()
        assert "medieval" in content.lower()


# -----------------------------------------------------------------------------
# Visibility Pattern Tests  
# -----------------------------------------------------------------------------

class TestVisibilityPatterns:
    """Tests for visibility tagging conventions."""
    
    def test_draft_visibility(self):
        """Draft items have _visibility=draft."""
        item = Item(
            id="draft:1",
            summary="Work in progress",
            tags={"_visibility": "draft", "_for": "self"}
        )
        assert item.tags["_visibility"] == "draft"
        assert item.tags["_for"] == "self"
    
    def test_shared_visibility(self):
        """Shared items have _visibility=shared."""
        item = Item(
            id="shared:1", 
            summary="Ready to share",
            tags={"_visibility": "shared", "_for": "team", "_reviewed": "true"}
        )
        assert item.tags["_visibility"] == "shared"
        assert item.tags["_reviewed"] == "true"


# -----------------------------------------------------------------------------
# Nowdoc Tests
# -----------------------------------------------------------------------------

class TestNowdoc:
    """Tests for nowdoc constants and system content."""

    def test_nowdoc_id_constant(self):
        """NOWDOC_ID is exported and has expected format."""
        from keep import NOWDOC_ID

        assert NOWDOC_ID == "_now:default"
        assert NOWDOC_ID.startswith("_")  # System-managed ID

    def test_system_now_md_exists(self):
        """System now.md file exists in keep/data/system/ with frontmatter."""
        from keep.api import _load_frontmatter, SYSTEM_DOC_DIR

        content, tags = _load_frontmatter(SYSTEM_DOC_DIR / "now.md")
        assert "# Now" in content
        assert "keep find" in content
        assert "keep update" in content
        # Frontmatter should be parsed into tags
        assert isinstance(tags, dict)
        assert len(tags) > 0  # Has at least one tag from frontmatter

    def test_load_frontmatter_missing_file(self):
        """_load_frontmatter raises FileNotFoundError for missing files."""
        from keep.api import _load_frontmatter, SYSTEM_DOC_DIR
        import pytest

        with pytest.raises(FileNotFoundError):
            _load_frontmatter(SYSTEM_DOC_DIR / "nonexistent.md")
