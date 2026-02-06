#!/usr/bin/env bash
set -euo pipefail

# Scout: Analyze a skill directory and output a structured JSON report.
# Usage: scout.sh <skill-directory>
# Output: JSON to stdout

usage() {
  echo "Usage: $0 <skill-directory>" >&2
  exit 1
}

[ "${1:-}" ] || usage

SKILL_DIR="$1"

if [ ! -d "$SKILL_DIR" ]; then
  echo "Error: '$SKILL_DIR' is not a directory" >&2
  exit 1
fi

SKILL_MD="$SKILL_DIR/SKILL.md"

# --- Parse SKILL.md ---
has_skill_md=false
skill_name=""
skill_description=""
has_frontmatter=false

if [ -f "$SKILL_MD" ]; then
  has_skill_md=true

  # Check for YAML frontmatter
  if head -1 "$SKILL_MD" | grep -q '^---$'; then
    has_frontmatter=true
    # Extract frontmatter fields
    frontmatter=$(sed -n '/^---$/,/^---$/p' "$SKILL_MD" | sed '1d;$d')
    skill_name=$(echo "$frontmatter" | grep -oP '^name:\s*\K.*' || true)
    skill_description=$(echo "$frontmatter" | grep -oP '^description:\s*\K.*' || true)
  fi
fi

# --- Dependency check ---
# Look for required bins in metadata and scripts
required_bins=""
if [ "$has_skill_md" = true ]; then
  # Extract bins from metadata JSON in frontmatter (deduplicated)
  required_bins=$(sed -n '/^---$/,/^---$/p' "$SKILL_MD" 2>/dev/null \
    | grep -oP '"bins"\s*:\s*\[\K[^\]]+' 2>/dev/null \
    | tr -d '"' | tr ',' '\n' | sed 's/^ *//;s/ *$//' \
    | sort -u || true)
fi

# Check which bins are available
bins_found=""
bins_missing=""
if [ -n "$required_bins" ]; then
  while IFS= read -r bin; do
    [ -z "$bin" ] && continue
    if command -v "$bin" >/dev/null 2>&1; then
      bins_found="${bins_found:+$bins_found, }\"$bin\""
    else
      bins_missing="${bins_missing:+$bins_missing, }\"$bin\""
    fi
  done <<< "$required_bins"
fi

# --- Quality score ---
score=0
max_score=0

# SKILL.md exists (+20)
max_score=$((max_score + 20))
[ "$has_skill_md" = true ] && score=$((score + 20))

# Has frontmatter (+15)
max_score=$((max_score + 15))
[ "$has_frontmatter" = true ] && score=$((score + 15))

# Has name (+10)
max_score=$((max_score + 10))
[ -n "$skill_name" ] && score=$((score + 10))

# Has description (+10)
max_score=$((max_score + 10))
[ -n "$skill_description" ] && score=$((score + 10))

# Has scripts directory (+15)
max_score=$((max_score + 15))
[ -d "$SKILL_DIR/scripts" ] && score=$((score + 15))

# Has README or docs (+10)
max_score=$((max_score + 10))
if [ -f "$SKILL_DIR/README.md" ] || [ -f "$SKILL_DIR/docs/README.md" ]; then
  score=$((score + 10))
fi

# Has config (+10)
max_score=$((max_score + 10))
if [ -d "$SKILL_DIR/config" ] || [ -f "$SKILL_DIR/config.json" ]; then
  score=$((score + 10))
fi

# Has changelog (+10)
max_score=$((max_score + 10))
if [ -f "$SKILL_DIR/CHANGELOG.md" ] || [ -f "$SKILL_DIR/changelog.md" ]; then
  score=$((score + 10))
fi

quality_pct=0
if [ "$max_score" -gt 0 ]; then
  quality_pct=$(( (score * 100) / max_score ))
fi

# --- Security scan ---
security_flags=""
flag_count=0

add_flag() {
  local severity="$1" pattern="$2" detail="$3"
  [ "$flag_count" -gt 0 ] && security_flags="$security_flags, "
  security_flags="$security_flags{\"severity\": \"$severity\", \"pattern\": \"$pattern\", \"detail\": \"$detail\"}"
  flag_count=$((flag_count + 1))
}

# Scan all text files in the skill directory
while IFS= read -r -d '' file; do
  relpath="${file#"$SKILL_DIR"/}"

  # Skip binary files
  file -b --mime-type "$file" 2>/dev/null | grep -q '^text/' || continue

  # CRITICAL: rm -rf with broad paths
  if grep -nP 'rm\s+-[a-zA-Z]*r[a-zA-Z]*f|rm\s+-[a-zA-Z]*f[a-zA-Z]*r' "$file" >/dev/null 2>&1; then
    add_flag "critical" "rm-rf" "Recursive force delete found in $relpath"
  fi

  # CRITICAL: curl/wget piped to shell
  if grep -nP '(curl|wget)\s.*\|\s*(bash|sh|eval|source)' "$file" >/dev/null 2>&1; then
    add_flag "critical" "curl-pipe-shell" "Remote code execution pattern in $relpath"
  fi

  # CRITICAL: eval usage
  if grep -nP '\beval\b' "$file" >/dev/null 2>&1; then
    add_flag "high" "eval" "eval usage found in $relpath"
  fi

  # HIGH: base64 decode + execute patterns
  if grep -nP 'base64\s+(-d|--decode).*\|' "$file" >/dev/null 2>&1; then
    add_flag "high" "base64-exec" "Base64 decode piped to execution in $relpath"
  fi

  # HIGH: modifying system files
  if grep -nP '(>|>>)\s*/etc/|/\.ssh/' "$file" >/dev/null 2>&1; then
    add_flag "high" "system-file-modify" "System file modification in $relpath"
  fi

  # MEDIUM: env var exfiltration
  if grep -nP 'curl.*\$\{?\w*(TOKEN|KEY|SECRET|PASS)' "$file" >/dev/null 2>&1; then
    add_flag "medium" "credential-exfil" "Possible credential exfiltration in $relpath"
  fi

done < <(find "$SKILL_DIR" -type f -print0 2>/dev/null)

# --- Build JSON output ---
cat <<EOF
{
  "skill": {
    "directory": "$(basename "$SKILL_DIR")",
    "name": $([ -n "$skill_name" ] && printf '"%s"' "$skill_name" || echo "null"),
    "description": $([ -n "$skill_description" ] && printf '"%s"' "$skill_description" || echo "null"),
    "hasSkillMd": $has_skill_md,
    "hasFrontmatter": $has_frontmatter
  },
  "dependencies": {
    "required": [${bins_found:+$bins_found}${bins_missing:+${bins_found:+, }$bins_missing}],
    "found": [${bins_found}],
    "missing": [${bins_missing}]
  },
  "quality": {
    "score": $score,
    "maxScore": $max_score,
    "percentage": $quality_pct
  },
  "security": {
    "flagCount": $flag_count,
    "flags": [${security_flags}]
  }
}
EOF
