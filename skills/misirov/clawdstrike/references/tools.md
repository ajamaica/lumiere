# Tools and Sandbox Checks

Use this file for `tools.policy_baseline`. Follow every step.

## Evidence keys

- `config.summary`
- `openclaw.security_audit`
- `openclaw.approvals` if present

## Steps

1. Read `agents.defaults.sandbox.mode` and `agents.defaults.sandbox.workspaceAccess`.
2. Read `tools.exec`, `tools.elevated.enabled`, and `tools.elevated.allowFrom`.
3. Read `tools.web.search.enabled`, `tools.web.fetch.enabled`, and `browser.enabled`.
4. Cross-check with any tool-related findings in `openclaw.security_audit`.

## Classification

Mark `VULNERABLE` if any of the following is true:

- `tools.elevated.allowFrom` contains `*`.
- `tools.elevated.enabled=true` with open group or DM policies.
- Web or browser tools are enabled without sandboxing on risky inboxes.
- Exec tools are enabled without approvals and allowlists.

Severity guidance:

- `critical` when open groups/DMs combine with elevated or exec tools.
- `warn` when tools are enabled but access is allowlisted and sandboxed.

Use literal excerpts in Evidence for this row.
