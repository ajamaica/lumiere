# Sample Security Report

## Target

`./demo-app`

## Scope

- Source code
- Configuration files
- Dependency manifests

## Summary

Medium risk findings related to configuration defaults and exposed secrets.

## Findings

1. Hard-coded API token in `config/dev.yml`
   - Risk: Token exposure in source control
   - Recommendation: Move secrets to local env vars or a secure store
2. Debug mode enabled in production config
   - Risk: Information disclosure
   - Recommendation: Disable debug mode and restrict verbose logs

## Remediation Plan

1. Remove secrets from repository history.
2. Rotate exposed tokens.
3. Update production configuration and verify logs.
