#!/bin/bash
# discord-watcher/update.sh
# Usage: ./update.sh [token] [--period "24 hours ago"] [extra_exporter_flags...]

# Get script directory (works regardless of where script is called from)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TOKEN=${DISCORD_TOKEN}
PERIOD="24 hours ago"
EXTRA_ARGS=()

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --period)
            PERIOD="$2"
            shift 2
            ;;
        --token)
            TOKEN="$2"
            shift 2
            ;;
        -*)
            EXTRA_ARGS+=("$1")
            shift
            ;;
        *)
            if [ -z "$TOKEN" ]; then
                TOKEN="$1"
            else
                EXTRA_ARGS+=("$1")
            fi
            shift
            ;;
    esac
done

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
    echo "Error: DISCORD_TOKEN not found."
    echo "Usage: $0 [token] [--period \"24 hours ago\"] [extra_exporter_flags...]"
    echo ""
    echo "To get your token:"
    echo "  1. Open Discord in browser (https://discord.com/app)"
    echo "  2. Run this JS in console:"
    echo '     const f=document.createElement("iframe");f.style.display="none";'
    echo '     document.documentElement.appendChild(f);'
    echo '     console.log(f.contentWindow.localStorage.getItem("token"));f.remove()'
    exit 1
fi

# Set output directory
TIMESTAMP=$(date +%Y-%m-%d_%H-%M)
OUTPUT_DIR="$SCRIPT_DIR/exports/updates/$TIMESTAMP"
mkdir -p "$OUTPUT_DIR"

# Calculate --after date
AFTER_DATE=$(date -d "$PERIOD" +%Y-%m-%dT%H:%M:%S)

echo "Fetching messages since $AFTER_DATE ($PERIOD)..."
echo "Extra flags: ${EXTRA_ARGS[@]}"

# Ensure executable
chmod +x "$SCRIPT_DIR/dce/DiscordChatExporter.Cli"

# Run exportall
"$SCRIPT_DIR/dce/DiscordChatExporter.Cli" exportall \
    --token "$TOKEN" \
    --after "$AFTER_DATE" \
    --format PlainText \
    --output "$OUTPUT_DIR/%g/%C - %c.txt" \
    --parallel 1 \
    "${EXTRA_ARGS[@]}"

echo "Done. Updates saved to $OUTPUT_DIR"
