#!/usr/bin/env python3
"""
Convert markdown/HTML content to WordPress Gutenberg blocks.

This converter handles:
- Headings (H1-H6)
- Paragraphs with inline formatting (bold, italic, links, code)
- Ordered and unordered lists (including nested)
- Tables (markdown pipe format)
- Code blocks (fenced with language support)
- Blockquotes
- Images
- Horizontal rules
- HTML pass-through

Usage:
    python content_to_gutenberg.py input.md output.html
    python content_to_gutenberg.py --text "# Hello\n\nWorld"
    python content_to_gutenberg.py --validate output.html
"""

import re
import json
import html
import argparse
from typing import List, Tuple, Optional


def escape_html(text: str) -> str:
    """Escape HTML special characters while preserving existing HTML tags."""
    # Don't escape if it looks like it already has HTML
    if re.search(r'<(strong|em|a|code|br|span)[^>]*>', text):
        return text
    return html.escape(text, quote=False)


def convert_inline_formatting(text: str) -> str:
    """
    Convert inline markdown to HTML.
    
    Handles:
    - **bold** and __bold__
    - *italic* and _italic_
    - `inline code`
    - [links](url)
    - ~~strikethrough~~
    """
    # Bold (must come before italic to handle ** vs *)
    text = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'__([^_]+)__', r'<strong>\1</strong>', text)
    
    # Italic
    text = re.sub(r'\*([^*]+)\*', r'<em>\1</em>', text)
    text = re.sub(r'(?<![a-zA-Z])_([^_]+)_(?![a-zA-Z])', r'<em>\1</em>', text)
    
    # Inline code
    text = re.sub(r'`([^`]+)`', r'<code>\1</code>', text)
    
    # Links [text](url)
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', text)
    
    # Strikethrough
    text = re.sub(r'~~([^~]+)~~', r'<s>\1</s>', text)
    
    return text


def parse_markdown_table(lines: List[str]) -> str:
    """
    Parse markdown table into Gutenberg table block.
    
    Args:
        lines: List of table lines including header, separator, and data rows
        
    Returns:
        Gutenberg table block string
    """
    if len(lines) < 2:
        return ''
    
    def parse_row(line: str) -> List[str]:
        """Parse a table row into cells."""
        # Remove leading/trailing pipes and split
        line = line.strip()
        if line.startswith('|'):
            line = line[1:]
        if line.endswith('|'):
            line = line[:-1]
        
        cells = [c.strip() for c in line.split('|')]
        # Convert inline formatting in each cell
        return [convert_inline_formatting(escape_html(c)) for c in cells]
    
    # Parse header row
    header = parse_row(lines[0])
    
    # Find where data rows start (skip separator line with dashes)
    data_start = 1
    if len(lines) > 1 and re.match(r'^[\|\s\-:]+$', lines[1]):
        data_start = 2
    
    # Parse data rows
    rows = []
    for line in lines[data_start:]:
        if line.strip() and '|' in line:
            rows.append(parse_row(line))
    
    # Build table HTML
    thead = '<thead><tr>' + ''.join(f'<th>{h}</th>' for h in header) + '</tr></thead>'
    
    tbody_rows = ''
    for row in rows:
        # Pad row to match header length if needed
        while len(row) < len(header):
            row.append('')
        tbody_rows += '<tr>' + ''.join(f'<td>{c}</td>' for c in row) + '</tr>'
    
    tbody = f'<tbody>{tbody_rows}</tbody>' if rows else ''
    
    return f'<!-- wp:table -->\n<figure class="wp-block-table"><table>{thead}{tbody}</table></figure>\n<!-- /wp:table -->'


