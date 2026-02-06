#!/bin/sh
set -e

usage() {
  cat <<'EOF'
Generate images using OpenRouter Nano Banana Pro (Gemini 3 Pro Image Preview).

Usage:
  sh /abs/path/generate_image.sh --prompt "your image description" \
    [--filename "output-name.png" | --filename auto] \
    [--resolution 1K|2K|4K] \
    [--api-key KEY]

Notes:
  - This script generates new images only (no input image editing).
  - Images are saved under ~/.openclaw/workspace/outputs/nano-banana-pro-openrouter
EOF
}

json_escape() {
  # Escape backslash, double quotes, and control characters for JSON strings
  printf '%s' "$1" \
    | sed -e 's/\\/\\\\/g' \
          -e 's/"/\\"/g' \
          -e ':a;N;$!ba;s/\n/\\n/g' \
          -e 's/\r/\\r/g' \
          -e 's/\t/\\t/g'
}

slugify() {
  slug=$(printf '%s' "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | sed 's/[^a-z0-9 _-]/ /g; s/[ _-]\+/-/g; s/^-//; s/-$//')
  if [ -z "$slug" ]; then
    slug="image"
  fi
  printf '%.40s' "$slug"
}

load_env_file() {
  env_path=$1
  [ -f "$env_path" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      ''|\#*) continue ;;
    esac
    case "$line" in
      *=*) ;;
      *) continue ;;
    esac
    key=${line%%=*}
    value=${line#*=}
    key=$(printf '%s' "$key" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')
    value=$(printf '%s' "$value" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')
    case "$key" in
      ''|*[!A-Za-z0-9_]*|[0-9]*)
        continue
        ;;
    esac
    case "$value" in
      \"*\") value=${value#\"}; value=${value%\"} ;;
      \'*\') value=${value#\'}; value=${value%\'} ;;
    esac
    eval "is_set=\${$key+x}"
    if [ -z "$is_set" ]; then
      export "$key=$value"
    fi
  done < "$env_path"
}

extract_image_urls() {
  awk '{
    s=$0
    while (match(s, /"image_url"[[:space:]]*:[[:space:]]*{[^}]*"url"[[:space:]]*:[[:space:]]*"([^"]+)"/, m)) {
      print m[1]
      s=substr(s, RSTART+RLENGTH)
    }
    while (match(s, /"imageUrl"[[:space:]]*:[[:space:]]*{[^}]*"url"[[:space:]]*:[[:space:]]*"([^"]+)"/, m)) {
      print m[1]
      s=substr(s, RSTART+RLENGTH)
    }
  }'
}

prompt=""
filename=""
resolution="1K"
api_key=""

while [ $# -gt 0 ]; do
  case "$1" in
    -p|--prompt)
      shift
      prompt=$1
      ;;
    -f|--filename)
      shift
      filename=$1
      ;;
    -r|--resolution)
      shift
      resolution=$1
      ;;
    -k|--api-key)
      shift
      api_key=$1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --)
      shift
      break
      ;;
    *)
      echo "Error: Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

if [ -z "$prompt" ]; then
  echo "Error: --prompt is required." >&2
  usage >&2
  exit 1
fi

case "$resolution" in
  1K|2K|4K) ;;
  *)
    echo "Error: Invalid resolution '$resolution' (use 1K|2K|4K)." >&2
    exit 1
    ;;
esac

script_dir=$(cd "$(dirname "$0")" && pwd)
skill_dir=$(cd "$script_dir/.." && pwd)

load_env_file "$PWD/.env"
load_env_file "$skill_dir/.env"

if [ -z "$api_key" ]; then
  api_key=${OPENROUTER_API_KEY:-}
fi

if [ -z "$api_key" ]; then
  echo "Error: No API key provided." >&2
  echo "Please either:" >&2
  echo "  1. Provide --api-key argument" >&2
  echo "  2. Set OPENROUTER_API_KEY environment variable" >&2
  exit 1
fi

base_url=${OPENROUTER_BASE_URL:-}
if [ -z "$base_url" ]; then
  echo "Error: No API base URL provided." >&2
  echo "Please set OPENROUTER_BASE_URL environment variable" >&2
  exit 1
fi

if [ -z "$filename" ] || [ "$filename" = "auto" ] || [ "$filename" = "timestamp" ] || [ "$filename" = "now" ]; then
  timestamp=$(date +"%Y-%m-%d-%H-%M-%S")
  slug=$(slugify "$prompt")
  filename="${timestamp}-${slug}.png"
  printf 'Auto filename: %s\n' "$filename"
fi

output_base_dir="$HOME/.openclaw/workspace/outputs/nano-banana-pro-openrouter"
mkdir -p "$output_base_dir"
output_name=$(basename "$filename")
output_path="$output_base_dir/$output_name"

escaped_prompt=$(json_escape "$prompt")

payload=$(cat <<EOF
{
  "model": "google/gemini-3-pro-image-preview",
  "messages": [
    {
      "role": "user",
      "content": "$escaped_prompt"
    }
  ],
  "modalities": ["image", "text"],
  "image_config": {"image_size": "$resolution"},
  "stream": false
}
EOF
)

response_file=$(mktemp)
trap 'rm -f "$response_file"' EXIT

if ! http_code=$(curl -sS -o "$response_file" -w "%{http_code}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $api_key" \
  -d "$payload" \
  "$base_url"); then
  echo "Error: Request failed." >&2
  exit 1
fi

case "$http_code" in
  2??) ;;
  *)
    echo "Error: API returned HTTP $http_code" >&2
    cat "$response_file" >&2
    exit 1
    ;;
esac

response_one_line=$(tr -d '\n' < "$response_file")

error_message=$(printf '%s' "$response_one_line" \
  | sed -n 's/.*"error"[^{]*{[^}]*"message"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
if [ -n "$error_message" ]; then
  echo "Error: $error_message" >&2
  exit 1
fi

urls=$(printf '%s' "$response_one_line" | extract_image_urls)
if [ -z "$urls" ]; then
  echo "Error: No image URLs found in response." >&2
  exit 1
fi

index=1
printf '%s\n' "$urls" | while IFS= read -r raw_url; do
  [ -z "$raw_url" ] && continue
  url=$(printf '%s' "$raw_url" | sed 's#\\/#/#g; s#\\\\#\\#g; s#\\"#"#g')
  if [ "$index" -eq 1 ]; then
    target_path="$output_path"
  else
    base="${output_path%.*}"
    ext="${output_path##*.}"
    if [ "$base" = "$output_path" ]; then
      target_path="${output_path}-$index"
    else
      target_path="${base}-$index.${ext}"
    fi
  fi

  case "$url" in
    data:*base64,*)
      data="${url#*,}"
      printf '%s' "$data" | base64 -d > "$target_path"
      ;;
    data:*)
      data="${url#*,}"
      printf '%b' "$(printf '%s' "$data" | sed 's/%/\\x/g')" > "$target_path"
      ;;
    *)
      curl -sS -o "$target_path" "$url"
      ;;
  esac

  printf '\nImage saved: %s\nMEDIA_URL=file://%s\n' "$target_path" "$target_path"
  index=$((index + 1))
done
