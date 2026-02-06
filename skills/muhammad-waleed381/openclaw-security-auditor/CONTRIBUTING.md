# Contributing

Thank you for contributing to OpenClaw Security Auditor. We welcome bug
reports, new security checks, documentation improvements, and code
contributions.

## Reporting Bugs

Please use the GitHub issue templates so we can reproduce and fix issues quickly:

- Bug report: `/.github/ISSUE_TEMPLATE/bug_report.md`

Include:

- What you expected to happen
- What actually happened
- Steps to reproduce
- Your OpenClaw version and OS

## Suggesting New Security Checks

We love new check ideas. Use the "New security check" template and include:

- The risk you want to detect
- Why it matters
- How to detect it from `openclaw.json` metadata
- Suggested remediation guidance

## Pull Request Process

1. Fork the repo and create a branch with a descriptive name.
2. Keep changes focused and scoped.
3. Update docs and examples if behavior changes.
4. Ensure tests or checks (if any) pass.
5. Open a PR using the provided template.

## Code Style Expectations

- Keep Markdown clear and concise.
- Use consistent headings and list formatting.
- Prefer ASCII characters in documentation.
- Avoid logging or exposing secrets; use redacted examples only.

## Testing Requirements

There are no automated tests yet. Please:

- Validate Markdown formatting visually.
- Ensure examples use redacted values.
- Confirm the skill text does not require external APIs.

## Community Guidelines

- Be respectful and constructive.
- Focus on security and user safety.
- Assume good intent and help others succeed.
