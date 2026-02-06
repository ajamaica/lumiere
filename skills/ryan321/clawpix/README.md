# Clawpix Skill for ClawHub

This folder contains the Clawpix skill for publishing to ClawHub.

## Publishing

```bash
# Login (first time only)
clawhub login

# Publish
clawhub publish ./clawpix-skill \
  --slug clawpix \
  --name "Clawpix" \
  --version 1.0.0 \
  --changelog "Initial release"
```

## Updating

```bash
clawhub publish ./clawpix-skill \
  --slug clawpix \
  --name "Clawpix" \
  --version 1.1.0 \
  --changelog "Description of changes"
```

Or use sync for automatic version bumping:

```bash
clawhub sync --root ./clawpix-skill --bump patch --changelog "Bug fixes"
```
