#!/usr/bin/env bash
set -euo pipefail

prog="$(basename "$0")"

usage() {
  cat <<EOF
Usage: $prog [--format text|json] [--disk PATH]
Print basic system information.

Options:
  --format text|json   Output format (default: text)
  --disk PATH          Path to report disk usage for (default: /)
Examples:
  $prog
  $prog --format json --disk /home
EOF
  exit 2
}

# defaults
FORMAT="text"
DISK_PATH="/"

# simple argument parsing
while [ $# -gt 0 ]; do
  case "$1" in
    --format)
      shift
      [ $# -gt 0 ] || usage
      FORMAT="$1"
      shift
      ;;
    --format=*)
      FORMAT="${1#*=}"; shift
      ;;
    --disk)
      shift
      [ $# -gt 0 ] || usage
      DISK_PATH="$1"
      shift
      ;;
    --disk=*)
      DISK_PATH="${1#*=}"; shift
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo "Unknown arg: $1" >&2
      usage
      ;;
  esac
done

# fail if not using bash
if [ -z "${BASH_VERSION:-}" ]; then
  echo "ERROR: This script requires bash." >&2
  exit 3
fi

# --- collect info with portable fallbacks ---

# OS
OS_NAME="$(uname -s 2>/dev/null || true)"
OS_RELEASE="$(uname -r 2>/dev/null || true)"
OS_ARCH="$(uname -m 2>/dev/null || true)"
# lsb_release if available for nicer names
if command -v lsb_release >/dev/null 2>&1; then
  DISTRO="$(lsb_release -ds 2>/dev/null || true)"
else
  # macOS / *nix fallback
  DISTRO=""
fi

# uptime
if command -v uptime >/dev/null 2>&1; then
  UPTIME_RAW="$(uptime -p 2>/dev/null || uptime 2>/dev/null || true)"
else
  UPTIME_RAW=""
fi

# cpu count
if command -v nproc >/dev/null 2>&1; then
  CPU_COUNT="$(nproc 2>/dev/null || true)"
elif [[ "$OS_NAME" == "Darwin" ]]; then
  CPU_COUNT="$(sysctl -n hw.ncpu 2>/dev/null || true)"
else
  CPU_COUNT=""
fi

# memory: try free -b then sysctl on mac
MEM_TOTAL=""
MEM_FREE=""
if command -v free >/dev/null 2>&1; then
  # use bytes for precision and convert later
  if free -b >/dev/null 2>&1; then
    MEM_TOTAL="$(free -b | awk '/^Mem:/ {print $2}')"
    MEM_FREE="$(free -b | awk '/^Mem:/ {print $7}')"
  else
    MEM_TOTAL="$(free | awk '/^Mem:/ {print $2}')"
    MEM_FREE="$(free | awk '/^Mem:/ {print $7}')"
  fi
elif [[ "$OS_NAME" == "Darwin" ]] && command -v sysctl >/dev/null 2>&1; then
  MEM_TOTAL="$(sysctl -n hw.memsize 2>/dev/null || true)"
  # available memory on macOS is trickier; leave empty if unknown
  MEM_FREE=""
fi

# disk for path
DISK_TOTAL=""
DISK_USED=""
DISK_AVAIL=""
if df -B1 "$DISK_PATH" >/dev/null 2>&1; then
  # BSD df on macOS doesn't support -B1; fall back
  if df -B1 "$DISK_PATH" >/dev/null 2>&1 2>/dev/null; then
    read -r _ DISK_TOTAL DISK_USED DISK_AVAIL _ < <(df -B1 "$DISK_PATH" | awk 'NR==2{print $1,$2,$3,$4}')
  else
    # fall back to POSIX df -k (kilobytes) and convert to bytes
    read -r _ d_k d_u d_a _ < <(df -k "$DISK_PATH" | awk 'NR==2{print $1,$2,$3,$4,$5}')
    # convert kB to bytes
    if [[ "$d_k" =~ ^[0-9]+$ ]]; then
      DISK_TOTAL=$((d_k * 1024))
      DISK_USED=$((d_u * 1024))
      DISK_AVAIL=$((d_a * 1024))
    fi
  fi
fi

