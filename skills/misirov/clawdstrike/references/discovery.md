# Discovery Exposure

Use this file for `discovery.mdns_leak` and `discovery.wide_area`. Follow every step.

## Evidence keys

- `config.summary`
- `net.listening`

## mDNS discovery (`discovery.mdns_leak`)

Steps:

1. Read `discovery.mdns.mode` from `config.summary`.
2. Look for UDP 5353 listeners in `net.listening`.
3. If mode is `full` or missing and a listener exists, treat as exposure.

Classification:

- `VULNERABLE` when `discovery.mdns.mode` is `full` or missing and mDNS is listening.
- `OK` when `discovery.mdns.mode` is `off` or `minimal` and no unexpected listener exists.
- `VULNERABLE` with `(UNVERIFIED)` when mode is missing and no listener data exists.

## Wide-area discovery (`discovery.wide_area`)

Steps:

1. Read `discovery.wideArea.enabled` from `config.summary`.
2. If enabled, mark `VULNERABLE` unless explicitly required and access is restricted.
3. If missing, mark `VULNERABLE` with `(UNVERIFIED)`.

Use literal excerpts in Evidence for both rows.
