# OpenClaw Security Audit Report

Target: ~/.openclaw/openclaw.json
Generated: 2026-02-01

Overall Risk Score: 85/100

## Summary

This configuration exposes critical attack paths. Immediate remediation is
required to prevent unauthorized access and credential abuse.

## Critical Findings

1. Gateway authentication token missing
   - Why it matters: Anyone who can reach the gateway can issue commands and
     access tool execution.
   - How to fix:
     1. Generate a strong token and store it in an environment variable.
     2. Set `gateway.authToken` to `${OPENCLAW_GATEWAY_TOKEN}`.
     3. Rotate any credentials that may have been exposed.
   - Example:
     gateway:
     authToken: ${OPENCLAW_GATEWAY_TOKEN}

2. Public gateway bind without access controls
   - Why it matters: Binding to `0.0.0.0` exposes the gateway to the network.
     Without strict auth and allowlists, it is a remote takeover risk.
   - How to fix:
     1. Bind to localhost if remote access is not required.
     2. If remote access is required, add allowlist controls and enforce strong
        auth.
   - Example:
     gateway:
     bind: 127.0.0.1

3. Hardcoded API key detected in configuration
   - Why it matters: Secrets in config files are easily leaked through logs,
     backups, or source control.
   - How to fix:
     1. Move secrets to environment variables or a local secret store.
     2. Replace in config with an env reference.
     3. Rotate the exposed key.
   - Example:
     llm:
     apiKey: ${OPENCLAW_LLM_API_KEY}

4. Sandbox disabled for tool execution
   - Why it matters: Tools can access system resources without isolation,
     increasing blast radius of prompt injection.
   - How to fix:
     1. Enable sandboxing for tool execution.
     2. Restrict file system scope for tools.
   - Example:
     tools:
     sandbox: true

## High Findings

1. Missing channel access controls
   - Why it matters: Channels without `allowFrom` allow untrusted sources to
     invoke actions.
   - How to fix:
     1. Define `allowFrom` for each channel.
     2. Restrict to known users or groups.
   - Example:
     channels:
     discord:
     allowFrom: - "user:123456789"

2. No channel rate limits
   - Why it matters: Unbounded requests increase risk of abuse and denial of
     service.
   - How to fix:
     1. Add per-channel rate limits.
     2. Apply stricter limits to public channels.
   - Example:
     channels:
     discord:
     rateLimits:
     perMinute: 20

3. Unsafe tool policies for elevated tools
   - Why it matters: Elevated tools running without restrictions can exfiltrate
     data or modify system state.
   - How to fix:
     1. Require confirmation for elevated tools.
     2. Restrict allowed arguments and file paths.
   - Example:
     tools:
     policies:
     elevated:
     requireApproval: true
     allowPaths: - "/home/user/projects"

## Recommended Remediation Roadmap

1. Enable gateway auth and restrict bind address.
2. Remove all hardcoded secrets and rotate credentials.
3. Enable sandboxing and tighten tool policies.
4. Add channel allowlists and rate limits.
5. Re-run the audit after fixes.
