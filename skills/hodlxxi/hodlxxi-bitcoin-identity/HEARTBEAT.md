# HODLXXI Skill Heartbeat

Use this checklist to verify the HODLXXI identity surface is healthy. Recommended cadence: every 5 minutes for production, hourly for staging.

## Required checks

```bash
BASE_URL="https://your-hodlxxi-deployment.com"

curl -fsS "$BASE_URL/health"
curl -fsS "$BASE_URL/.well-known/openid-configuration"
curl -fsS "$BASE_URL/oauth/jwks.json"
curl -fsS "$BASE_URL/oauthx/status"
```

## LNURL-Auth check

```bash
session_json=$(curl -fsS -X POST "$BASE_URL/api/lnurl-auth/create")
session_id=$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["session_id"])' "$session_json")
curl -fsS "$BASE_URL/api/lnurl-auth/check/$session_id"
```

## Alerting suggestions

- Trigger an alert if `/health` or `/oauthx/status` fails twice in a row.
- Track JWKS expiry/rotation cadence and alert if keys are missing or empty.
- Log LNURL-Auth creation failures to catch Lightning integration regressions.