def parse_list_items(lines: List[str], start_idx: int, list_type: str) -> Tuple[List[str], int]:
    """
    Parse list items, handling nested lists.
    
    Args:
        lines: All content lines
        start_idx: Starting index in lines
        list_type: 'ul' for unordered, 'ol' for ordered
        
    Returns:
        Tuple of (list of HTML items, next line index)
    """
    items = []
    i = start_idx
    
    # Pattern for list items
    ul_pattern = r'^(\s*)([\*\-\+])\s+(.+)$'
    ol_pattern = r'^(\s*)(\d+)\.\s+(.+)$'
    
    base_indent = None
    
    while i < len(lines):
        line = lines[i]
        
        # Check for unordered list item
        ul_match = re.match(ul_pattern, line)
        ol_match = re.match(ol_pattern, line)
        
        if ul_match and list_type == 'ul':
            indent = len(ul_match.group(1))
            if base_indent is None:
                base_indent = indent
            
            if indent < base_indent:
                break
            elif indent > base_indent:
                # Nested list - recursively parse
                nested_items, i = parse_list_items(lines, i, 'ul')
                if items:
                    # Append nested list to last item
                    items[-1] = items[-1].rstrip('</li>') + '\n<ul>' + ''.join(nested_items) + '</ul></li>'
                continue
            else:
                content = convert_inline_formatting(escape_html(ul_match.group(3)))
                items.append(f'<li>{content}</li>')
                i += 1
        
        elif ol_match and list_type == 'ol':
            indent = len(ol_match.group(1))
            if base_indent is None:
                base_indent = indent
            
            if indent < base_indent:
                break
            elif indent > base_indent:
                nested_items, i = parse_list_items(lines, i, 'ol')
                if items:
                    items[-1] = items[-1].rstrip('</li>') + '\n<ol>' + ''.join(nested_items) + '</ol></li>'
                continue
            else:
                content = convert_inline_formatting(escape_html(ol_match.group(3)))
                items.append(f'<li>{content}</li>')
                i += 1
        
        elif not line.strip():
            # Empty line might end the list or be between items
            if i + 1 < len(lines):
                next_line = lines[i + 1]
                if re.match(ul_pattern if list_type == 'ul' else ol_pattern, next_line):
                    i += 1
                    continue
            break
        else:
            break
    
    return items, i