# helper: pretty bytes
pretty() {
  local bytes=$1
  if [ -z "$bytes" ] || ! [[ "$bytes" =~ ^[0-9]+$ ]]; then
    echo "n/a"
    return
  fi
  local unit=("B" "K" "M" "G" "T")
  local i=0
  local b="$bytes"
  while [ $b -ge 1024 ] && [ $i -lt 4 ]; do
    b=$((b / 1024))
    i=$((i + 1))
  done
  # show with one decimal if > 1024 at that step
  if [ $i -eq 0 ]; then
    echo "${bytes}B"
  else
    # produce a floating-ish representation using awk to get one decimal
    awk -v val="$bytes" -v p="$i" 'BEGIN{
      units[0]="B"; units[1]="K"; units[2]="M"; units[3]="G"; units[4]="T";
      v = val;
      for(i=0;i<p;i++) v/=1024;
      printf("%.1f%s", v, units[p]);
    }'
  fi
}

# Build output
if [ "$FORMAT" = "json" ]; then
  # manual JSON construction, with minimal escaping
  esc() {
    # escape " and backslash minimally
    printf '%s' "$1" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))' 2>/dev/null || \
    printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e ':a;N;$!ba;s/\n/\\n/g'
  }

  # use python if available to ensure valid JSON strings
  if command -v python3 >/dev/null 2>&1; then
    PY='python3 -c'
    # build json using python for safety
    python3 - <<PYCODE
import json,sys
obj = {
  "os": {"name": "$OS_NAME", "release": "$OS_RELEASE", "arch":"$OS_ARCH", "distro": "$DISTRO"},
  "uptime": "$UPTIME_RAW",
  "cpu": {"count": "$CPU_COUNT"},
  "memory": {"total_bytes": ${MEM_TOTAL:-'null'}, "free_bytes": ${MEM_FREE:-'null'}},
  "disk": {"path": "$DISK_PATH", "total_bytes": ${DISK_TOTAL:-'null'}, "used_bytes": ${DISK_USED:-'null'}, "avail_bytes": ${DISK_AVAIL:-'null'}}
}
json.dump(obj, sys.stdout, indent=2)
PYCODE
    exit 0
  else
    # minimal JSON fallback (may be less robust)
    printf '{\n'
    printf '  "os": {"name":"%s","release":"%s","arch":"%s","distro":"%s"},\n' \
      "$OS_NAME" "$OS_RELEASE" "$OS_ARCH" "$DISTRO"
    printf '  "uptime":"%s",\n' "$UPTIME_RAW"
    printf '  "cpu":{"count":"%s"},\n' "$CPU_COUNT"
    printf '  "memory":{"total_bytes":%s,"free_bytes":%s},\n' "${MEM_TOTAL:-null}" "${MEM_FREE:-null}"
    printf '  "disk":{"path":"%s","total_bytes":%s,"used_bytes":%s,"avail_bytes":%s}\n' \
      "$DISK_PATH" "${DISK_TOTAL:-null}" "${DISK_USED:-null}" "${DISK_AVAIL:-null}"
    printf '}\n'
    exit 0
  fi
else
  # human-friendly text
  echo "System information:"
  if [ -n "$DISTRO" ]; then
    echo "  OS: $DISTRO ($OS_NAME $OS_RELEASE / $OS_ARCH)"
  else
    echo "  OS: $OS_NAME $OS_RELEASE ($OS_ARCH)"
  fi
  [ -n "$UPTIME_RAW" ] && echo "  Uptime: $UPTIME_RAW"
  [ -n "$CPU_COUNT" ] && echo "  CPUs: $CPU_COUNT"
  if [ -n "$MEM_TOTAL" ]; then
    echo "  Memory: total=$(pretty "$MEM_TOTAL"), free=$(pretty "${MEM_FREE:-0}")"
  else
    echo "  Memory: n/a"
  fi
  if [ -n "$DISK_TOTAL" ]; then
    echo "  Disk ($DISK_PATH): total=$(pretty "$DISK_TOTAL"), used=$(pretty "${DISK_USED:-0}"), avail=$(pretty "${DISK_AVAIL:-0}")"
  else
    # try df -h as a fallback for humans
    echo -n "  Disk ($DISK_PATH): "
    if df -h "$DISK_PATH" >/dev/null 2>&1; then
      df -h "$DISK_PATH" | awk 'NR==2{print $2" total, "$3" used, "$4" avail ("$5" used)"}'
    else
      echo "n/a"
    fi
  fi
fi