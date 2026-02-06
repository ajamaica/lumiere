# Threat Model Template

Use this format in every report. Keep it concise and tied to findings.

## Steps

1. List assets directly observed in the audit.
2. List realistic actors for the environment.
3. List entry points that map to findings.
4. Identify trust boundaries relevant to the host and gateway.
5. Provide at least two abuse cases that directly reference findings.
6. List the top three mitigations from the report.
7. Note residual risks that remain after mitigations.

## Threat Model (concise)

- **Assets**: <credentials, tokens, conversations, file system, channels, gateway control>
- **Actors**: <external attackers, malicious skill authors, compromised accounts, insiders>
- **Entry points**: <gateway/control UI, skills/plugins, channels, browser control, node execution>
- **Trust boundaries**: <host OS, sandbox, tailnet, reverse proxy, channel accounts>
- **Abuse cases**: <example 1 tied to a finding>; <example 2 tied to a finding>
- **Mitigations (top 3)**: <prioritized mitigations from this audit>
- **Residual risks**: <what remains after fixes>
