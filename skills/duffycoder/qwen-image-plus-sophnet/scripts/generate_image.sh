#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  bash generate_image.sh --prompt "text" [options]

Options:
  --prompt "text"             Required. Image prompt.
  --negative-prompt "text"    Optional. Negative prompt.
  --size "1024*1024"          Optional. Default: 1024*1024
  --n 1                       Optional. Default: 1
  --watermark true|false      Optional. Default: false
  --prompt-extend true|false  Optional. Default: true
  --api-key "KEY"             Optional. If not set, uses SOPHNET_API_KEY.
  --poll-interval 2           Optional. Seconds between polls. Default: 2
  --max-wait 300              Optional. Max seconds to wait. Default: 300
USAGE
}

json_escape() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/\r/\\r/g' -e 's/\t/\\t/g' -e 's/\n/\\n/g'
}

to_bool() {
  local val
  val="$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')"
  case "$val" in
    true|1|yes|y)
      printf 'true'
      ;;
    false|0|no|n)
      printf 'false'
      ;;
    *)
      return 1
      ;;
  esac
}

extract_first_by_keys() {
  local resp="$1"
  shift
  local key val
  for key in "$@"; do
    val="$(printf '%s' "$resp" | awk -v key="$key" '
      match($0, "\""key"\"[[:space:]]*:[[:space:]]*\"([^\"]*)\"", m) { print m[1]; exit }
    ')"
    if [[ -n "$val" ]]; then
      printf '%s' "$val"
      return 0
    fi
  done
  return 1
}

extract_all_urls() {
  printf '%s' "$1" | awk '
    {
      s = $0
      while (match(s, /"url"[[:space:]]*:[[:space:]]*"[^"]*"/)) {
        seg = substr(s, RSTART, RLENGTH)
        sub(/^"url"[[:space:]]*:[[:space:]]*"/, "", seg)
        sub(/"$/, "", seg)
        print seg
        s = substr(s, RSTART + RLENGTH)
      }
    }
  '
}

PROMPT=""
NEGATIVE_PROMPT=""
SIZE="1024*1024"
N="1"
WATERMARK="false"
PROMPT_EXTEND="true"
API_KEY=""
POLL_INTERVAL="2"
MAX_WAIT="300"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prompt)
      PROMPT="$2"
      shift 2
      ;;
    --negative-prompt)
      NEGATIVE_PROMPT="$2"
      shift 2
      ;;
    --size)
      SIZE="$2"
      shift 2
      ;;
    --n)
      N="$2"
      shift 2
      ;;
    --watermark)
      WATERMARK="$2"
      shift 2
      ;;
    --prompt-extend)
      PROMPT_EXTEND="$2"
      shift 2
      ;;
    --api-key)
      API_KEY="$2"
      shift 2
      ;;
    --poll-interval)
      POLL_INTERVAL="$2"
      shift 2
      ;;
    --max-wait)
      MAX_WAIT="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$PROMPT" ]]; then
  echo "Error: --prompt is required." >&2
  exit 1
fi

if [[ -z "$API_KEY" ]]; then
  API_KEY="${SOPHNET_API_KEY:-}"
fi

if [[ -z "$API_KEY" ]]; then
  echo "Error: No API key provided. Set SOPHNET_API_KEY or use --api-key." >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "Error: curl not found." >&2
  exit 1
fi

prompt_esc="$(json_escape "$PROMPT")"
payload_input="\"prompt\":\"${prompt_esc}\""

if [[ -n "$NEGATIVE_PROMPT" ]]; then
  neg_esc="$(json_escape "$NEGATIVE_PROMPT")"
  payload_input="${payload_input},\"negative_prompt\":\"${neg_esc}\""
fi

params=""
if [[ -n "$SIZE" ]]; then
  size_esc="$(json_escape "$SIZE")"
  params="\"size\":\"${size_esc}\""
fi

if [[ -n "$N" ]]; then
  case "$N" in
    ''|*[!0-9]*)
      echo "Error: invalid --n (must be integer)." >&2
      exit 1
      ;;
  esac
  if [[ -n "$params" ]]; then params="${params},"; fi
  params="${params}\"n\":${N}"
fi

if [[ -n "$WATERMARK" ]]; then
  wm_bool="$(to_bool "$WATERMARK" || true)"
  if [[ -z "$wm_bool" ]]; then
    echo "Error: invalid --watermark (true/false)." >&2
    exit 1
  fi
  if [[ -n "$params" ]]; then params="${params},"; fi
  params="${params}\"watermark\":${wm_bool}"
fi

if [[ -n "$PROMPT_EXTEND" ]]; then
  pe_bool="$(to_bool "$PROMPT_EXTEND" || true)"
  if [[ -z "$pe_bool" ]]; then
    echo "Error: invalid --prompt-extend (true/false)." >&2
    exit 1
  fi
  if [[ -n "$params" ]]; then params="${params},"; fi
  params="${params}\"prompt_extend\":${pe_bool}"
fi

payload="{\"model\":\"Qwen-Image-Plus\",\"input\":{${payload_input}}"
if [[ -n "$params" ]]; then
  payload="${payload},\"parameters\":{${params}}"
fi
payload="${payload}}"

create_resp="$(curl -sS -X POST "https://www.sophnet.com/api/open-apis/projects/easyllms/imagegenerator/task" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "${payload}"
)"

if [[ -z "$create_resp" ]]; then
  echo "Error: empty response from create task API." >&2
  exit 1
fi

task_id="$(extract_first_by_keys "$create_resp" "task_id" "taskId" "taskID" "id" || true)"
if [[ -z "$task_id" ]]; then
  echo "Error: task_id not found in response." >&2
  echo "$create_resp" >&2
  exit 1
fi

echo "TASK_ID=${task_id}"

start_ts="$(date +%s)"
final_resp=""

while true; do
  now_ts="$(date +%s)"
  elapsed="$((now_ts - start_ts))"
  if (( elapsed > MAX_WAIT )); then
    echo "Error: timed out after ${MAX_WAIT}s." >&2
    exit 1
  fi

  status_resp="$(curl -sS -X GET "https://www.sophnet.com/api/open-apis/projects/easyllms/imagegenerator/task/${task_id}" \
    -H "Authorization: Bearer ${API_KEY}"
  )"

  status="$(extract_first_by_keys "$status_resp" "status" "taskStatus" "task_status" || true)"

  status_norm="$(printf "%s" "$status" | tr '[:upper:]' '[:lower:]')"
  if [[ "$status_norm" == "succeeded" || "$status_norm" == "success" ]]; then
    final_resp="$status_resp"
    echo "STATUS=succeeded"
    break
  fi
  if [[ "$status_norm" == "failed" || "$status_norm" == "error" ]]; then
    echo "STATUS=failed" >&2
    echo "$status_resp" >&2
    exit 1
  fi

  sleep "$POLL_INTERVAL"
done

urls="$(extract_all_urls "$final_resp" || true)"
if [[ -z "$urls" ]]; then
  echo "Error: url not found in response." >&2
  echo "$final_resp" >&2
  exit 1
fi
while IFS= read -r u; do
  [[ -n "$u" ]] && echo "IMAGE_URL=${u}"
done <<<"$urls"
