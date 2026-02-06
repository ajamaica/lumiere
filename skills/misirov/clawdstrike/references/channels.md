# Channel Policy Checks

Use this file for `channels.dm_policy`, `channels.group_policy`, and `session.dm_scope_isolation`. Follow every step.

## Evidence keys

- `config.summary`
- `openclaw.security_audit`

## DM policies

Steps:

1. Read `channels.defaults.dm.policy` from `config.summary`.
2. Read provider-specific DM policies from `config.summary`, for example `channels.discord.dm.policy`.
3. Cross-check with `openclaw.security_audit` findings if present.

Mark `VULNERABLE` if:

- Any DM policy is `open` or missing when the host is internet-accessible.
- DM allowlists are missing or wildcarded when DMs are enabled.

If DM policy is missing and exposure is unknown, mark `VULNERABLE` with `(UNVERIFIED)`.

## Group policies

Steps:

1. Read `channels.defaults.groupPolicy` and provider-specific group policies from `config.summary`.
2. If any group policy is `open`, treat as high risk.
3. If group allowlists are missing or wildcarded, treat as risk.

Severity guidance:

- `critical` when `groupPolicy=open` and tools include exec/elevated/browser/web.
- `warn` when `groupPolicy=open` but tools are disabled.

## Access groups and native commands

Steps:

1. Read `commands.useAccessGroups` from `config.summary`.
2. If native commands are enabled, require access groups and allowlists.
3. If missing, mark `VULNERABLE` and explain the blast radius.

## DM session isolation

Steps:

1. Read `session.dmScope` from `config.summary`.
2. If multiple senders can reach the bot and scope is missing or broad, mark `VULNERABLE`.

Use literal excerpts in Evidence for all rows.
