# Filesystem Hygiene Checks

Use this file for `fs.perms.core`, `fs.symlinks`, `fs.synced_folder`, `fs.suid_sgid_in_openclaw_paths`, and `fs.world_writable_in_openclaw_paths`. Follow every step.

## Evidence keys

- `fs.stat.state_dir`
- `fs.stat.config`
- `fs.stat.credentials_dir`
- `fs.stat.sessions_dir`
- `fs.stat.auth_profiles`
- Windows: `fs.icacls.*`
- `fs.symlinks_state`
- `fs.synced_folder`
- `fs.suid_sgid_state`, `fs.suid_sgid_workspace`
- `fs.world_writable_state`, `fs.world_writable_workspace`

## Permissions baseline

Target permissions:

- Directories: `700` for state dir and credential dirs.
- Secret files: `600` for config, auth-profiles, credentials.

Steps:

1. Parse each `fs.stat.*` line in the format `type|perm|owner|group|path`.
2. If permissions are more permissive than target, mark `VULNERABLE`.
3. If any `fs.stat.*` value is `missing` or `stat_unavailable`, mark `VULNERABLE` with `(UNVERIFIED)`.
4. On Windows, use `icacls` output to ensure only the current user and SYSTEM have access.

## Symlinks

Steps:

1. If `fs.symlinks_state` is empty, mark `OK`.
2. If any symlink points outside the expected OpenClaw paths, mark `VULNERABLE`.

## Synced folders

Steps:

1. Read `fs.synced_folder`.
2. If `synced=true`, mark `VULNERABLE` because secrets are replicated.

## SUID/SGID and world-writable

Steps:

1. If any paths are listed in `fs.suid_sgid_*`, mark `VULNERABLE` (critical).
2. If any paths are listed in `fs.world_writable_*`, mark `VULNERABLE` (critical).

Use literal excerpts in Evidence for each row.
