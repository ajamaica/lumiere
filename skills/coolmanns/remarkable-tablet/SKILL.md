---
name: remarkable
description: Fetch handwritten notes, sketches, and drawings from a reMarkable tablet via Cloud API (rmapi). Process content by refining artwork with AI image generation, extracting handwritten text to memory/journal, or using sketches as input for other workflows. Use when working with reMarkable tablet content, syncing handwritten notes, processing sketches, or integrating tablet drawings into projects.
---

# reMarkable Tablet Integration (rmapi)

Fetch handwritten notes, sketches, and drawings from a reMarkable tablet via Cloud API. Process them — refine artwork with AI image generation, extract text to memory/journal, or use as input for other workflows.

## Typical Use Cases

1. **Journal entries** — User writes thoughts on reMarkable → fetch → OCR/interpret → append to `memory/YYYY-MM-DD.md` or a dedicated journal file
2. **Sketch refinement** — User draws a rough graphic → fetch → enhance with nano-banana-pro (AI image editing) → return polished version
3. **Brainstorming/notes** — User jots down ideas, lists, diagrams → fetch → extract structure → add to project docs or memory
4. **Illustrations** — User creates hand-drawn art → fetch → optionally stylize → use in blog posts, social media, etc.

## Processing Pipeline

```
reMarkable tablet → Cloud sync → rmapi fetch → PDF/PNG
                                                  ↓
                                    ┌─────────────┴─────────────┐
                                    │                           │
                              Text content?               Visual/sketch?
                                    │                           │
                              OCR / interpret            nano-banana-pro
                                    │                     (AI enhance)
                                    │                           │
                              Add to memory/            Return refined
                              journal/project            image to user
```

## Setup

- **Tool:** rmapi (ddvk fork) v0.0.32
- **Binary:** `~/bin/rmapi`
- **Config:** `~/.rmapi` (device token after auth)
- **Sync folder:** `~/clawd/remarkable-sync/`

### Authentication (ONE-TIME)

1. User goes to https://my.remarkable.com/connect/desktop
2. Logs in, gets 8-character code
3. Run `rmapi` and enter the code
4. Token saved to `~/.rmapi` — future runs are automatic

## Commands

```bash
# List files/folders
rmapi ls
rmapi ls --json

# Navigate
rmapi cd "folder name"

# Find by tag / starred / regex
rmapi find --tag="share-with-gandalf" /
rmapi find --starred /
rmapi find / ".*sketch.*"

# Download (PDF)
rmapi get "filename"

# Download with annotations rendered (best for sketches)
rmapi geta "filename"

# Bulk download folder
rmapi mget -o ~/clawd/remarkable-sync/ "/Shared with Gandalf"
```

## Sharing Workflows

### Option A: Dedicated Folder

User creates "Shared with Gandalf" folder on reMarkable → moves items there → agent fetches with `rmapi mget`

### Option B: Tag-Based

User tags documents with `share-with-gandalf` → agent discovers with `rmapi find --tag`

### Option C: Starred Items

User stars items → agent fetches with `rmapi find --starred`

## Fetch Script

```bash
# Fetch from shared folder
~/clawd/scripts/remarkable-fetch.sh

# Fetch starred items
~/clawd/scripts/remarkable-fetch.sh --starred

# Fetch by tag
~/clawd/scripts/remarkable-fetch.sh --tag="share-with-gandalf"
```

## Notes

- Tablet must cloud-sync before files are available
- `geta` renders annotations into PDF (preferred for handwritten content)
- Use `convert` (ImageMagick) to go from PDF → PNG for image processing
- For text extraction, interpret the handwriting visually (vision model) rather than traditional OCR
