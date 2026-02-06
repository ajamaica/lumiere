# claw-permission-firewall

A policy “gatekeeper” for skills/agents. Use it to enforce least-privilege rules for:

- HTTP requests (domain/method/TLS)
- File reads/writes (workspace jail + deny paths)
- Command execution (disabled by default)
- Secret redaction + outbound secret blocking
- Risk scoring and confirmations
- Audit logs per decision

## Install (developer)

```bash
npm i
npm run build
```

## Run (CLI)

```bash
node dist/index.js evaluate --input examples/http-allow.json
```

## Policy

Edit `policy.yaml` to allow domains, file globs, and thresholds per mode (strict/balanced/permissive).
