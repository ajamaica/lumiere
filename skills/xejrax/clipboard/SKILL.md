---
name: clipboard
description: "Interact with the system clipboard (text only) using `xclip` from any OpenClaw session."
metadata:
  {
    "openclaw":
      {
        "emoji": "📋",
        "requires": { "bins": ["xclip"] },
        "install":
          [
            {
              "id": "dnf",
              "kind": "dnf",
              "package": "xclip",
              "bins": ["xclip"],
              "label": "Install xclip (dnf)",
            },
          ],
      },
  }
---

# Clipboard Skill

Interact with the system clipboard (text only) from any OpenClaw session. Uses `xclip` on Linux.

## Copy to Clipboard

Copy text to the clipboard:

```bash
echo "Hello, world!" | xclip -selection clipboard
```

## Paste from Clipboard

Output current clipboard contents:

```bash
xclip -selection clipboard -o
```

## Copy File Contents

Copy the contents of a file to the clipboard:

```bash
xclip -selection clipboard < /path/to/file.txt
```

## Install

```bash
sudo dnf install xclip
```
