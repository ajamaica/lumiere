# Security Checklist

## Before Commit

- [ ] No hardcoded secrets (API keys, tokens, passwords)
- [ ] All secrets use environment variables
- [ ] .env files are in .gitignore
- [ ] Input validation implemented
- [ ] Error messages don't leak sensitive info
- [ ] Dependencies updated to latest secure versions

## Before Deployment

- [ ] Security audit completed
- [ ] All vulnerabilities addressed
- [ ] Rate limiting configured
- [ ] Logging enabled for security events
- [ ] Backup and recovery tested

## Ongoing

- [ ] Regular dependency updates
- [ ] Security monitoring active
- [ ] Access logs reviewed
- [ ] Security patches applied promptly
- [ ] Incident response plan tested

## Emergency

- [ ] Know how to revoke compromised keys
- [ ] Have backup API keys ready
- [ ] Contact list for security incidents
- [ ] Rollback procedure tested
