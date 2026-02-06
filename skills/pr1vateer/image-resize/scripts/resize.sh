#!/usr/bin/env bash
set -euo pipefail

# resize.sh: Resize images using ImageMagick.
# Usage: resize.sh <input-path> <geometry> [output-path]
# geometry examples: 800x, 800x600, 50%, 800x800\>

progname="$(basename "$0")"

usage() {
  cat <<EOF
Usage: $progname <input-path> <geometry> [output-path]
Examples:
  $progname input.jpg 800x output.jpg      # width 800px, preserve aspect
  $progname input.jpg 800x600 output.jpg   # exact geometry
  $progname input.png 50% output.png       # scale to 50%
  $progname input.jpg 800x                  # output defaults to input-resized.<ext>
EOF
  exit 2
}

# arguments
if [ $# -lt 2 ] || [ $# -gt 3 ]; then
  usage
fi

input="$1"
geometry="$2"
output="${3:-}"

# check input exists
if [ ! -f "$input" ]; then
  echo "ERROR: input file not found: $input" >&2
  exit 3
fi

# figure out ImageMagick command (magick preferred on newer IM versions)
if command -v magick >/dev/null 2>&1; then
  IM_CMD="magick"
elif command -v convert >/dev/null 2>&1; then
  IM_CMD="convert"
else
  echo "ERROR: ImageMagick not found (magick or convert). Install ImageMagick and retry." >&2
  exit 4
fi

# if output omitted, create inferred output path next to input
if [ -z "$output" ]; then
  dir="$(dirname -- "$input")"
  base="$(basename -- "$input")"
  ext="${base##*.}"
  name="${base%.*}"
  output="${dir}/${name}-resized.${ext}"
fi

# create output dir if needed
outdir="$(dirname -- "$output")"
if [ ! -d "$outdir" ]; then
  mkdir -p "$outdir"
fi

# Prevent some common injection problems: don't allow geometry that contains ';' or '|' or '`'
if echo "$geometry" | grep -qE '[;|`$&<>]'; then
  echo "ERROR: geometry contains suspicious characters." >&2
  exit 5
fi

# Run ImageMagick. For 'magick' command, syntax is: magick input -resize GEOMETRY output
# For older 'convert', syntax is similar.
echo "Resizing: $input -> $output (geometry: $geometry)"
if [ "$IM_CMD" = "magick" ]; then
  magick "$input" -resize "$geometry" "$output"
else
  convert "$input" -resize "$geometry" "$output"
fi

echo "Done: $output"