#!/usr/bin/env bash
set -euo pipefail

redact_value() {
  local val="$1"
  local len=${#val}
  if [ "$len" -le 4 ]; then
    printf '****'
  else
    printf '****%s' "${val: -4}"
  fi
}

redact_line() {
  local line="$1"
  local key val red

  if [[ "$line" =~ ([Bb]earer)[[:space:]]+([A-Za-z0-9._~+/=-]{8,}) ]]; then
    val="${BASH_REMATCH[2]}"
    red=$(redact_value "$val")
    line="${line/$val/$red}"
  fi

  if [[ "$line" =~ ([Tt]oken|[Pp]assword|[Ss]ecret|api[_-]?[Kk]ey|[Cc]ookie|[Aa]uth)[^=:\"]*[:=][[:space:]]*([A-Za-z0-9._~+/=-]{6,}) ]]; then
    val="${BASH_REMATCH[2]}"
    red=$(redact_value "$val")
    line="${line/$val/$red}"
  fi

  if [[ "$line" =~ \"([^\"]*(token|password|secret|api[_-]?key|cookie|auth)[^\"]*)\"[[:space:]]*:[[:space:]]*\"([^\"]{6,})\" ]]; then
    val="${BASH_REMATCH[3]}"
    red=$(redact_value "$val")
    line="${line/$val/$red}"
  fi

  printf '%s' "$line"
}

redact_text() {
  local input="$1"
  local out=""
  while IFS= read -r line; do
    line=$(redact_line "$line")
    out+="$line"$'\n'
  done <<< "$input"
  printf '%s' "${out%$'\n'}"
}

json_escape() {
  printf '%s' "$1" \
    | sed -e 's/\\/\\\\/g' \
          -e 's/"/\\"/g' \
          -e ':a' -e 'N' -e '$!ba' -e 's/\n/\\n/g'
}
