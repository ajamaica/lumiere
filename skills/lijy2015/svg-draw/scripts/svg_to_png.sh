#!/bin/bash
# Convert SVG to PNG using rsvg-convert
# Usage: ./svg_to_png.sh input.svg output.png [width] [height]

INPUT="$1"
OUTPUT="$2"
WIDTH="${3:-400}"
HEIGHT="${4:-400}"

if [ -z "$INPUT" ] || [ -z "$OUTPUT" ]; then
    echo "Usage: $0 <input.svg> <output.png> [width] [height]"
    exit 1
fi

rsvg-convert -w "$WIDTH" -h "$HEIGHT" "$INPUT" -o "$OUTPUT"
echo "Converted: $INPUT → $OUTPUT (${WIDTH}x${HEIGHT})"
