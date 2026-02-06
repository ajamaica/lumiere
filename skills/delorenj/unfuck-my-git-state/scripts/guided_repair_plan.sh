#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat <<'EOF'
Usage:
  guided_repair_plan.sh --list
  guided_repair_plan.sh --symptom <symptom-key>
  guided_repair_plan.sh --repo <path-to-repo>
  guided_repair_plan.sh --snapshot <path-to-snapshot-dir>

Description:
  Print non-destructive recovery plans based on a known symptom or snapshot data.
  This script does not run fix commands; it only recommends them.

Symptom keys:
  orphaned-worktree-metadata
  phantom-branch-lock
  detached-head-state
  head-ref-disagreement
  missing-or-broken-refs
  zero-hash-worktree-entry
EOF
}

list_symptoms() {
  cat <<'EOF'
Available symptom keys:
  orphaned-worktree-metadata
  phantom-branch-lock
  detached-head-state
  head-ref-disagreement
  missing-or-broken-refs
  zero-hash-worktree-entry
EOF
}

capture_to_value() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    return 0
  fi
  grep -v '^#' "$file" | sed '/^[[:space:]]*$/d' | tail -n 1 || true
}

print_plan() {
  local symptom="$1"
  case "$symptom" in
    orphaned-worktree-metadata)
      cat <<'EOF'
[orphaned-worktree-metadata]
Run these first:
  git worktree list --porcelain
  git worktree prune -v
  git worktree list --porcelain

If stale entries still exist, back up `.git/` and then remove only the stale
`.git/worktrees/<name>` directory before rerunning prune.
EOF
      ;;
    phantom-branch-lock)
      cat <<'EOF'
[phantom-branch-lock]
Run these first:
  git worktree list --porcelain

Then:
  1) Identify the worktree currently owning the branch.
  2) In that worktree, switch to another branch (or intentionally detach HEAD).
  3) Retry branch delete/switch in your main repo.

If ownership metadata is stale after verification, back up `.git/` before manual cleanup.
EOF
      ;;
    detached-head-state)
      cat <<'EOF'
[detached-head-state]
Run these first:
  git symbolic-ref -q HEAD || true
  git reflog --date=iso -n 20
  git switch <known-good-branch>

If branch context is unknown:
  git switch -c rescue/$(date +%Y%m%d-%H%M%S)
EOF
      ;;
    head-ref-disagreement)
      cat <<'EOF'
[head-ref-disagreement]
Run these first:
  git branch --show-current
  git symbolic-ref -q HEAD
  git show-ref --verify refs/heads/<expected-branch>
  git symbolic-ref HEAD refs/heads/<expected-branch>

Fallback only after backup:
  echo "ref: refs/heads/<expected-branch>" > .git/HEAD
EOF
      ;;
    missing-or-broken-refs)
      cat <<'EOF'
[missing-or-broken-refs]
Run these first:
  git fetch --all --prune
  git show-ref --verify refs/remotes/origin/<branch>
  git branch -f <branch> origin/<branch>
  git switch <branch>

Before forcing branch pointers, inspect reflog for local-only commits:
  git reflog --date=iso -n 50 HEAD
EOF
      ;;
    zero-hash-worktree-entry)
      cat <<'EOF'
[zero-hash-worktree-entry]
Run these first:
  git worktree list --porcelain
  git worktree prune -v
  git worktree list --porcelain

If zero-hash entries persist, recreate affected worktree(s) from a verified branch ref.
EOF
      ;;
    *)
      echo "error: unknown symptom '$symptom'" >&2
      exit 1
      ;;
  esac
}

