#!/bin/bash
# Wrapper script to ensure PATH includes system directories
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

# Find node - prefer nvm if available
if [ -f "$HOME/.nvm/nvm.sh" ]; then
    source "$HOME/.nvm/nvm.sh"
fi

cd "$(dirname "$0")/.."
exec node lib/server.js
