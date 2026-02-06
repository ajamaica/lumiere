# Symptom Map

Use this map after running `scripts/snapshot_git_state.sh`.

| Symptom                           | Evidence to Confirm                                              | Lowest-Risk First Move                                                             | Escalation                                                          |
| --------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Phantom worktree path             | `worktree_list.txt` includes a path that does not exist          | `git worktree prune -v`                                                            | Remove stale `.git/worktrees/<name>` entry after backing up `.git/` |
| Branch "already used by worktree" | Branch delete/switch fails with lock message                     | Locate holder with `git worktree list --porcelain`; switch branch in that worktree | Remove stale worktree metadata after backup                         |
| Detached HEAD surprise            | `status.txt` says detached and `symbolic_ref_head.txt` is empty  | `git reflog`, then `git switch <known-branch>`                                     | Create `rescue/<timestamp>` branch and reattach later               |
| HEAD/ref disagreement             | `branch_current.txt` does not match symbolic ref expectation     | Use `git symbolic-ref HEAD refs/heads/<branch>`                                    | Edit `.git/HEAD` only after backup and failed symbolic-ref          |
| Missing object/ref errors         | "unknown revision", "not a valid object name", "cannot lock ref" | `git fetch --all --prune` and verify remote ref exists                             | Force local branch pointer with `git branch -f` after reflog check  |
| Zero-hash worktree entries        | Worktree list contains all-zero hash values                      | Prune worktrees and verify filesystem paths                                        | Recreate affected worktree from remote branch                       |

## Read the Room Before Acting

- If unpushed commits might exist, inspect `reflog_head.txt` before force operations.
- If multiple worktrees exist, fix branch ownership in the worktree that actually holds the branch.
- If refs are broadly broken, stop and back up `.git/` before continuing.
