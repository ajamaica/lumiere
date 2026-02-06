#!/usr/bin/env bash
set -euo pipefail

# image_to_relief.sh
#
# Wrapper that runs image_to_relief.py in a local venv (so pillow is available)
# and optionally writes a potrace SVG preview.

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <input_image> --out <out.stl> [--mode palette|grayscale] ..." >&2
  exit 2
fi

IN="$1"; shift
OUT=""
MODE="palette"
PALETTE=""
BASE="1.5"
PIXEL="0.4"
MINH="0.0"
MAXH="3.0"
PREVIEW=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --out) OUT="$2"; shift 2;;
    --mode) MODE="$2"; shift 2;;
    --palette) PALETTE="$2"; shift 2;;
    --base) BASE="$2"; shift 2;;
    --pixel) PIXEL="$2"; shift 2;;
    --min-height) MINH="$2"; shift 2;;
    --max-height) MAXH="$2"; shift 2;;
    --preview-svg) PREVIEW="$2"; shift 2;;
    -h|--help)
      echo "Usage: $0 <input_image> --out <out.stl> [--mode palette|grayscale] [--palette '#rrggbb=h,...'] [--base mm] [--pixel mm] [--min-height mm] [--max-height mm] [--preview-svg out.svg]"; exit 0;;
    *)
      echo "Unknown arg: $1" >&2
      exit 2
      ;;
  esac
done

if [[ -z "$OUT" ]]; then
  echo "--out is required" >&2
  exit 2
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Keep venv out of the git repo.
VENV_BASE="${XDG_CACHE_HOME:-$HOME/.cache}/agent-skills"
VENV="$VENV_BASE/image-to-relief-stl-venv"

mkdir -p "$VENV_BASE"

if [[ ! -x "$VENV/bin/python" ]]; then
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install --upgrade pip >/dev/null
  "$VENV/bin/pip" install pillow >/dev/null
fi

mkdir -p "$(dirname "$OUT")"

"$VENV/bin/python" "$SCRIPT_DIR/image_to_relief.py" \
  --in "$IN" \
  --out "$OUT" \
  --mode "$MODE" \
  --palette "$PALETTE" \
  --base "$BASE" \
  --pixel "$PIXEL" \
  --min-height "$MINH" \
  --max-height "$MAXH"

# Optional preview: trace a binary silhouette (best-effort)
if [[ -n "$PREVIEW" ]]; then
  command -v mkbitmap >/dev/null 2>&1 || { echo "mkbitmap not found (preview skipped)" >&2; exit 0; }
  command -v potrace >/dev/null 2>&1 || { echo "potrace not found (preview skipped)" >&2; exit 0; }

  TMPDIR="$(mktemp -d)"
  trap 'rm -rf "$TMPDIR"' EXIT

  # Build a black/white preview from the highest layer (anything >0)
  "$VENV/bin/python" - <<PY
from PIL import Image
img = Image.open("$IN").convert('RGBA')
# any non-white pixel becomes black
bg = (255,255,255)
mask = Image.new('1', img.size, 1)
pix = img.load()
for y in range(img.size[1]):
  for x in range(img.size[0]):
    r,g,b,a = pix[x,y]
    if a > 10 and (r,g,b) != bg:
      mask.putpixel((x,y), 0)
mask.save("$TMPDIR/preview.pbm")
PY

  potrace "$TMPDIR/preview.pbm" --svg --output "$PREVIEW" --alphamax 1.0 --opttolerance 0.2
  echo "$PREVIEW"
fi

echo "$OUT"