def markdown_to_gutenberg(content: str) -> str:
    """
    Convert markdown content to Gutenberg blocks.
    
    Args:
        content: Markdown formatted content
        
    Returns:
        Gutenberg block formatted content
    """
    blocks = []
    lines = content.split('\n')
    i = 0
    
    while i < len(lines):
        line = lines[i]
        
        # Skip empty lines
        if not line.strip():
            i += 1
            continue
        
        # ============================================================
        # CODE BLOCKS (fenced with ```)
        # ============================================================
        if line.strip().startswith('```'):
            lang_match = re.match(r'```(\w+)?', line.strip())
            lang = lang_match.group(1) if lang_match else None
            code_lines = []
            i += 1
            
            while i < len(lines) and not lines[i].strip().startswith('```'):
                code_lines.append(lines[i])
                i += 1
            i += 1  # Skip closing ```
            
            code_content = escape_html('\n'.join(code_lines))
            
            if lang:
                blocks.append(
                    f'<!-- wp:code {{"language":"{lang}"}} -->\n'
                    f'<pre class="wp-block-code"><code lang="{lang}">{code_content}</code></pre>\n'
                    f'<!-- /wp:code -->'
                )
            else:
                blocks.append(
                    f'<!-- wp:code -->\n'
                    f'<pre class="wp-block-code"><code>{code_content}</code></pre>\n'
                    f'<!-- /wp:code -->'
                )
            continue
        
        # ============================================================
        # HEADINGS (# to ######)
        # ============================================================
        heading_match = re.match(r'^(#{1,6})\s+(.+)$', line)
        if heading_match:
            level = len(heading_match.group(1))
            text = convert_inline_formatting(escape_html(heading_match.group(2)))
            
            # H2 is default, doesn't need level attribute
            if level == 2:
                blocks.append(
                    f'<!-- wp:heading -->\n'
                    f'<h2 class="wp-block-heading">{text}</h2>\n'
                    f'<!-- /wp:heading -->'
                )
            else:
                blocks.append(
                    f'<!-- wp:heading {{"level":{level}}} -->\n'
                    f'<h{level} class="wp-block-heading">{text}</h{level}>\n'
                    f'<!-- /wp:heading -->'
                )
            i += 1
            continue
        
        # ============================================================
        # HORIZONTAL RULE
        # ============================================================
        if re.match(r'^(-{3,}|\*{3,}|_{3,})$', line.strip()):
            blocks.append(
                '<!-- wp:separator -->\n'
                '<hr class="wp-block-separator has-alpha-channel-opacity"/>\n'
                '<!-- /wp:separator -->'
            )
            i += 1
            continue
        
        # ============================================================
        # BLOCKQUOTE (>)
        # ============================================================
        if line.strip().startswith('>'):
            quote_lines = []
            while i < len(lines) and lines[i].strip().startswith('>'):
                # Remove > prefix
                quote_text = re.sub(r'^>\s?', '', lines[i])
                quote_lines.append(quote_text)
                i += 1
            
            quote_content = convert_inline_formatting(escape_html(' '.join(quote_lines)))
            blocks.append(
                f'<!-- wp:quote -->\n'
                f'<blockquote class="wp-block-quote"><p>{quote_content}</p></blockquote>\n'
                f'<!-- /wp:quote -->'
            )
            continue
        
        # ============================================================
        # UNORDERED LIST (*, -, +)
        # ============================================================
        if re.match(r'^[\*\-\+]\s', line.strip()):
            items, i = parse_list_items(lines, i, 'ul')
            if items:
                blocks.append(
                    f'<!-- wp:list -->\n'
                    f'<ul>{"".join(items)}</ul>\n'
                    f'<!-- /wp:list -->'
                )
            continue
        
        # ============================================================
        # ORDERED LIST (1., 2., etc.)
        # ============================================================
        if re.match(r'^\d+\.\s', line.strip()):
            items, i = parse_list_items(lines, i, 'ol')
            if items:
                blocks.append(
                    f'<!-- wp:list {{"ordered":true}} -->\n'
                    f'<ol>{"".join(items)}</ol>\n'
                    f'<!-- /wp:list -->'
                )
            continue
        
        # ============================================================
        # IMAGE (![alt](url))
        # ============================================================
        img_match = re.match(r'!\[([^\]]*)\]\(([^)]+)\)', line.strip())
        if img_match:
            alt = escape_html(img_match.group(1))
            src = img_match.group(2)
            blocks.append(
                f'<!-- wp:image {{"sizeSlug":"large","linkDestination":"none"}} -->\n'
                f'<figure class="wp-block-image size-large"><img src="{src}" alt="{alt}"/></figure>\n'
                f'<!-- /wp:image -->'
            )
            i += 1
            continue
        
        # ============================================================
        # TABLE (pipe-delimited)
        # ============================================================
        if '|' in line and re.match(r'^\|?[^|]+\|', line):
            table_lines = []
            while i < len(lines) and '|' in lines[i]:
                table_lines.append(lines[i])
                i += 1
            
            table_block = parse_markdown_table(table_lines)
            if table_block:
                blocks.append(table_block)
            continue
        
        # ============================================================
        # PARAGRAPH (default)
        # ============================================================
        para_lines = []
        while i < len(lines):
            current_line = lines[i]
            
            # Check if we've hit a block element
            if not current_line.strip():
                break
            if current_line.strip().startswith('#'):
                break
            if current_line.strip().startswith('>'):
                break
            if current_line.strip().startswith('```'):
                break
            if re.match(r'^[\*\-\+]\s', current_line.strip()):
                break
            if re.match(r'^\d+\.\s', current_line.strip()):
                break
            if re.match(r'^(-{3,}|\*{3,}|_{3,})$', current_line.strip()):
                break
            if '|' in current_line and re.match(r'^\|?[^|]+\|', current_line):
                break
            if re.match(r'^!\[', current_line.strip()):
                break
            
            para_lines.append(current_line)
            i += 1
        
        if para_lines:
            para_text = ' '.join(para_lines)
            para_text = convert_inline_formatting(para_text)
            blocks.append(
                f'<!-- wp:paragraph -->\n'
                f'<p>{para_text}</p>\n'
                f'<!-- /wp:paragraph -->'
            )
    
    return '\n\n'.join(blocks)


