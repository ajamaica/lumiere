---
name: github-actions-troubleshooting
description: 'Troubleshoot GitHub Actions workflows, particularly for Go projects. Diagnose failing workflows, distinguish between code and environment issues, interpret logs, and apply fixes for common CI/CD problems.'
metadata:
  {
    'openclaw':
      {
        'emoji': '🔄',
        'requires': { 'bins': ['gh', 'git'] },
        'install':
          [
            {
              'id': 'brew',
              'kind': 'brew',
              'formula': 'gh',
              'bins': ['gh'],
              'label': 'Install GitHub CLI (brew)',
            },
            {
              'id': 'apt',
              'kind': 'apt',
              'package': 'gh',
              'bins': ['gh'],
              'label': 'Install GitHub CLI (apt)',
            },
          ],
      },
  }
---

# GitHub Actions Troubleshooting Skill

Use the `gh` CLI and Git to diagnose and fix GitHub Actions workflow failures, particularly for Go projects. This skill helps identify whether failures are due to code issues or environment/configuration problems.

## Workflow Analysis

Check the status of recent workflow runs:

```bash
gh run list --repo owner/repo --limit 10
```

View details of a specific failing workflow:

```bash
gh run view <run-id> --repo owner/repo
```

Get logs for failed jobs only:

```bash
gh run view <run-id> --repo owner/repo --log-failed
```

## Distinguishing Issue Types

1. **Code Issues**: Failures in compilation, tests, or linting that occur consistently across environments
2. **Environment Issues**: Problems with dependency resolution, tool installation, or type-checking in CI that work locally

## Common Go CI Fixes

### Linter Configuration Issues

- Look for "undefined" reference errors that indicate import resolution problems
- Try minimal linter configs that disable type-checking linters
- Use `golangci-lint run --disable-all --enable=gofmt` for basic syntax checking

### Dependency Resolution

- Verify go.mod and go.sum are consistent
- Run `go mod tidy` to resolve dependency conflicts
- Check that required dependencies are properly declared

## Diagnostic Commands

Check specific workflow job logs:

```bash
gh run view --job <job-id> --repo owner/repo
```

Download workflow artifacts for inspection:

```bash
gh run download <run-id> --repo owner/repo
```

## Troubleshooting Workflow

1. Identify which jobs are failing and which are passing
2. Examine error messages for clues about the nature of the issue
3. Determine if the issue is reproducible locally
4. Apply targeted fixes based on issue type
5. Monitor subsequent workflow runs to verify resolution
