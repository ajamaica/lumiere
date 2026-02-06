---
name: mediaproc
description: Process media files (video, audio, images) via a locked-down SSH container with ffmpeg, sox, and imagemagick
homepage: https://github.com/psyb0t/docker-mediaproc
user-invocable: true
metadata: { 'openclaw': { 'emoji': '🎬', 'primaryEnv': 'MEDIAPROC_HOST', 'always': true } }
---

# mediaproc

## Setup Required

This skill requires `MEDIAPROC_HOST` and `MEDIAPROC_PORT` environment variables pointing to a running mediaproc instance.

**Configure OpenClaw** (`~/.openclaw/openclaw.json`):

```json
{
  "skills": {
    "entries": {
      "mediaproc": {
        "env": {
          "MEDIAPROC_HOST": "localhost",
          "MEDIAPROC_PORT": "2222"
        }
      }
    }
  }
}
```

Or set the environment variables directly:

```bash
export MEDIAPROC_HOST=localhost
export MEDIAPROC_PORT=2222
```

---

Locked-down media processing over SSH. Uses a Python wrapper that whitelists commands - no shell access, no injection, no bullshit.

## First Connection

Before running any commands, you must accept the host key so it gets added to `known_hosts`. Run a simple `ls` and accept the fingerprint:

```bash
ssh -p $MEDIAPROC_PORT mediaproc@$MEDIAPROC_HOST "ls"
```

If this is the first time connecting, SSH will prompt to verify the host key. Type `yes` to accept. This only needs to happen once per host. If you skip this step, all subsequent SSH commands will fail with a host key verification error.

## How It Works

All commands are executed via SSH against the mediaproc container. The container forces every connection through a Python wrapper that only allows whitelisted commands. All file paths are locked to `/work` inside the container.

**SSH command format:**

```bash
ssh -p $MEDIAPROC_PORT mediaproc@$MEDIAPROC_HOST "<command> [args]"
```

## Media Tools

| Command    | Binary              | Description                                  |
| ---------- | ------------------- | -------------------------------------------- |
| `ffmpeg`   | `/usr/bin/ffmpeg`   | Video/audio encoding, transcoding, filtering |
| `ffprobe`  | `/usr/bin/ffprobe`  | Media file analysis                          |
| `sox`      | `/usr/bin/sox`      | Audio processing                             |
| `soxi`     | `/usr/bin/soxi`     | Audio file info                              |
| `convert`  | `/usr/bin/convert`  | Image conversion/manipulation (ImageMagick)  |
| `identify` | `/usr/bin/identify` | Image file info (ImageMagick)                |
| `magick`   | `/usr/bin/magick`   | ImageMagick CLI                              |

## File Operations

All paths are relative to `/work`. Traversal attempts are blocked. Absolute paths get remapped under `/work`.

| Command  | Description                                                              | Example                                    |
| -------- | ------------------------------------------------------------------------ | ------------------------------------------ |
| `ls`     | List `/work` or a subdirectory (`ls -alph` style, use `--json` for JSON) | `ls` or `ls --json subdir`                 |
| `put`    | Upload file from stdin                                                   | `put video.mp4` (pipe file via stdin)      |
| `get`    | Download file to stdout                                                  | `get output.mp4` (redirect stdout to file) |
| `rm`     | Delete a file (not directories)                                          | `rm old.mp4`                               |
| `mkdir`  | Create directory (recursive)                                             | `mkdir project1`                           |
| `rmdir`  | Remove empty directory                                                   | `rmdir project1`                           |
| `rrmdir` | Remove directory and everything in it recursively                        | `rrmdir project1`                          |

## Usage Examples

### Upload and process a file

```bash
# Upload
ssh -p $MEDIAPROC_PORT mediaproc@$MEDIAPROC_HOST "put input.mp4" < input.mp4

# Transcode
ssh -p $MEDIAPROC_PORT mediaproc@$MEDIAPROC_HOST "ffmpeg -i /work/input.mp4 -c:v libx264 /work/output.mp4"

# Download result
ssh -p $MEDIAPROC_PORT mediaproc@$MEDIAPROC_HOST "get output.mp4" > output.mp4

# Clean up
ssh -p $MEDIAPROC_PORT mediaproc@$MEDIAPROC_HOST "rm input.mp4"
ssh -p $MEDIAPROC_PORT mediaproc@$MEDIAPROC_HOST "rm output.mp4"
```

