#!/usr/bin/env python3
"""Convert markdown content to platform-optimized social media posts."""

import argparse
import json
import os
import re
import sys
import textwrap


# ---------------------------------------------------------------------------
# Markdown parsing helpers
# ---------------------------------------------------------------------------

def strip_frontmatter(text: str) -> str:
    """Remove YAML frontmatter (--- ... ---) from markdown."""
    m = re.match(r"^---\s*\n.*?\n---\s*\n", text, re.DOTALL)
    return text[m.end():] if m else text


def extract_title(raw: str) -> str:
    """Try to pull a title from frontmatter or first heading."""
    m = re.search(r'^title:\s*["\']?(.+?)["\']?\s*$', raw, re.MULTILINE)
    if m:
        return m.group(1).strip()
    m = re.search(r"^#\s+(.+)", raw, re.MULTILINE)
    if m:
        return m.group(1).strip()
    return ""


def extract_tags(raw: str) -> list[str]:
    """Pull tags from frontmatter."""
    m = re.search(r'^tags:\s*\[(.+?)\]', raw, re.MULTILINE)
    if m:
        return [t.strip().strip('"').strip("'") for t in m.group(1).split(",")]
    return []


def md_to_plain(text: str) -> str:
    """Lightweight markdown → plain-text conversion."""
    text = re.sub(r"!\[.*?\]\(.*?\)", "", text)          # images
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text) # links → text
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)         # bold
    text = re.sub(r"\*(.+?)\*", r"\1", text)              # italic
    text = re.sub(r"`(.+?)`", r"\1", text)                # code
    text = re.sub(r"^>\s?", "", text, flags=re.MULTILINE) # blockquotes
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE) # headings
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_sections(md: str) -> list[dict]:
    """Split markdown into sections by ## headings."""
    body = strip_frontmatter(md)
    parts = re.split(r"^(## .+)$", body, flags=re.MULTILINE)
    sections: list[dict] = []
    # parts: [pre, heading1, body1, heading2, body2, ...]
    i = 0
    if parts and not parts[0].startswith("## "):
        intro = parts[0].strip()
        if intro:
            sections.append({"heading": "", "body": intro})
        i = 1
    while i < len(parts) - 1:
        heading = parts[i].lstrip("# ").strip()
        body = parts[i + 1].strip()
        sections.append({"heading": heading, "body": body})
        i += 2
    return sections


# ---------------------------------------------------------------------------
# Smart sentence splitting
# ---------------------------------------------------------------------------

def split_sentences(text: str) -> list[str]:
    """Split text into sentences, preserving abbreviations roughly."""
    # Split on sentence-ending punctuation followed by space or newline
    parts = re.split(r'(?<=[.!?])\s+', text)
    return [p.strip() for p in parts if p.strip()]


def chunk_text(text: str, max_len: int) -> list[str]:
    """Split text into chunks of at most max_len chars without cutting sentences."""
    sentences = split_sentences(text)
    chunks: list[str] = []
    current = ""
    for sent in sentences:
        if len(sent) > max_len:
            # Force-wrap very long sentences
            if current:
                chunks.append(current.strip())
                current = ""
            for line in textwrap.wrap(sent, max_len):
                chunks.append(line)
            continue
        candidate = (current + " " + sent).strip() if current else sent
        if len(candidate) <= max_len:
            current = candidate
        else:
            if current:
                chunks.append(current.strip())
            current = sent
    if current:
        chunks.append(current.strip())
    return chunks


# ---------------------------------------------------------------------------
# Platform converters
# ---------------------------------------------------------------------------

MAX_TWEET = 280
MAX_TWEETS = 8


def convert_twitter(md: str) -> str:
    """Generate a Twitter thread from markdown content."""
    title = extract_title(md)
    sections = extract_sections(md)
    plain_sections = []
    for sec in sections:
        plain = md_to_plain(sec["body"])
        if plain:
            plain_sections.append((sec["heading"], plain))

    tweets: list[str] = []

    # Hook tweet
    hook = title if title else "Thread incoming"
    hook_tweet = f"🧵 {hook}"
    if len(hook_tweet) > MAX_TWEET:
        hook_tweet = hook_tweet[: MAX_TWEET - 1] + "…"
    tweets.append(hook_tweet)

    # Body tweets – collect key points from each section
    for heading, body in plain_sections:
        # Use heading as intro if present
        paragraphs = [p.strip() for p in body.split("\n\n") if p.strip()]
        for para in paragraphs:
            # Skip very short lines (likely artifacts)
            if len(para) < 20:
                continue
            chunks = chunk_text(para, MAX_TWEET - 5)  # leave room for numbering
            for c in chunks:
                tweets.append(c)
            if len(tweets) >= MAX_TWEETS + 2:
                break
        if len(tweets) >= MAX_TWEETS + 2:
            break

    # Trim to max tweets, keeping first (hook) and adding CTA at end
    if len(tweets) > MAX_TWEETS:
        tweets = tweets[: MAX_TWEETS - 1]
    # CTA tweet
    cta = "🔥 That's the wrap. Follow for more insights like this!"
    tweets.append(cta)

    # Add numbering if >= 3 tweets
    if len(tweets) >= 3:
        total = len(tweets)
        numbered = []
        for i, t in enumerate(tweets, 1):
            prefix = f"{i}/{total} "
            # Ensure we don't exceed limit
            available = MAX_TWEET - len(prefix)
            if len(t) > available:
                t = t[:available - 1] + "…"
            numbered.append(prefix + t)
        tweets = numbered

    # Final safety: hard-truncate any tweet > 280
    safe_tweets = []
    for t in tweets:
        if len(t) > MAX_TWEET:
            t = t[: MAX_TWEET - 1] + "…"
        safe_tweets.append(t)

    return "\n---\n".join(safe_tweets)


