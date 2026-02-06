#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GUIDED_SCRIPT="$SCRIPT_DIR/guided_repair_plan.sh"

if [[ ! -x "$GUIDED_SCRIPT" ]]; then
  echo "error: guided script not executable: $GUIDED_SCRIPT" >&2
  exit 1
fi

WORK_ROOT="$(mktemp -d -t git-state-harness-XXXXXX)"
KEEP_TEMP=0
SINGLE_SCENARIO=""

cleanup() {
  if [[ "$KEEP_TEMP" -eq 1 ]]; then
    echo "Keeping harness workspace: $WORK_ROOT"
    return 0
  fi
  if [[ -d "$WORK_ROOT" ]]; then
    find "$WORK_ROOT" -mindepth 1 -depth -delete 2>/dev/null || true
    rmdir "$WORK_ROOT" 2>/dev/null || true
  fi
}
trap cleanup EXIT

usage() {
  cat <<'EOF'
Usage:
  regression_harness.sh
  regression_harness.sh --scenario <name>
  regression_harness.sh --list
  regression_harness.sh --keep-temp

Scenarios:
  orphaned-worktree
  detached-head
  zero-hash-worktree
  manual-phantom-branch-lock
EOF
}

list_scenarios() {
  cat <<'EOF'
orphaned-worktree
detached-head
zero-hash-worktree
manual-phantom-branch-lock
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --scenario)
      [[ $# -ge 2 ]] || { echo "error: --scenario requires a value" >&2; exit 1; }
      SINGLE_SCENARIO="$2"
      shift 2
      ;;
    --keep-temp)
      KEEP_TEMP=1
      shift
      ;;
    --list)
      list_scenarios
      exit 0
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

make_repo() {
  local name="$1"
  local repo="$WORK_ROOT/$name"
  mkdir -p "$repo"
  git -C "$repo" init -q
  git -C "$repo" config user.name "Harness Bot"
  git -C "$repo" config user.email "harness@example.com"
  echo "seed" >"$repo/seed.txt"
  git -C "$repo" add seed.txt
  git -C "$repo" commit -q -m "seed"
  printf '%s\n' "$repo"
}

assert_contains() {
  local haystack="$1"
  local needle="$2"
  if printf '%s\n' "$haystack" | grep -Fq "$needle"; then
    return 0
  fi
  return 1
}

scenario_orphaned_worktree() {
  local repo wt out
  repo="$(make_repo orphaned-worktree)"
  git -C "$repo" branch repair-me
  wt="$WORK_ROOT/orphaned-worktree-wt"
  git -C "$repo" worktree add -q "$wt" repair-me

  find "$wt" -mindepth 1 -delete
  rmdir "$wt"

  out="$(bash "$GUIDED_SCRIPT" --repo "$repo")"
  assert_contains "$out" "[orphaned-worktree-metadata]" &&
    assert_contains "$out" "git worktree prune -v"
}

scenario_detached_head() {
  local repo out
  repo="$(make_repo detached-head)"
  git -C "$repo" checkout -q --detach
  out="$(bash "$GUIDED_SCRIPT" --repo "$repo")"
  assert_contains "$out" "[detached-head-state]" &&
    assert_contains "$out" "git reflog --date=iso -n 20"
}

scenario_zero_hash_worktree() {
  local repo wt meta out
  repo="$(make_repo zero-hash-worktree)"
  git -C "$repo" branch zero-head
  wt="$WORK_ROOT/zero-hash-worktree-wt"
  git -C "$repo" worktree add -q "$wt" zero-head

  meta="$(find "$repo/.git/worktrees" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
  [[ -n "$meta" ]] || return 1
  printf '0000000000000000000000000000000000000000\n' >"$meta/HEAD"

  out="$(bash "$GUIDED_SCRIPT" --repo "$repo")"
  assert_contains "$out" "[zero-hash-worktree-entry]"
}

scenario_manual_phantom_branch_lock() {
  local out
  out="$(bash "$GUIDED_SCRIPT" --symptom phantom-branch-lock)"
  assert_contains "$out" "[phantom-branch-lock]" &&
    assert_contains "$out" "git worktree list --porcelain"
}

run_scenario() {
  local name="$1"
  case "$name" in
    orphaned-worktree) scenario_orphaned_worktree ;;
    detached-head) scenario_detached_head ;;
    zero-hash-worktree) scenario_zero_hash_worktree ;;
    manual-phantom-branch-lock) scenario_manual_phantom_branch_lock ;;
    *)
      echo "error: unknown scenario '$name'" >&2
      return 1
      ;;
  esac
}

PASS=0
FAIL=0
declare -a SCENARIOS=(
  "orphaned-worktree"
  "detached-head"
  "zero-hash-worktree"
  "manual-phantom-branch-lock"
)

if [[ -n "$SINGLE_SCENARIO" ]]; then
  SCENARIOS=("$SINGLE_SCENARIO")
fi

for scenario in "${SCENARIOS[@]}"; do
  if run_scenario "$scenario"; then
    echo "PASS $scenario"
    PASS=$((PASS + 1))
  else
    echo "FAIL $scenario"
    FAIL=$((FAIL + 1))
  fi
done

echo
echo "Harness result: $PASS passed, $FAIL failed"
if [[ "$FAIL" -ne 0 ]]; then
  exit 1
fi
