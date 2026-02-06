# Sheetsmith usage reference

## Command cheat sheet

| Command     | Purpose                                                                       | Example                                                                                                        |
| ----------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `summary`   | High-level diagnostics (shape, dtypes, missing data) plus a Markdown preview. | `python3 skills/sheetsmith/scripts/sheetsmith.py summary data/customers.csv --rows 5`                          |
| `describe`  | Run `pandas.DataFrame.describe()` (supports `--include` or `--percentiles`).  | `... describe reports.csv --percentiles 10 50 90`                                                              |
| `preview`   | Just show head/tail without analyzing.                                        | `... preview workbook.xlsx --tail`                                                                             |
| `filter`    | Keep rows that match a pandas query string; optional `--output`/`--sample`.   | `... filter sales.csv --query "region=='EMEA'" --output filtered/emea.csv`                                     |
| `transform` | Create new columns, drop/rename fields, and write filtered results.           | `... transform ledger.csv --expr "net = credit - debit" --rename net:net_balance --output ledger/with-net.csv` |
| `convert`   | Export the same table to CSV/TSV/XLSX.                                        | `... convert dataset.xlsx --output dataset.csv`                                                                |

_Tip:_ The CLI guesses format from the file extension. Use `.tsv` or `.txt` for tab-delimited text, `.csv` for comma, and `.xlsx`/`.xls` for Excel.

## Expression & filter patterns

- Arithmetic expressions: `--expr "total = quantity * price"`.
- Boolean flags: `--expr "is_active = status == 'active'"`.
- Drop columns you no longer need with `--drop colA colB` prior to saving a smaller file.
- Rename columns on the fly via `--rename old:new another:replacement`.
- Use `--query` to filter rows (`"score >= 80 and country == 'IN'"`). If you only want a sample, pair `--sample 20` with `--query` so the stored dataset remains manageable.

## Workflow tips

1. Always preview before writing when dealing with unfamiliar schemas.
2. Use `--output` to branch data copies; once satisfied, you can prune the old file or move the copy into place.
3. For Excel sheets, pass `--sheet "Sheet1"` to read a specific tab.
4. Combine commands when needed: first `filter` to restrict rows, then `transform` with `--output` to add calculated columns, and finally `convert` to export as CSV for a teammate.
5. Because previews use Markdown tables, they look best when the terminal supports monospace output.

## Troubleshooting

- **Missing dependency `tabulate`**: install `python3-tabulate` via apt or pip so previews render clean tables.
- **Excel export error**: ensure `openpyxl` is installed (`python3-openpyxl` on Debian).
- **Sheet not found**: pass the sheet name or 0-based index with `--sheet`. If it still fails, open the workbook in LibreOffice or Excel to confirm the tab name.
- **`ValueError: Unsupported export format`**: double-check the target file extension (`.csv`, `.tsv`, `.xlsx`).
- **`--inplace` not saving**: the script only overwrites when `--inplace` is paired with `transform`; for `filter`, use `--output`.
