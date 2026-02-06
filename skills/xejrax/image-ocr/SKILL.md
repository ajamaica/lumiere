---
name: image-ocr
description: "Extract text from images using Tesseract OCR"
metadata:
  {
    "openclaw":
      {
        "emoji": "👁️",
        "requires": { "bins": ["tesseract"] },
        "install":
          [
            {
              "id": "dnf",
              "kind": "dnf",
              "package": "tesseract",
              "bins": ["tesseract"],
              "label": "Install via dnf",
            },
          ],
      },
  }
---

# Image OCR

Extract text from images using Tesseract OCR. Supports multiple languages and image formats including PNG, JPEG, TIFF, and BMP.

## Commands

```bash
# Extract text from an image (default: English)
image-ocr "screenshot.png"

# Extract text with a specific language
image-ocr "document.jpg" --lang eng
```

## Install

```bash
sudo dnf install tesseract
```
