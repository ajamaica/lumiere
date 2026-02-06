# Supply Chain Checks

Use this for `supply_chain.skills_inventory`, `supply_chain.skills_pattern_scan`, `supply_chain.skills_exec_files`, and `supply_chain.plugins_allowlist`. Follow every step.

## Evidence keys

- `openclaw.skills_list`
- `skills.state_inventory`
- `skills.workspace_inventory`
- `skills.extra_inventory.*`
- `skills.state_pattern_scan`
- `skills.workspace_pattern_scan`
- `skills.extra_pattern_scan.*`
- `skills.state_exec_files`
- `skills.workspace_exec_files`
- `skills.extra_exec_files.*`
- `openclaw.plugins_list`
- `config.summary`

## Skills inventory

Steps:

1. Read `openclaw.skills_list` to determine expected installed skills.
2. Read `skills.state_inventory` and `skills.workspace_inventory`.
3. If the skills list is empty and both inventories are missing, mark `OK` (info).
4. If skills exist in the list but inventories are missing, mark `VULNERABLE` with `(UNVERIFIED)`.
5. If any inventory contains unexpected binaries or archives, mark `VULNERABLE`.

## Pattern scan

Steps:

1. Review pattern scan outputs for remote fetch/exec, obfuscation, persistence, or credential harvesting.
2. If any high-risk patterns exist, mark `VULNERABLE`.
3. If scans are missing or `rg` is unavailable, mark `VULNERABLE` with `(UNVERIFIED)`.

## Executable files

Steps:

1. Check `skills.*_exec_files` outputs.
2. If any executable files are present and not clearly expected, mark `VULNERABLE` (warn or critical).

## Plugins allowlist

Steps:

1. Read `openclaw.plugins_list` to see which plugins are loaded.
2. Read `plugins.allow` from `config.summary`.
3. If plugins are loaded and `plugins.allow` is missing or wildcarded, mark `VULNERABLE`.

Use literal excerpts in Evidence for each row.