def html_to_gutenberg(content: str) -> str:
    """
    Convert HTML content to Gutenberg blocks.
    
    Args:
        content: HTML formatted content
        
    Returns:
        Gutenberg block formatted content
    """
    blocks = []
    
    # Split by major block elements
    pattern = r'(<(?:p|h[1-6]|ul|ol|blockquote|pre|table|figure|div)[^>]*>.*?</(?:p|h[1-6]|ul|ol|blockquote|pre|table|figure|div)>)'
    parts = re.split(pattern, content, flags=re.DOTALL | re.IGNORECASE)
    
    for part in parts:
        part = part.strip()
        if not part:
            continue
        
        # Paragraph
        p_match = re.match(r'<p[^>]*>(.*?)</p>', part, re.DOTALL | re.IGNORECASE)
        if p_match:
            blocks.append(
                f'<!-- wp:paragraph -->\n'
                f'<p>{p_match.group(1)}</p>\n'
                f'<!-- /wp:paragraph -->'
            )
            continue
        
        # Headings
        h_match = re.match(r'<h([1-6])[^>]*>(.*?)</h\1>', part, re.DOTALL | re.IGNORECASE)
        if h_match:
            level = int(h_match.group(1))
            text = h_match.group(2)
            attrs = '' if level == 2 else f' {{"level":{level}}}'
            blocks.append(
                f'<!-- wp:heading{attrs} -->\n'
                f'<h{level} class="wp-block-heading">{text}</h{level}>\n'
                f'<!-- /wp:heading -->'
            )
            continue
        
        # Unordered list
        ul_match = re.match(r'<ul[^>]*>(.*?)</ul>', part, re.DOTALL | re.IGNORECASE)
        if ul_match:
            blocks.append(
                f'<!-- wp:list -->\n'
                f'<ul>{ul_match.group(1)}</ul>\n'
                f'<!-- /wp:list -->'
            )
            continue
        
        # Ordered list
        ol_match = re.match(r'<ol[^>]*>(.*?)</ol>', part, re.DOTALL | re.IGNORECASE)
        if ol_match:
            blocks.append(
                f'<!-- wp:list {{"ordered":true}} -->\n'
                f'<ol>{ol_match.group(1)}</ol>\n'
                f'<!-- /wp:list -->'
            )
            continue
        
        # Table
        table_match = re.match(r'<table[^>]*>(.*?)</table>', part, re.DOTALL | re.IGNORECASE)
        if table_match:
            blocks.append(
                f'<!-- wp:table -->\n'
                f'<figure class="wp-block-table"><table>{table_match.group(1)}</table></figure>\n'
                f'<!-- /wp:table -->'
            )
            continue
        
        # Blockquote
        bq_match = re.match(r'<blockquote[^>]*>(.*?)</blockquote>', part, re.DOTALL | re.IGNORECASE)
        if bq_match:
            blocks.append(
                f'<!-- wp:quote -->\n'
                f'<blockquote class="wp-block-quote">{bq_match.group(1)}</blockquote>\n'
                f'<!-- /wp:quote -->'
            )
            continue
        
        # Pre/Code
        pre_match = re.match(r'<pre[^>]*>(.*?)</pre>', part, re.DOTALL | re.IGNORECASE)
        if pre_match:
            code_content = pre_match.group(1)
            if '<code' not in code_content.lower():
                code_content = f'<code>{code_content}</code>'
            blocks.append(
                f'<!-- wp:code -->\n'
                f'<pre class="wp-block-code">{code_content}</pre>\n'
                f'<!-- /wp:code -->'
            )
            continue
        
        # Figure with image
        fig_match = re.match(r'<figure[^>]*>(.*?)</figure>', part, re.DOTALL | re.IGNORECASE)
        if fig_match and '<img' in fig_match.group(1).lower():
            blocks.append(
                f'<!-- wp:image {{"sizeSlug":"large"}} -->\n'
                f'<figure class="wp-block-image size-large">{fig_match.group(1)}</figure>\n'
                f'<!-- /wp:image -->'
            )
            continue
        
        # Standalone image
        img_match = re.match(r'<img[^>]+>', part, re.IGNORECASE)
        if img_match:
            blocks.append(
                f'<!-- wp:image {{"sizeSlug":"large"}} -->\n'
                f'<figure class="wp-block-image size-large">{img_match.group()}</figure>\n'
                f'<!-- /wp:image -->'
            )
            continue
        
        # Fallback: wrap in HTML block
        if part.strip():
            blocks.append(
                f'<!-- wp:html -->\n'
                f'{part}\n'
                f'<!-- /wp:html -->'
            )
    
    return '\n\n'.join(blocks)


def detect_content_type(content: str) -> str:
    """
    Detect if content is markdown or HTML.
    
    Args:
        content: Content string
        
    Returns:
        'html' or 'markdown'
    """
    html_indicators = ['<p>', '<div>', '<span>', '<h1>', '<h2>', '<h3>', '<ul>', '<ol>', '<table>']
    md_indicators = ['# ', '## ', '```', '- ', '* ', '1. ', '![', '](', '**', '__']
    
    content_lower = content.lower()
    html_score = sum(1 for ind in html_indicators if ind.lower() in content_lower)
    md_score = sum(1 for ind in md_indicators if ind in content)
    
    return 'html' if html_score > md_score else 'markdown'


