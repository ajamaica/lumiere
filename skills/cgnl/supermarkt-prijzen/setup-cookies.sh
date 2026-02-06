#!/usr/bin/env bash
# Setup AH cookies - now just calls auto-fetch-cookies.sh
# Kept for backwards compatibility

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔄 Redirecting to auto-fetch-cookies.sh..."
exec "$SCRIPT_DIR/auto-fetch-cookies.sh"
