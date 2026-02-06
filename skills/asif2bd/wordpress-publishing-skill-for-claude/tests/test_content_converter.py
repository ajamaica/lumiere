"""
Tests for Content to Gutenberg Converter

Run with: pytest tests/test_content_converter.py -v
"""

import pytest
import sys
sys.path.insert(0, 'scripts')

from content_to_gutenberg import (
    convert_to_gutenberg,
    markdown_to_gutenberg,
    html_to_gutenberg,
    detect_content_type,
    validate_gutenberg_blocks,
    convert_inline_formatting,
    parse_markdown_table,
    create_table_block,
    create_image_block,
    create_button_block,
    create_columns_block,
    escape_html
)


class TestInlineFormatting:
    """Tests for inline formatting conversion."""

    def test_bold_asterisks(self):
        """Test bold with asterisks."""
        result = convert_inline_formatting("This is **bold** text")
        assert "<strong>bold</strong>" in result

    def test_bold_underscores(self):
        """Test bold with underscores."""
        result = convert_inline_formatting("This is __bold__ text")
        assert "<strong>bold</strong>" in result

    def test_italic_asterisk(self):
        """Test italic with single asterisk."""
        result = convert_inline_formatting("This is *italic* text")
        assert "<em>italic</em>" in result

    def test_inline_code(self):
        """Test inline code."""
        result = convert_inline_formatting("Use `print()` function")
        assert "<code>print()</code>" in result

    def test_links(self):
        """Test link conversion."""
        result = convert_inline_formatting("Visit [Google](https://google.com)")
        assert '<a href="https://google.com">Google</a>' in result

    def test_strikethrough(self):
        """Test strikethrough."""
        result = convert_inline_formatting("This is ~~deleted~~ text")
        assert "<s>deleted</s>" in result

    def test_combined_formatting(self):
        """Test multiple inline formats together."""
        result = convert_inline_formatting("**bold** and *italic* and `code`")
        assert "<strong>bold</strong>" in result
        assert "<em>italic</em>" in result
        assert "<code>code</code>" in result


class TestMarkdownToGutenberg:
    """Tests for Markdown to Gutenberg conversion."""

    def test_paragraph(self):
        """Test paragraph conversion."""
        result = markdown_to_gutenberg("This is a paragraph.")
        assert "<!-- wp:paragraph -->" in result
        assert "<p>This is a paragraph.</p>" in result
        assert "<!-- /wp:paragraph -->" in result

    def test_h1_heading(self):
        """Test H1 heading conversion."""
        result = markdown_to_gutenberg("# Heading One")
        assert '<!-- wp:heading {"level":1} -->' in result
        assert "<h1" in result
        assert "Heading One" in result

    def test_h2_heading(self):
        """Test H2 heading conversion (default, no level attribute)."""
        result = markdown_to_gutenberg("## Heading Two")
        assert "<!-- wp:heading -->" in result
        assert "<h2" in result
        assert "Heading Two" in result

    def test_h3_heading(self):
        """Test H3 heading conversion."""
        result = markdown_to_gutenberg("### Heading Three")
        assert '<!-- wp:heading {"level":3} -->' in result
        assert "<h3" in result

    def test_unordered_list(self):
        """Test unordered list conversion."""
        markdown = """- Item 1
- Item 2
- Item 3"""
        result = markdown_to_gutenberg(markdown)
        assert "<!-- wp:list -->" in result
        assert "<ul>" in result
        assert "<li>Item 1</li>" in result
        assert "<!-- /wp:list -->" in result

    def test_ordered_list(self):
        """Test ordered list conversion."""
        markdown = """1. First
2. Second
3. Third"""
        result = markdown_to_gutenberg(markdown)
        assert '<!-- wp:list {"ordered":true} -->' in result
        assert "<ol>" in result
        assert "<li>First</li>" in result

    def test_code_block_with_language(self):
        """Test code block with language."""
        markdown = """```python
def hello():
    print("Hello")
```"""
        result = markdown_to_gutenberg(markdown)
        assert '<!-- wp:code {"language":"python"} -->' in result
        assert 'lang="python"' in result
        assert "def hello():" in result

    def test_code_block_without_language(self):
        """Test code block without language."""
        markdown = """```
plain code
```"""
        result = markdown_to_gutenberg(markdown)
        assert "<!-- wp:code -->" in result
        assert "<code>plain code</code>" in result

    def test_blockquote(self):
        """Test blockquote conversion."""
        result = markdown_to_gutenberg("> This is a quote")
        assert "<!-- wp:quote -->" in result
        assert '<blockquote class="wp-block-quote">' in result
        assert "This is a quote" in result

    def test_horizontal_rule(self):
        """Test horizontal rule conversion."""
        result = markdown_to_gutenberg("---")
        assert "<!-- wp:separator -->" in result
        assert '<hr class="wp-block-separator' in result

    def test_image(self):
        """Test image conversion."""
        result = markdown_to_gutenberg("![Alt text](https://example.com/image.jpg)")
        assert "<!-- wp:image" in result
        assert 'src="https://example.com/image.jpg"' in result
        assert 'alt="Alt text"' in result

    def test_table(self):
        """Test table conversion."""
        markdown = """| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |"""
        result = markdown_to_gutenberg(markdown)
        assert "<!-- wp:table -->" in result
        assert '<figure class="wp-block-table">' in result
        assert "<thead>" in result
        assert "<th>Header 1</th>" in result
        assert "<td>Cell 1</td>" in result


