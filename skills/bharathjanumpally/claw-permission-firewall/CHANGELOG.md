# Changelog

## 1.0.0

- Initial release.
- Policy-driven ALLOW / DENY / NEED_CONFIRMATION decisions.
- Default strict mode, TLS required for HTTP.
- Workspace-root file jail + denylist for sensitive locations.
- Header + regex secret redaction.
- Outbound secret detection and blocking.
- Structured audit record per decision (traceId, policyVersion, fingerprint).
