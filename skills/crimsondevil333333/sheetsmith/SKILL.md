---
name: sheetsmith
description: Pandas-powered CSV & Excel management for quick previews, summaries, filtering, transforming, and format conversions. Use this skill whenever you need to inspect spreadsheet files, compute column-level summaries, apply queries or expressions, or export cleansed data to a new CSV/TSV/XLSX output without rewriting pandas every time.
---

# Sheetsmith

## Overview

Sheetsmith is a lightweight pandas wrapper that keeps the focus on working with CSV/Excel files: previewing, describing, filtering, transforming, and converting them in one place. The CLI lives at `skills/sheetsmith/scripts/sheetsmith.py`, and it automatically loads any CSV/TSV/Excel file, reports structural metadata, runs pandas expressions, and writes the results back safely.

## Quick start

1. Place the spreadsheet (CSV, TSV, or XLS/XLSX) inside the workspace or reference it via a full path.
2. Run `python3 skills/sheetsmith/scripts/sheetsmith.py <command> <path>` with the command described below.
3. When you modify data, either provide `--output new-file` to save a copy or pass `--inplace` to overwrite the source file.
4. Check `references/usage.md` for extra sample commands and tips.

## Commands

### summary

Prints row/column counts, dtype breakdowns, columns with missing data, and head/tail previews. Use `--rows` to control how many rows are shown after the summary and `--tail` to preview the tail instead of the head.

### describe

Runs `pandas.DataFrame.describe(include='all')` (customizable with `--include`) so you instantly see numeric statistics, cardinality, and frequency information. Supply `--percentiles` to add additional percentile lines.

### preview

Shows a quick tabulated peek at the first (`--rows`) or last (`--tail`) rows so you can sanity-check column order or formatting before taking actions.

### filter

Enter a pandas query string via `--query` (e.g., `state == 'CA' and population > 1e6`). The command can either print the filtered rows or, when you also pass `--output`, write the filtered table to a new CSV/TSV/XLSX file. Add `--sample` to inspect a random subset instead of the entire result.

### transform

Compose new columns, rename or drop existing ones, and immediately inspect the resulting table. Provide one or more `--expr` expressions such as `total = quantity * price`. Use `--rename old:new` and `--drop column` to reshape the table, and persist changes via `--output` or `--inplace`. The preview version (without writing) reuses the same `--rows`/`--tail` flags as the other commands.

### convert

Convert between supported formats (CSV/TSV/Excel). Always specify `--output` with the desired extension, and the helper will detect the proper writer (Excel uses `openpyxl`, CSV preserves the comma separator by default, TSV uses tabs). This is the simplest way to normalize data before running other commands.

## Workflow rules

- Always keep a copy of the raw file or write to a new path; the script will only overwrite the original when you explicitly demand `--inplace`.
- Use the same CLI for both exploration (`summary`, `preview`, `describe`) and editing (`filter`, `transform`). The `--output` flag works for filter/transform so you can easily branch results.
- Behind the scenes, the script relies on pandas + `tabulate` for Markdown previews and supports Excel/CSV/TSV, so ensure those dependencies are present (pandas, openpyxl, xlrd, tabulate are installed via apt on this system).
- Use `references/usage.md` for extended examples (multi-step cleaning, dataset comparison, expression tips) when the basic command descriptions above are not enough.

## References

- **Usage guidelines:** `references/usage.md` (contains ready-to-copy commands, expression patterns, and dataset cleanup recipes).

## Resources

- **GitHub:** https://github.com/CrimsonDevil333333/sheetsmith
- **ClawHub:** https://www.clawhub.ai/skills/sheetsmith
