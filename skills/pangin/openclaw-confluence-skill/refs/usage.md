# Confluence v2 skill - usage tips

- Most list commands support `--all` to follow pagination.
- Auth is loaded automatically from `skills/confluence-v2/.env` if present.

Examples:

```
node scripts/pages.js list --all
node scripts/labels.js list --all
node scripts/space-roles.js list --all
node scripts/classification.js list --all
node scripts/versions.js pages 89522178 list --all
```
