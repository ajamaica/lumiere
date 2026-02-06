#!/bin/bash
# gdocs-create: Create Google Doc from Markdown file
# Author: techla
# Usage: gdocs-create <markdown-file> ["Document Title"]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check arguments
if [ $# -lt 1 ]; then
    echo -e "${RED}Error: Missing arguments${NC}"
    echo "Usage: gdocs-create <markdown-file> [\"Document Title\"]"
    echo "Example: gdocs-create report.md \"My Report\""
    exit 1
fi

MD_FILE="$1"
DOC_TITLE="${2:-$(basename "$MD_FILE" .md)}"

# Check if markdown file exists
if [ ! -f "$MD_FILE" ]; then
    echo -e "${RED}Error: File not found: $MD_FILE${NC}"
    exit 1
fi

# Check for gog CLI
if ! command -v gog &> /dev/null; then
    echo -e "${RED}Error: gog CLI not found. Please install gog first.${NC}"
    exit 1
fi

# Setup pandoc
PANDOC_BIN="/tmp/pandoc-3.1.11/bin/pandoc"

if [ ! -f "$PANDOC_BIN" ]; then
    echo -e "${YELLOW}Downloading pandoc...${NC}"
    cd /tmp
    wget -q https://github.com/jgm/pandoc/releases/download/3.1.11/pandoc-3.1.11-linux-amd64.tar.gz
    tar xzf pandoc-3.1.11-linux-amd64.tar.gz
    rm pandoc-3.1.11-linux-amd64.tar.gz
    echo -e "${GREEN}Pandoc installed to $PANDOC_BIN${NC}"
fi

# Create temp docx file
TMP_DIR=$(mktemp -d)
DOCX_FILE="$TMP_DIR/${DOC_TITLE// /_}.docx"

echo -e "${YELLOW}Converting Markdown to DOCX...${NC}"
"$PANDOC_BIN" "$MD_FILE" -o "$DOCX_FILE"

if [ ! -f "$DOCX_FILE" ]; then
    echo -e "${RED}Error: Failed to convert to DOCX${NC}"
    rm -rf "$TMP_DIR"
    exit 1
fi

echo -e "${GREEN}✓ Converted to DOCX${NC}"

# Upload to Drive
echo -e "${YELLOW}Uploading to Google Drive...${NC}"
UPLOAD_OUTPUT=$(gog drive upload "$DOCX_FILE" 2>&1)

# Extract the link from output
DOC_LINK=$(echo "$UPLOAD_OUTPUT" | grep "^link" | awk '{print $2}')
DOC_ID=$(echo "$UPLOAD_OUTPUT" | grep "^id" | awk '{print $2}')

if [ -z "$DOC_LINK" ]; then
    echo -e "${RED}Error: Failed to upload to Drive${NC}"
    echo "$UPLOAD_OUTPUT"
    rm -rf "$TMP_DIR"
    exit 1
fi

# Cleanup
rm -rf "$TMP_DIR"

echo ""
echo -e "${GREEN}✓ Google Doc created successfully!${NC}"
echo ""
echo "📄 Title: $DOC_TITLE"
echo "🔗 Link: $DOC_LINK"
echo ""
echo -e "${YELLOW}Note:${NC} The document has been converted to Google Docs format and is ready to edit."

# Output just the link for easy copying
exit 0
