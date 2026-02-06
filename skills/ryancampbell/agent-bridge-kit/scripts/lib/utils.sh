#!/usr/bin/env bash
# utils.sh — Logging, colors, error handling

if [[ -t 1 ]]; then
  RED='\033[0;31m' GREEN='\033[0;32m' YELLOW='\033[0;33m'
  BLUE='\033[0;34m' CYAN='\033[0;36m' BOLD='\033[1m'
  DIM='\033[2m' RESET='\033[0m'
else
  RED='' GREEN='' YELLOW='' BLUE='' CYAN='' BOLD='' DIM='' RESET=''
fi

log_info()    { echo -e "${BLUE}ℹ${RESET} $*"; }
log_success() { echo -e "${GREEN}✓${RESET} $*"; }
log_warn()    { echo -e "${YELLOW}⚠${RESET} $*" >&2; }
log_error()   { echo -e "${RED}✗${RESET} $*" >&2; }
log_dim()     { echo -e "${DIM}$*${RESET}"; }

die() { log_error "$@"; exit 1; }

require_tool() {
  command -v "$1" &>/dev/null || die "Required tool not found: $1"
}

check_dependencies() {
  require_tool curl
  require_tool jq
}

BRIDGE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