### Video operations

```bash
# Get video info as JSON
ssh -p $MEDIAPROC_PORT mediaproc@$MEDIAPROC_HOST "ffprobe -v quiet -print_format json -show_format -show_streams /work/video.mp4"

# Apply frei0r glow effect
ssh -p $MEDIAPROC_PORT mediaproc@$MEDIAPROC_HOST "ffmpeg -i /work/in.mp4 -vf frei0r=glow:0.5 /work/out.mp4"

# Extract audio from video
ssh -p $MEDIAPROC_PORT mediaproc@$MEDIAPROC_HOST "ffmpeg -i /work/video.mp4 -vn -acodec libmp3lame /work/audio.mp3"

# Create thumbnail from video
ssh -p $MEDIAPROC_PORT mediaproc@$MEDIAPROC_HOST "ffmpeg -i /work/video.mp4 -ss 00:00:05 -vframes 1 /work/thumb.jpg"
```

### Audio operations

```bash
# Convert audio format
ssh -p $MEDIAPROC_PORT mediaproc@$MEDIAPROC_HOST "sox /work/input.wav /work/output.mp3"

# Get audio info
ssh -p $MEDIAPROC_PORT mediaproc@$MEDIAPROC_HOST "soxi /work/audio.wav"

# Normalize audio
ssh -p $MEDIAPROC_PORT mediaproc@$MEDIAPROC_HOST "sox /work/input.wav /work/output.wav norm"
```

### Image operations

```bash
# Resize image
ssh -p $MEDIAPROC_PORT mediaproc@$MEDIAPROC_HOST "convert /work/input.png -resize 50% /work/output.png"

# Create thumbnail
ssh -p $MEDIAPROC_PORT mediaproc@$MEDIAPROC_HOST "convert /work/input.jpg -thumbnail 200x200 /work/thumb.jpg"

# Get image info
ssh -p $MEDIAPROC_PORT mediaproc@$MEDIAPROC_HOST "identify /work/image.png"
```

### File management

```bash
# List files (ls -alph style, no . and ..)
ssh -p $MEDIAPROC_PORT mediaproc@$MEDIAPROC_HOST "ls"
# drwxrwxr-x   2 mediaproc mediaproc     4096 Jan 25 14:30 project1/
# -rw-rw-r--   1 mediaproc mediaproc  1048576 Jan 25 14:32 video.mp4

# List files as JSON (use --json flag)
ssh -p $MEDIAPROC_PORT mediaproc@$MEDIAPROC_HOST "ls --json"
# [{"name": "video.mp4", "size": 1048576, "modified": 1706140800, "isDir": false, "mode": "rw-rw-r--", "owner": "mediaproc", "group": "mediaproc", "links": 1}, ...]

# List subdirectory
ssh -p $MEDIAPROC_PORT mediaproc@$MEDIAPROC_HOST "ls project1"

# Create subdirectory
ssh -p $MEDIAPROC_PORT mediaproc@$MEDIAPROC_HOST "mkdir project1"

# Remove directory recursively
ssh -p $MEDIAPROC_PORT mediaproc@$MEDIAPROC_HOST "rrmdir project1"
```

## Available Plugins

- **frei0r** - Video effect plugins (used via `-vf frei0r=...`)
- **LADSPA** - Audio effect plugins: SWH, TAP, CMT (used via `-af ladspa=...`)
- **LV2** - Audio plugins (used via `-af lv2=...`)

## Fonts

2200+ fonts included covering emoji, CJK, Arabic, Thai, Indic, monospace, and more. Custom fonts can be mounted to `/usr/share/fonts/custom`.

## Security Notes

- No shell access - all commands go through a Python wrapper
- Whitelist only - unlisted commands are rejected
- No injection - `&&`, `;`, `|`, `$()` are treated as literal arguments (no shell involved)
- SSH key auth only - no passwords
- All forwarding disabled
- All file paths locked to `/work`