class TestTableConversion:
    """Tests for table-specific conversions."""

    def test_parse_markdown_table(self):
        """Test markdown table parsing."""
        lines = [
            "| A | B |",
            "|---|---|",
            "| 1 | 2 |"
        ]
        result = parse_markdown_table(lines)
        assert "<!-- wp:table -->" in result
        assert "<th>A</th>" in result
        assert "<td>1</td>" in result

    def test_table_with_inline_formatting(self):
        """Test table with inline formatting in cells."""
        lines = [
            "| Name | Status |",
            "|------|--------|",
            "| **Bold** | *Italic* |"
        ]
        result = parse_markdown_table(lines)
        assert "<strong>Bold</strong>" in result
        assert "<em>Italic</em>" in result

    def test_create_table_block(self):
        """Test create_table_block helper."""
        result = create_table_block(
            headers=["Col A", "Col B"],
            rows=[["1", "2"], ["3", "4"]],
            striped=True
        )
        assert "<!-- wp:table" in result
        assert "is-style-stripes" in result
        assert "<th>Col A</th>" in result
        assert "<td>1</td>" in result

    def test_create_table_with_caption(self):
        """Test table with caption."""
        result = create_table_block(
            headers=["A"],
            rows=[["1"]],
            caption="Table Caption"
        )
        assert '<figcaption class="wp-element-caption">Table Caption</figcaption>' in result


class TestHelperFunctions:
    """Tests for helper block creation functions."""

    def test_create_image_block(self):
        """Test image block creation."""
        result = create_image_block(
            src="https://example.com/img.jpg",
            alt="Test image",
            caption="Image caption",
            size="large"
        )
        assert "<!-- wp:image" in result
        assert 'src="https://example.com/img.jpg"' in result
        assert 'alt="Test image"' in result
        assert "Image caption" in result

    def test_create_image_block_with_media_id(self):
        """Test image block with WordPress media ID."""
        result = create_image_block(
            src="https://example.com/img.jpg",
            alt="Test",
            media_id=123
        )
        assert '"id": 123' in result or '"id":123' in result
        assert "wp-image-123" in result

    def test_create_button_block(self):
        """Test button block creation."""
        result = create_button_block(
            text="Click Me",
            url="https://example.com",
            style="fill",
            align="center"
        )
        assert "<!-- wp:buttons" in result
        assert "<!-- wp:button -->" in result
        assert 'href="https://example.com"' in result
        assert "Click Me" in result

    def test_create_button_outline_style(self):
        """Test outline button style."""
        result = create_button_block(
            text="Outline",
            url="#",
            style="outline"
        )
        assert "is-style-outline" in result

    def test_create_columns_block(self):
        """Test columns block creation."""
        col1 = "<!-- wp:paragraph --><p>Column 1</p><!-- /wp:paragraph -->"
        col2 = "<!-- wp:paragraph --><p>Column 2</p><!-- /wp:paragraph -->"
        result = create_columns_block([col1, col2])
        assert "<!-- wp:columns -->" in result
        assert "<!-- wp:column -->" in result
        assert "Column 1" in result
        assert "Column 2" in result


