# Vestaboard formatting notes

- Target grid: 6 rows x 22 columns (132 chars total)
- Recommended: uppercase normalization
- Prefer word-wrapping; if a single word exceeds remaining space in a line, hard-wrap it.
- Common policy modes:
  - wrap+truncate (default)
  - wrap+error (reject if overflow)
  - truncate (no wrap)
