# Required Checks

You must include a row for every check ID below. Do not omit rows. Do not add extra checks unless the user requests them.

## How to use this file

1. For each check ID, collect evidence only from the listed `verified-bundle.json` keys.
2. If any required evidence key is missing, set Result to `VULNERABLE` and add `(UNVERIFIED)` in Evidence.
3. Every row must cite the exact key used for evidence.
4. Result must be only `OK` or `VULNERABLE`.
5. Use the reference guides for classification. Use `references/gateway.md` for `gateway.exposure_and_auth`, `references/discovery.md` for discovery checks, and `references/canvas-browser.md` for canvas and browser checks.
6. When a check is unverified, request a re-run of `scripts/collect_verified.sh`.

| Check ID                            | Required evidence keys                                                                                                                       | Notes                                      |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| host.os                             | `os.uname` plus `os.release` or `os.sw_vers`                                                                                                 | Use available OS evidence.                 |
| host.runtime_context                | `env.virt`                                                                                                                                   | If `env.virt` is missing, mark unverified. |
| net.listening_ports                 | `net.listening`                                                                                                                              | Show only relevant lines.                  |
| net.firewall                        | any `fw.*`                                                                                                                                   | If only `fw.none`, mark unverified.        |
| gateway.exposure_and_auth           | `config.summary`, `openclaw.security_audit`, `net.listening`                                                                                 | Prefer audit output when present.          |
| discovery.mdns_leak                 | `config.summary` and `net.listening`                                                                                                         | Use both config and live listeners.        |
| discovery.wide_area                 | `config.summary`                                                                                                                             |                                            |
| canvasHost.exposure                 | `config.summary`, `openclaw.security_audit`, `net.listening`                                                                                 |                                            |
| browser.control_exposure            | `config.summary`, `openclaw.security_audit`, `net.listening`                                                                                 |                                            |
| tools.policy_baseline               | `config.summary` plus `openclaw.security_audit` (and `openclaw.approvals` if present)                                                        |                                            |
| channels.dm_policy                  | `config.summary` and `openclaw.security_audit`                                                                                               |                                            |
| channels.group_policy               | `config.summary` and `openclaw.security_audit`                                                                                               |                                            |
| session.dm_scope_isolation          | `config.summary`                                                                                                                             |                                            |
| fs.perms.core                       | `fs.stat.state_dir`, `fs.stat.config`, `fs.stat.credentials_dir`, `fs.stat.sessions_dir`, `fs.stat.auth_profiles` (or Windows `fs.icacls.*`) |                                            |
| fs.symlinks                         | `fs.symlinks_state`                                                                                                                          |                                            |
| fs.synced_folder                    | `fs.synced_folder`                                                                                                                           |                                            |
| fs.suid_sgid_in_openclaw_paths      | `fs.suid_sgid_state`, `fs.suid_sgid_workspace`                                                                                               |                                            |
| fs.world_writable_in_openclaw_paths | `fs.world_writable_state`, `fs.world_writable_workspace`                                                                                     |                                            |
| config.secrets_on_disk              | `config.summary`                                                                                                                             | Use secrets summary only.                  |
| skills.env_injection                | `config.summary`                                                                                                                             |                                            |
| supply_chain.skills_inventory       | `skills.state_inventory`, `skills.workspace_inventory`, `skills.extra_inventory.*`                                                           | Include extra dirs if present.             |
| supply_chain.skills_pattern_scan    | `skills.state_pattern_scan`, `skills.workspace_pattern_scan`, `skills.extra_pattern_scan.*`                                                  |                                            |
| supply_chain.skills_exec_files      | `skills.state_exec_files`, `skills.workspace_exec_files`, `skills.extra_exec_files.*`                                                        |                                            |
| supply_chain.plugins_allowlist      | `config.summary` and `openclaw.plugins_list`                                                                                                 |                                            |
| version.patch_level                 | `openclaw.version` and `openclaw.security_audit`                                                                                             |                                            |
