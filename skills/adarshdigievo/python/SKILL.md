---
name: python
description: Python coding guidelines and best practices. Use when writing, reviewing, or refactoring Python code. Enforces PEP 8 style, syntax validation via py_compile, unit test execution, modern Python versions only (no EOL), uv for dependency management when available, and idiomatic Pythonic patterns.
---

# Python Coding Guidelines

## Code Style (PEP 8)

- 4 spaces for indentation (never tabs)
- Max line length: 88 chars (Black default) or 79 (strict PEP 8)
- Two blank lines before top-level definitions, one within classes
- Imports: stdlib → third-party → local, alphabetized within groups
- Snake_case for functions/variables, PascalCase for classes, UPPER_CASE for constants

## Before Committing

```bash
# Syntax check (always)
python -m py_compile *.py

# Run tests if present
python -m pytest tests/ -v 2>/dev/null || python -m unittest discover -v 2>/dev/null || echo "No tests found"

# Format check (if available)
ruff check . --fix 2>/dev/null || python -m black --check . 2>/dev/null
```

## Python Version

- **Minimum:** Python 3.10+ (3.9 EOL Oct 2025)
- **Target:** Python 3.11-3.13 for new projects
- Never use Python 2 syntax or patterns
- Use modern features: match statements, walrus operator, type hints

## Dependency Management

Check for uv first, fall back to pip:

```bash
# Prefer uv if available
if command -v uv &>/dev/null; then
    uv pip install <package>
    uv pip compile requirements.in -o requirements.txt
else
    pip install <package>
fi
```

For new projects with uv: `uv init` or `uv venv && source .venv/bin/activate`

## Pythonic Patterns

```python
# ✅ List/dict comprehensions over loops
squares = [x**2 for x in range(10)]
lookup = {item.id: item for item in items}

# ✅ Context managers for resources
with open("file.txt") as f:
    data = f.read()

# ✅ Unpacking
first, *rest = items
a, b = b, a  # swap

# ✅ EAFP over LBYL
try:
    value = d[key]
except KeyError:
    value = default

# ✅ f-strings for formatting
msg = f"Hello {name}, you have {count} items"

# ✅ Type hints
def process(items: list[str]) -> dict[str, int]:
    ...

# ✅ dataclasses/attrs for data containers
from dataclasses import dataclass

@dataclass
class User:
    name: str
    email: str
    active: bool = True

# ✅ pathlib over os.path
from pathlib import Path
config = Path.home() / ".config" / "app.json"

# ✅ enumerate, zip, itertools
for i, item in enumerate(items):
    ...
for a, b in zip(list1, list2, strict=True):
    ...
```

## Anti-patterns to Avoid

```python
# ❌ Mutable default arguments
def bad(items=[]):  # Bug: shared across calls
    ...
def good(items=None):
    items = items or []

# ❌ Bare except
try:
    ...
except:  # Catches SystemExit, KeyboardInterrupt
    ...
except Exception:  # Better
    ...

# ❌ Global state
# ❌ from module import *
# ❌ String concatenation in loops (use join)
# ❌ == None (use `is None`)
# ❌ len(x) == 0 (use `not x`)
```

## Testing

- Use pytest (preferred) or unittest
- Name test files `test_*.py`, test functions `test_*`
- Aim for focused unit tests, mock external dependencies
- Run before every commit: `python -m pytest -v`

## Docstrings

```python
def fetch_user(user_id: int, include_deleted: bool = False) -> User | None:
    """Fetch a user by ID from the database.

    Args:
        user_id: The unique user identifier.
        include_deleted: If True, include soft-deleted users.

    Returns:
        User object if found, None otherwise.

    Raises:
        DatabaseError: If connection fails.
    """
```

## Quick Checklist

- [ ] Syntax valid (`py_compile`)
- [ ] Tests pass (`pytest`)
- [ ] Type hints on public functions
- [ ] No hardcoded secrets
- [ ] f-strings, not `.format()` or `%`
- [ ] `pathlib` for file paths
- [ ] Context managers for I/O
- [ ] No mutable default args
