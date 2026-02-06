# Contributing to keep-skill

This project is published on [PyPI as `keep-skill`](https://pypi.org/project/keep-skill/). Contributions are welcome under the MIT license.

## How to Contribute

- **Found a bug or have a feature idea?** Open an issue on GitHub
- **Want to fix something?** Check the open issues, or submit a fix directly
- **Making changes:** Fork the repo, create a feature branch, and open a pull request against `main`

All contributions appreciated!

## Versioning

We use [semantic versioning](https://semver.org/):

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes to the public API
- **MINOR** (0.1.0 → 0.2.0): New features, backward compatible
- **PATCH** (0.1.0 → 0.1.1): Bug fixes, backward compatible

**Current status:** Pre-1.0 (0.x.y), so minor versions may include breaking changes, but we try to avoid them.

Version is defined in two places (keep in sync):

- `pyproject.toml` → `version = "x.y.z"`
- `keep/__init__.py` → `__version__ = "x.y.z"`

## Public API

The following are considered public API — changes require version bumps and deprecation consideration:

**Python API:**

- `Keeper` class and its public methods
- `Item` type and its fields
- Anything exported in `keep/__init__.py`

**CLI:**

- All commands (`keep find`, `keep update`, `keep get`, etc.)
- Command-line argument names and behavior

**Not public API** (can change without notice):

- Internal modules (`store.py`, `chunking.py`, `indexing.py`, etc.)
- Provider implementations
- Configuration file format (may evolve)

## Backward Compatibility Guidelines

When making changes:

1. **Don't remove or rename public methods** — deprecate first, remove in next major version
2. **Don't change method signatures** — add new optional parameters with defaults
3. **Don't change return types** — extend, don't replace
4. **CLI changes** — keep old flags working, add new ones

If you must break compatibility:

- Document in commit message and changelog
- Bump version appropriately
- Provide migration guidance

## Releases

Releases are managed by the maintainer. To prepare a release:

```bash
# 1. Update version in both places
# pyproject.toml: version = "x.y.z"
# keep/__init__.py: __version__ = "x.y.z"

# 2. Commit
git add -A && git commit -m "Release x.y.z"
git tag vx.y.z
git push origin main --tags

# 3. Build and publish (from machine with PyPI credentials)
rm -rf dist/ build/
python -m build
twine check dist/*
twine upload dist/*
```

## Questions?

Open an issue or reach out to the maintainer.