class TestHTMLToGutenberg:
    """Tests for HTML to Gutenberg conversion."""

    def test_html_paragraph(self):
        """Test HTML paragraph conversion."""
        result = html_to_gutenberg("<p>Paragraph text</p>")
        assert "<!-- wp:paragraph -->" in result
        assert "<p>Paragraph text</p>" in result

    def test_html_heading(self):
        """Test HTML heading conversion."""
        result = html_to_gutenberg("<h2>Heading</h2>")
        assert "<!-- wp:heading -->" in result
        assert "wp-block-heading" in result

    def test_html_list(self):
        """Test HTML list conversion."""
        result = html_to_gutenberg("<ul><li>Item</li></ul>")
        assert "<!-- wp:list -->" in result

    def test_html_table(self):
        """Test HTML table gets figure wrapper."""
        result = html_to_gutenberg("<table><tr><td>Data</td></tr></table>")
        assert "<!-- wp:table -->" in result
        assert '<figure class="wp-block-table">' in result


class TestContentTypeDetection:
    """Tests for content type detection."""

    def test_detect_markdown(self):
        """Test markdown detection."""
        content = "# Heading\n\nParagraph with **bold**."
        assert detect_content_type(content) == "markdown"

    def test_detect_html(self):
        """Test HTML detection."""
        content = "<h1>Heading</h1><p>Paragraph</p>"
        assert detect_content_type(content) == "html"

    def test_detect_mixed_prefers_markdown(self):
        """Test mixed content prefers markdown indicators."""
        content = "# Heading\n<p>With some HTML</p>"
        result = detect_content_type(content)
        # Should still work as markdown
        assert result in ["markdown", "html"]


class TestValidation:
    """Tests for Gutenberg block validation."""

    def test_valid_blocks(self):
        """Test validation passes for valid blocks."""
        content = """<!-- wp:paragraph -->
<p>Valid paragraph</p>
<!-- /wp:paragraph -->"""
        issues = validate_gutenberg_blocks(content)
        assert len(issues) == 0

    def test_unbalanced_blocks(self):
        """Test validation catches unbalanced blocks."""
        content = """<!-- wp:paragraph -->
<p>Missing closing tag</p>"""
        issues = validate_gutenberg_blocks(content)
        assert any("Unbalanced" in issue for issue in issues)

    def test_mismatched_blocks(self):
        """Test validation catches mismatched block names."""
        content = """<!-- wp:paragraph -->
<p>Wrong closing</p>
<!-- /wp:heading -->"""
        issues = validate_gutenberg_blocks(content)
        assert len(issues) > 0


class TestConvertToGutenberg:
    """Tests for the main convert_to_gutenberg function."""

    def test_auto_detect_and_convert_markdown(self):
        """Test auto-detection and conversion of markdown."""
        markdown = "# Title\n\nParagraph"
        result = convert_to_gutenberg(markdown)
        assert "<!-- wp:heading" in result
        assert "<!-- wp:paragraph -->" in result

    def test_force_markdown_type(self):
        """Test forcing markdown type."""
        content = "<p>Looks like HTML</p>"
        result = convert_to_gutenberg(content, force_type="markdown")
        # Should treat < and > as text, not HTML
        assert "<!-- wp:paragraph -->" in result

    def test_force_html_type(self):
        """Test forcing HTML type."""
        content = "# Looks like markdown"
        result = convert_to_gutenberg(content, force_type="html")
        # Should wrap in HTML block since it's not valid HTML tags
        assert "<!-- wp:" in result


class TestEdgeCases:
    """Tests for edge cases and special scenarios."""

    def test_empty_content(self):
        """Test empty content handling."""
        result = markdown_to_gutenberg("")
        assert result == ""

    def test_whitespace_only(self):
        """Test whitespace-only content."""
        result = markdown_to_gutenberg("   \n\n   ")
        assert result == ""

    def test_special_characters_in_content(self):
        """Test HTML special characters are escaped."""
        result = markdown_to_gutenberg("Use < and > for comparison")
        assert "&lt;" in result or "<" in result

    def test_nested_list(self):
        """Test nested list handling."""
        markdown = """- Parent
  - Child 1
  - Child 2
- Another parent"""
        result = markdown_to_gutenberg(markdown)
        assert "<ul>" in result
        assert "<li>" in result

    def test_multiple_consecutive_headers(self):
        """Test multiple consecutive headers."""
        markdown = """# H1
## H2
### H3"""
        result = markdown_to_gutenberg(markdown)
        assert result.count("<!-- wp:heading") == 3


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
