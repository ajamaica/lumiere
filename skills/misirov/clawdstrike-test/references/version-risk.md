# Version Risk Guidance

Use this for `version.patch_level`. Follow every step.

## Evidence keys

- `openclaw.version`
- `openclaw.security_audit`

## Steps

1. Extract the version string from `openclaw.version`.
2. Check `openclaw.security_audit` for any version warnings or known issues.
3. If version cannot be verified, mark `VULNERABLE` with `(UNVERIFIED)`.
4. Do not infer CVE status unless a local release note or audit explicitly mentions it.

## Classification

- `OK` if version is current and audit reports no version-related findings.
- `VULNERABLE` if audit flags version risk or version is unknown.

## Output guidance

- Recommend upgrading to the latest stable release when unsure.
- Recommend rotating gateway tokens and API keys after upgrading.
