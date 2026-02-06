# Network Evidence Checks

Use this file for `net.listening_ports` and `net.firewall`. Follow every step.

## Listening ports

Evidence keys:

- `net.listening`

Steps:

1. Extract only the lines relevant to OpenClaw and any unexpected public listeners.
2. If a listener is on `0.0.0.0`, `::`, or a public IP, treat it as exposed.
3. If a port is loopback-only, treat it as local.
4. If `net.listening` is missing or indicates no command, mark `VULNERABLE` with `(UNVERIFIED)`.

Mark `VULNERABLE` if:

- Any OpenClaw-related port binds to non-loopback.
- Any high-risk service (SSH, mDNS, CDP, Canvas) is exposed on non-loopback.

Notes:

- If SSH is bound to `0.0.0.0`, it is exposure even if OpenClaw is loopback-only.
- Use a literal excerpt from `net.listening`.

## Firewall posture

Evidence keys:

- Any `fw.*` entries, including `fw.ufw`, `fw.firewalld_state`, `fw.firewalld_rules`, `fw.nft`, `fw.iptables`, `fw.macos`, `fw.windows`.

Steps:

1. Confirm a firewall command was executed and returned output.
2. If output shows disabled, mark `VULNERABLE`.
3. If output shows enabled but rules are permissive, mark `VULNERABLE` (warn) and cite the rule.
4. If output is missing or only `fw.none` is present, mark `VULNERABLE` with `(UNVERIFIED)`.

Notes:

- Permission errors in `fw.nft` or `fw.iptables` count as unverified unless another firewall command confirms status.
- Use a literal excerpt from the firewall output.
