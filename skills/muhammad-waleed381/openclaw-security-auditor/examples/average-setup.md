# OpenClaw Security Audit Report

Target: ~/.openclaw/openclaw.json
Generated: 2026-02-01

Overall Risk Score: 45/100

## Summary

The configuration is functional but has several common security gaps. No
critical issues detected, but some changes should be prioritized.

## High Findings

1. Gateway bind set to 0.0.0.0 with weak authentication
   - Why it matters: Public exposure increases risk of unauthorized access if
     tokens are weak or reused.
   - How to fix:
     1. Bind to localhost if remote access is not needed.
     2. Enforce a strong token stored in environment variables.
   - Example:
     gateway:
     bind: 127.0.0.1
     authToken: ${OPENCLAW_GATEWAY_TOKEN}

2. Missing rate limits on public channels
   - Why it matters: Increased susceptibility to abuse and denial of service.
   - How to fix:
     1. Add per-minute rate limits to each channel.
     2. Use stricter limits for public channels.
   - Example:
     channels:
     telegram:
     rateLimits:
     perMinute: 15

## Medium Findings

1. Missing channel allowlists
   - Why it matters: Unrestricted sources can invoke actions across channels.
   - How to fix:
     1. Define `allowFrom` for each channel.
     2. Limit access to known user IDs.
   - Example:
     channels:
     discord:
     allowFrom: - "user:123456789"

2. Tool policies allow elevated tools without confirmation
   - Why it matters: Elevated tools can modify files or run commands without oversight.
   - How to fix:
     1. Require approval for elevated tools.
     2. Restrict allowed paths.
   - Example:
     tools:
     policies:
     elevated:
     requireApproval: true

3. Secrets may be exposed in logs
   - Why it matters: Logs can leak sensitive metadata or tokens.
   - How to fix:
     1. Redact sensitive fields in logs.
     2. Reduce log verbosity for production.
   - Example:
     logging:
     redact: - "apiKey" - "authToken"

## Recommended Remediation Roadmap

1. Lock down the gateway bind address and strengthen auth.
2. Add rate limits to public channels.
3. Enforce allowlists and safer tool policies.
4. Enable log redaction and review log retention.
