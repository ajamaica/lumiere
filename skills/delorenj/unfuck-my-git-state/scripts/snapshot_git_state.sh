#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-.}"

if ! git -C "$TARGET" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "error: '$TARGET' is not inside a Git work tree" >&2
  exit 1
fi

TOPLEVEL="$(git -C "$TARGET" rev-parse --show-toplevel)"
TOPLEVEL="$(cd "$TOPLEVEL" && pwd)"

GIT_DIR="$(git -C "$TARGET" rev-parse --git-dir)"
if [[ "$GIT_DIR" = /* ]]; then
  GIT_DIR_ABS="$GIT_DIR"
else
  GIT_DIR_ABS="$TOPLEVEL/$GIT_DIR"
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="$TOPLEVEL/.git-state-snapshots/$STAMP"
mkdir -p "$OUT_DIR"

run_capture() {
  local name="$1"
  shift
  local out="$OUT_DIR/$name.txt"
  {
    echo "# $name"
    echo "# command: $*"
    echo
    "$@"
  } >"$out" 2>&1 || true
}

{
  echo "snapshot_time=$STAMP"
  echo "target=$TARGET"
  echo "toplevel=$TOPLEVEL"
  echo "git_dir=$GIT_DIR_ABS"
  echo "git_version=$(git --version)"
} >"$OUT_DIR/context.txt"

if [[ -f "$GIT_DIR_ABS/HEAD" ]]; then
  cat "$GIT_DIR_ABS/HEAD" >"$OUT_DIR/head-file.txt" 2>/dev/null || true
fi

if [[ -d "$GIT_DIR_ABS/worktrees" ]]; then
  ls -la "$GIT_DIR_ABS/worktrees" >"$OUT_DIR/worktrees-dir-listing.txt" 2>/dev/null || true
fi

run_capture status git -C "$TARGET" status --porcelain=v2 --branch
run_capture branch_current git -C "$TARGET" branch --show-current
run_capture symbolic_ref_head git -C "$TARGET" symbolic-ref -q HEAD
run_capture worktree_list git -C "$TARGET" worktree list --porcelain
run_capture branch_all_verbose git -C "$TARGET" branch -vv --all
run_capture remote_verbose git -C "$TARGET" remote -v
run_capture show_ref git -C "$TARGET" show-ref --head
run_capture reflog_head git -C "$TARGET" reflog --date=iso -n 50 HEAD
run_capture fsck git -C "$TARGET" fsck --full --no-reflogs

cat <<EOF
Git state snapshot captured.
Directory: $OUT_DIR
Use these files to diagnose before changing refs or worktrees.
EOF