def convert_to_gutenberg(content: str, force_type: str = None) -> str:
    """
    Auto-detect content type and convert to Gutenberg blocks.
    
    Args:
        content: Content to convert
        force_type: Force content type ('markdown' or 'html')
        
    Returns:
        Gutenberg block formatted content
    """
    content_type = force_type or detect_content_type(content)
    
    if content_type == 'html':
        return html_to_gutenberg(content)
    else:
        return markdown_to_gutenberg(content)


def validate_gutenberg_blocks(content: str) -> List[str]:
    """
    Validate Gutenberg blocks for common issues.
    
    Args:
        content: Gutenberg block content
        
    Returns:
        List of validation issues (empty if valid)
    """
    issues = []
    
    # Check for balanced block comments
    opening_blocks = re.findall(r'<!-- wp:(\w+)', content)
    closing_blocks = re.findall(r'<!-- /wp:(\w+)', content)
    
    if len(opening_blocks) != len(closing_blocks):
        issues.append(f"Unbalanced blocks: {len(opening_blocks)} opening, {len(closing_blocks)} closing")
    
    # Check for matching opening/closing
    for i, (opening, closing) in enumerate(zip(opening_blocks, closing_blocks)):
        if opening != closing:
            issues.append(f"Block mismatch at position {i}: opening '{opening}', closing '{closing}'")
    
    # Check for common structure issues
    
    # Tables should have figure wrapper
    table_matches = re.findall(r'<!-- wp:table[^>]*-->\s*<table', content)
    if table_matches:
        issues.append("Table block missing <figure> wrapper")
    
    # Images should have figure wrapper
    img_without_figure = re.findall(r'<!-- wp:image[^>]*-->\s*<img', content)
    if img_without_figure:
        issues.append("Image block missing <figure> wrapper")
    
    # Check for invalid JSON in block attributes
    attr_matches = re.findall(r'<!-- wp:\w+ ({[^}]+})', content)
    for attr in attr_matches:
        try:
            json.loads(attr)
        except json.JSONDecodeError as e:
            issues.append(f"Invalid JSON in block attributes: {attr[:50]}...")
    
    return issues


# ============================================================
# HELPER FUNCTIONS FOR CREATING SPECIFIC BLOCKS
# ============================================================

def create_table_block(headers: List[str], rows: List[List[str]], 
                      caption: str = None, striped: bool = False) -> str:
    """
    Create a Gutenberg table block from data.
    
    Args:
        headers: List of header strings
        rows: List of row data (each row is a list of cell strings)
        caption: Optional table caption
        striped: Use striped table style
        
    Returns:
        Gutenberg table block string
    """
    def escape_cell(text):
        return escape_html(str(text)) if text else ''
    
    thead = '<thead><tr>' + ''.join(f'<th>{escape_cell(h)}</th>' for h in headers) + '</tr></thead>'
    
    tbody_rows = ''.join(
        '<tr>' + ''.join(f'<td>{escape_cell(c)}</td>' for c in row) + '</tr>'
        for row in rows
    )
    tbody = f'<tbody>{tbody_rows}</tbody>'
    
    caption_html = f'<figcaption class="wp-element-caption">{escape_cell(caption)}</figcaption>' if caption else ''
    
    attrs = {}
    class_names = ['wp-block-table']
    if striped:
        class_names.append('is-style-stripes')
        attrs['className'] = 'is-style-stripes'
    
    attrs_json = f' {json.dumps(attrs)}' if attrs else ''
    class_attr = ' '.join(class_names)
    
    return (
        f'<!-- wp:table{attrs_json} -->\n'
        f'<figure class="{class_attr}"><table>{thead}{tbody}</table>{caption_html}</figure>\n'
        f'<!-- /wp:table -->'
    )


def create_image_block(src: str, alt: str = '', caption: str = '', 
                      media_id: int = None, size: str = 'large',
                      align: str = None) -> str:
    """
    Create a Gutenberg image block.
    
    Args:
        src: Image URL
        alt: Alt text
        caption: Image caption
        media_id: WordPress media ID
        size: Image size (thumbnail, medium, large, full)
        align: Alignment (left, center, right, wide, full)
        
    Returns:
        Gutenberg image block string
    """
    attrs = {"sizeSlug": size, "linkDestination": "none"}
    if media_id:
        attrs["id"] = media_id
    if align:
        attrs["align"] = align
    
    img_class = f'wp-image-{media_id}' if media_id else ''
    align_class = f'align{align}' if align else ''
    figure_classes = ' '.join(filter(None, ['wp-block-image', f'size-{size}', align_class]))
    
    caption_html = f'<figcaption class="wp-element-caption">{escape_html(caption)}</figcaption>' if caption else ''
    
    return (
        f'<!-- wp:image {json.dumps(attrs)} -->\n'
        f'<figure class="{figure_classes}"><img src="{src}" alt="{escape_html(alt)}" class="{img_class}"/>{caption_html}</figure>\n'
        f'<!-- /wp:image -->'
    )


