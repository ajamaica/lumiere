# Evidence Template

Use this schema for every finding:

| #   | Check ID | Result | Severity | Evidence (redacted) | Fix (safe) |
| --- | -------- | ------ | -------- | ------------------- | ---------- |

Evidence rules:

- Use only short excerpts.
- Never print secrets or full file contents.
- Result must be only `OK` or `VULNERABLE`. Do not include `(UNVERIFIED)` in Result.
- If unverified, add `(UNVERIFIED)` inside Evidence.
- Every row must cite a `verified-bundle.json` key (e.g., `net.listening`) and include a short, redacted excerpt from that key.
- Evidence excerpts must be literal snippets from the key output, not paraphrases.
- Use `meta.generated_at` and `meta.script` in the report header to prove collection timing.

Fix rules:

- Provide one concrete, low-risk fix per row.
- Do not execute fixes unless explicitly requested.
