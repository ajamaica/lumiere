# Canvas Host and Browser Control

Use this file for `canvasHost.exposure` and `browser.control_exposure`. Follow every step.

## Evidence keys

- `config.summary`
- `openclaw.security_audit`
- `net.listening`

## Canvas Host exposure (`canvasHost.exposure`)

Steps:

1. Read `canvasHost.enabled` and `canvasHost.port` from `config.summary`.
2. Check `openclaw.security_audit` for canvas host findings.
3. Check `net.listening` for the canvas host port.

Classification:

- `VULNERABLE` when canvas host is enabled and listens on non-loopback.
- `OK` when disabled or loopback/tailnet-only.
- `VULNERABLE` with `(UNVERIFIED)` when canvas host state cannot be determined.

## Browser control exposure (`browser.control_exposure`)

Steps:

1. Read `browser.enabled` and `browser.cdpUrl` from `config.summary`.
2. Check `openclaw.security_audit` for browser control findings.
3. Confirm CDP endpoints in `net.listening`.

Classification:

- `VULNERABLE` when browser control is enabled and CDP is reachable beyond loopback/tailnet.
- `OK` when browser control is disabled or loopback/tailnet-only.
- `VULNERABLE` with `(UNVERIFIED)` when browser control state cannot be confirmed.

Use literal excerpts in Evidence for both rows.