def create_button_block(text: str, url: str, style: str = 'fill',
                       align: str = 'center') -> str:
    """
    Create a Gutenberg button block.
    
    Args:
        text: Button text
        url: Button link URL
        style: Button style (fill, outline)
        align: Button alignment
        
    Returns:
        Gutenberg button block string
    """
    button_class = 'wp-block-button'
    link_class = 'wp-block-button__link wp-element-button'
    
    if style == 'outline':
        button_class += ' is-style-outline'
    
    return (
        f'<!-- wp:buttons {{"layout":{{"type":"flex","justifyContent":"{align}"}}}} -->\n'
        f'<div class="wp-block-buttons">\n'
        f'<!-- wp:button -->\n'
        f'<div class="{button_class}"><a class="{link_class}" href="{url}">{escape_html(text)}</a></div>\n'
        f'<!-- /wp:button -->\n'
        f'</div>\n'
        f'<!-- /wp:buttons -->'
    )


def create_columns_block(columns_content: List[str], gap: str = None) -> str:
    """
    Create a Gutenberg columns block.
    
    Args:
        columns_content: List of content strings for each column
        gap: Gap between columns
        
    Returns:
        Gutenberg columns block string
    """
    columns = []
    for content in columns_content:
        columns.append(
            f'<!-- wp:column -->\n'
            f'<div class="wp-block-column">\n'
            f'{content}\n'
            f'</div>\n'
            f'<!-- /wp:column -->'
        )
    
    return (
        f'<!-- wp:columns -->\n'
        f'<div class="wp-block-columns">\n'
        + '\n'.join(columns) +
        f'\n</div>\n'
        f'<!-- /wp:columns -->'
    )


# ============================================================
# CLI INTERFACE
# ============================================================

def main():
    parser = argparse.ArgumentParser(
        description='Convert content to WordPress Gutenberg blocks',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  Convert markdown file:
    python content_to_gutenberg.py article.md article.html
    
  Convert with explicit type:
    python content_to_gutenberg.py --type markdown raw.txt output.html
    
  Convert inline text:
    python content_to_gutenberg.py --text "# Hello\\n\\nWorld"
    
  Validate existing Gutenberg content:
    python content_to_gutenberg.py --validate article.html
        """
    )
    
    parser.add_argument('input', nargs='?', help='Input file path')
    parser.add_argument('output', nargs='?', help='Output file path')
    parser.add_argument('--text', '-t', help='Direct text input (use \\n for newlines)')
    parser.add_argument('--type', '-T', choices=['markdown', 'html'], 
                       help='Force content type')
    parser.add_argument('--validate', '-v', action='store_true',
                       help='Validate Gutenberg blocks in input file')
    
    args = parser.parse_args()
    
    # Validation mode
    if args.validate:
        if not args.input:
            print("❌ Error: Input file required for validation")
            return 1
        
        with open(args.input, 'r', encoding='utf-8') as f:
            content = f.read()
        
        issues = validate_gutenberg_blocks(content)
        if issues:
            print("❌ Validation issues found:")
            for issue in issues:
                print(f"  - {issue}")
            return 1
        else:
            print("✅ Gutenberg blocks are valid")
            return 0
    
    # Conversion mode
    if args.text:
        content = args.text.replace('\\n', '\n')
    elif args.input:
        with open(args.input, 'r', encoding='utf-8') as f:
            content = f.read()
    else:
        parser.print_help()
        return 1
    
    result = convert_to_gutenberg(content, args.type)
    
    # Validate the result
    issues = validate_gutenberg_blocks(result)
    if issues:
        print("⚠️  Warning: Generated content has issues:")
        for issue in issues:
            print(f"  - {issue}")
    
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(result)
        print(f'✅ Output written to {args.output}')
    else:
        print(result)
    
    return 0


if __name__ == '__main__':
    exit(main())