run_detection() {
  local snapshot_dir="$1"
  local worktree_file="$snapshot_dir/worktree_list.txt"
  local status_file="$snapshot_dir/status.txt"
  local branch_file="$snapshot_dir/branch_current.txt"
  local symbolic_file="$snapshot_dir/symbolic_ref_head.txt"
  local show_ref_file="$snapshot_dir/show_ref.txt"

  declare -a matches=()

  if [[ -f "$worktree_file" ]]; then
    local orphaned=0
    while IFS= read -r line; do
      local wt_path="${line#worktree }"
      if [[ ! -e "$wt_path" ]]; then
        orphaned=1
        break
      fi
    done < <(grep '^worktree ' "$worktree_file" || true)
    if [[ "$orphaned" -eq 1 ]]; then
      matches+=("orphaned-worktree-metadata")
    fi

    if grep -Eq '^HEAD[[:space:]]+0{40}$' "$worktree_file"; then
      # Unborn branches can legitimately show all-zero HEADs; avoid false positives.
      if [[ -f "$status_file" ]] && grep -Eq 'No commits yet|branch\.oid[[:space:]]+\(initial\)' "$status_file"; then
        :
      else
        matches+=("zero-hash-worktree-entry")
      fi
    fi
  fi

  if [[ -f "$status_file" ]] && grep -Eiq 'detached|HEAD detached' "$status_file"; then
    matches+=("detached-head-state")
  fi

  local cur_branch=""
  local sym_branch=""
  cur_branch="$(capture_to_value "$branch_file" || true)"
  sym_branch="$(capture_to_value "$symbolic_file" || true)"
  sym_branch="${sym_branch#refs/heads/}"
  if [[ -n "$cur_branch" && -n "$sym_branch" && "$cur_branch" != "$sym_branch" ]]; then
    matches+=("head-ref-disagreement")
  fi

  if [[ -f "$status_file" ]] && grep -Eiq 'unknown revision|not a valid object name|cannot lock ref|fatal:' "$status_file"; then
    matches+=("missing-or-broken-refs")
  fi
  if [[ -f "$show_ref_file" ]] && grep -Eiq 'not a valid|fatal:' "$show_ref_file"; then
    matches+=("missing-or-broken-refs")
  fi

  declare -A seen=()
  declare -a unique=()
  local symptom
  for symptom in "${matches[@]}"; do
    if [[ -z "${seen[$symptom]:-}" ]]; then
      unique+=("$symptom")
      seen[$symptom]=1
    fi
  done

  if [[ "${#unique[@]}" -eq 0 ]]; then
    echo "No deterministic symptom match found in snapshot: $snapshot_dir"
    echo "Use --symptom with one of:"
    list_symptoms
    return 0
  fi

  echo "Detected symptom(s) from snapshot: $snapshot_dir"
  for symptom in "${unique[@]}"; do
    echo
    print_plan "$symptom"
  done
}

resolve_snapshot_from_repo() {
  local repo="$1"
  local output
  output="$(bash "$SCRIPT_DIR/snapshot_git_state.sh" "$repo")"
  printf '%s\n' "$output" >&2

  local parsed
  parsed="$(printf '%s\n' "$output" | sed -n 's/^Directory: //p' | tail -n 1)"
  if [[ -n "$parsed" && -d "$parsed" ]]; then
    printf '%s\n' "$parsed"
    return 0
  fi

  local top
  top="$(git -C "$repo" rev-parse --show-toplevel)"
  local latest
  latest="$(ls -1dt "$top/.git-state-snapshots"/* 2>/dev/null | head -n 1 || true)"
  if [[ -n "$latest" && -d "$latest" ]]; then
    printf '%s\n' "$latest"
    return 0
  fi

  echo "error: unable to resolve snapshot directory for repo '$repo'" >&2
  return 1
}

SYMPTOM=""
SNAPSHOT=""
REPO=""
LIST_ONLY=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --symptom)
      [[ $# -ge 2 ]] || { echo "error: --symptom requires a value" >&2; usage; exit 1; }
      SYMPTOM="$2"
      shift 2
      ;;
    --snapshot)
      [[ $# -ge 2 ]] || { echo "error: --snapshot requires a value" >&2; usage; exit 1; }
      SNAPSHOT="$2"
      shift 2
      ;;
    --repo)
      [[ $# -ge 2 ]] || { echo "error: --repo requires a value" >&2; usage; exit 1; }
      REPO="$2"
      shift 2
      ;;
    --list|-l)
      LIST_ONLY=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "error: unknown argument '$1'" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ "$LIST_ONLY" -eq 1 ]]; then
  list_symptoms
  exit 0
fi

if [[ -n "$SYMPTOM" ]]; then
  print_plan "$SYMPTOM"
  exit 0
fi

if [[ -z "$SNAPSHOT" && -z "$REPO" ]]; then
  echo "error: provide --symptom, --snapshot, or --repo" >&2
  usage
  exit 1
fi

if [[ -z "$SNAPSHOT" && -n "$REPO" ]]; then
  SNAPSHOT="$(resolve_snapshot_from_repo "$REPO")"
fi

if [[ ! -d "$SNAPSHOT" ]]; then
  echo "error: snapshot directory not found: $SNAPSHOT" >&2
  exit 1
fi

run_detection "$SNAPSHOT"
