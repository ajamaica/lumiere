# markdown-to-social

Convert markdown articles/text into platform-optimized social media posts.
One content → multiple formats (Twitter thread, LinkedIn post, Reddit post).

## Usage

```bash
python3 scripts/md2social.py convert <file.md> --platform twitter|linkedin|reddit
python3 scripts/md2social.py convert <file.md> --all
python3 scripts/md2social.py convert --text "Direct text" --platform twitter
```

## Options

| Flag           | Description                                          |
| -------------- | ---------------------------------------------------- |
| `--platform`   | `twitter`, `linkedin`, or `reddit`                   |
| `--all`        | Generate all 3 formats at once                       |
| `--text`       | Use direct text instead of a file                    |
| `--output DIR` | Save to files (twitter.txt, linkedin.txt, reddit.md) |
| `--json`       | Output as JSON                                       |

## Platform Rules

### Twitter

- Hook tweet with 🧵 + numbered thread (1/N, 2/N...)
- Each tweet strictly < 280 chars
- Smart sentence splitting (no mid-sentence cuts)
- 6-8 tweets max, CTA at the end

### LinkedIn

- Hook paragraph visible before "see more" (~1300 chars)
- Emoji bullets, frequent line breaks for mobile
- 3000 chars max, 5-8 hashtags at the end
- Professional but engaging tone

### Reddit

- Title < 300 chars
- TL;DR at the top
- Full markdown body preserved (headers, bold, bullets)

## Dependencies

Python 3.10+ stdlib only. No external packages, no API calls.

## Examples

```bash
# Twitter thread from an article
python3 scripts/md2social.py convert article.md --platform twitter

# All platforms, saved to files
python3 scripts/md2social.py convert article.md --all --output ./social-posts

# Quick text to LinkedIn
python3 scripts/md2social.py convert --text "Big news today..." --platform linkedin

# JSON output for automation
python3 scripts/md2social.py convert article.md --all --json
```

## File Structure

```
skills/markdown-to-social/
├── SKILL.md              # This file
└── scripts/
    └── md2social.py      # Main CLI script
```
