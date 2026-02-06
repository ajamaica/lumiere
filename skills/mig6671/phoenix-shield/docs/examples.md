# PhoenixShield - Example Workflows

## Basic Safe Update

```bash
# Initialize PhoenixShield
phoenix-shield init myproject

# Run pre-flight checks
phoenix-shield preflight

# Create snapshot
phoenix-shield snapshot pre-npm-update

# Execute update with auto-rollback
phoenix-shield deploy \
  --command "npm update" \
  --rollback-on-failure

# Monitor for 2 hours
phoenix-shield monitor --duration 2h
```

## Advanced: Multi-Health Check Update

```bash
phoenix-shield deploy \
  --command "apt upgrade -y" \
  --health-check "systemctl status nginx" \
  --health-check "systemctl status mysql" \
  --health-check "curl -f http://localhost/health" \
  --rollback-on-failure
```

## Recovery Scenario

```bash
# Something went wrong - check status
phoenix-shield status

# See what would be rolled back
phoenix-shield rollback --dry-run pre-npm-update

# Execute rollback
phoenix-shield rollback pre-npm-update
```

## Cron Integration

Add to crontab for daily safe updates:

```cron
# Daily at 3 AM - safe OpenClaw update
0 3 * * * /usr/local/bin/phoenix-shield deploy \
  --command "npm install -g openclaw@latest" \
  --rollback-on-failure \
  >> /var/log/phoenix-daily.log 2>&1
```

## CI/CD Pipeline

```yaml
# .github/workflows/safe-deploy.yml
deploy:
  steps:
    - name: Safe Deploy with PhoenixShield
      run: |
        phoenix-shield preflight
        phoenix-shield snapshot "deploy-$GITHUB_SHA"
        phoenix-shield deploy \
          --command "./deploy.sh" \
          --health-check "curl -f http://localhost/ready" \
          --rollback-on-failure
```