def convert_linkedin(md: str) -> str:
    """Generate a LinkedIn post from markdown content."""
    title = extract_title(md)
    tags = extract_tags(md)
    sections = extract_sections(md)

    lines: list[str] = []

    # Hook (first ~2 lines visible before "see more")
    if title:
        lines.append(f"🚀 {title}")
        lines.append("")

    # Build body from sections
    emojis = ["💡", "🔑", "⚡", "🎯", "📊", "🌍", "✅", "🔥", "👀", "🤖"]
    ei = 0
    for sec in sections:
        plain = md_to_plain(sec["body"])
        if not plain:
            continue
        paragraphs = [p.strip() for p in plain.split("\n\n") if p.strip()]
        for para in paragraphs:
            emoji = emojis[ei % len(emojis)]
            ei += 1
            # Short lines for mobile readability
            wrapped = textwrap.fill(para, width=80)
            lines.append(f"{emoji} {wrapped}")
            lines.append("")

    body = "\n".join(lines).strip()

    # Trim to ~3000 chars total
    if len(body) > 2800:
        body = body[:2797] + "..."

    # Hashtags
    if not tags:
        tags = ["AI", "Tech", "Innovation"]
    hashtags = " ".join(f"#{t.replace(' ', '')}" for t in tags[:8])
    return f"{body}\n\n{hashtags}"


def convert_reddit(md: str) -> str:
    """Generate a Reddit post (title + markdown body) from markdown content."""
    title = extract_title(md)
    sections = extract_sections(md)

    if not title:
        title = "Check this out"
    # Ensure title < 300
    if len(title) > 297:
        title = title[:297] + "..."

    # Build TL;DR from first section
    first_plain = ""
    if sections:
        first_plain = md_to_plain(sections[0]["body"])
    tldr_sentences = split_sentences(first_plain)
    tldr = " ".join(tldr_sentences[:2]) if tldr_sentences else title

    # Body keeps markdown formatting (Reddit supports it)
    body_parts = []
    body_raw = strip_frontmatter(md)
    # Remove the first heading if it matches the title
    body_raw = re.sub(r"^#\s+" + re.escape(title) + r"\s*\n*", "", body_raw)

    body_parts.append(f"**TL;DR:** {tldr}")
    body_parts.append("")
    body_parts.append("---")
    body_parts.append("")
    body_parts.append(body_raw.strip())

    return f"# {title}\n\n" + "\n".join(body_parts)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

CONVERTERS = {
    "twitter": convert_twitter,
    "linkedin": convert_linkedin,
    "reddit": convert_reddit,
}

EXTENSIONS = {
    "twitter": "twitter.txt",
    "linkedin": "linkedin.txt",
    "reddit": "reddit.md",
}


def main():
    parser = argparse.ArgumentParser(
        prog="md2social",
        description="Convert markdown to social media posts",
    )
    sub = parser.add_subparsers(dest="command")

    convert_p = sub.add_parser("convert", help="Convert markdown to social posts")
    convert_p.add_argument("file", nargs="?", help="Markdown file to convert")
    convert_p.add_argument("--text", help="Direct text input (instead of file)")
    convert_p.add_argument("--platform", choices=["twitter", "linkedin", "reddit"])
    convert_p.add_argument("--all", action="store_true", help="Generate all platforms")
    convert_p.add_argument("--output", metavar="DIR", help="Output directory")
    convert_p.add_argument("--json", action="store_true", dest="as_json", help="JSON output")

    args = parser.parse_args()

    if args.command != "convert":
        parser.print_help()
        sys.exit(1)

    # Read input
    if args.text:
        md = args.text
    elif args.file:
        with open(args.file, "r", encoding="utf-8") as f:
            md = f.read()
    else:
        print("Error: provide a file or --text", file=sys.stderr)
        sys.exit(1)

    # Determine platforms
    if args.all:
        platforms = ["twitter", "linkedin", "reddit"]
    elif args.platform:
        platforms = [args.platform]
    else:
        print("Error: specify --platform or --all", file=sys.stderr)
        sys.exit(1)

    results: dict[str, str] = {}
    for p in platforms:
        results[p] = CONVERTERS[p](md)

    # Output
    if args.as_json:
        print(json.dumps(results, ensure_ascii=False, indent=2))
    elif args.output:
        os.makedirs(args.output, exist_ok=True)
        for p, content in results.items():
            path = os.path.join(args.output, EXTENSIONS[p])
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"✅ {path}")
    else:
        for p, content in results.items():
            print(f"\n{'='*60}")
            print(f"  {p.upper()}")
            print(f"{'='*60}\n")
            print(content)
            print()


if __name__ == "__main__":
    main()
