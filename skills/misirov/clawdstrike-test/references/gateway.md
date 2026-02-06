# Gateway Exposure and Auth

Use this file for `gateway.exposure_and_auth`. Follow every step.

## Evidence keys

- `config.summary`
- `openclaw.security_audit`
- `net.listening`

## Steps

1. Read `gateway.bind` from `config.summary`.
2. Read `gateway.mode` from `config.summary`.
3. Read `gateway.auth.mode` from `config.summary`.
4. Read `gateway.auth.token` and `gateway.auth.password` from `config.summary`.
5. Read `gateway.controlUi.enabled` from `config.summary`.
6. Read `gateway.controlUi.allowInsecureAuth` and `gateway.controlUi.dangerouslyDisableDeviceAuth` from `config.summary`.
7. Read `gateway.trustedProxies` from `config.summary`.
8. Read `gateway.tailscale.mode` from `config.summary`.
9. Cross-check related findings in `openclaw.security_audit`.
10. Confirm live listeners in `net.listening` for gateway/control UI ports.

## Classification

Mark `VULNERABLE` (critical) if:

- Gateway binds to non-loopback without auth.
- Control UI is exposed with insecure auth flags enabled.
- Tailscale funnel is enabled for an internet-facing gateway.

Mark `VULNERABLE` (warn) if:

- `gateway.trustedProxies` is missing and there is evidence of reverse proxy usage.
- Auth is present but weak or stored on disk without tight permissions.

If reverse proxy usage cannot be confirmed, mark `VULNERABLE` with `(UNVERIFIED)` and explain the condition.

Use literal excerpts in Evidence for this row.
