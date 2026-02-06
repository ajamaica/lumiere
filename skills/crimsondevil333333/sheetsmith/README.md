# Sheetsmith

Sheetsmith is the pandas-based CSV/TSV/Excel assistant for OpenClaw. It gives you one CLI for:

- Inspecting spreadsheets (`summary`, `describe`, `preview`)
- Filtering or sampling rows via pandas queries (`filter`)
- Transforming columns with expressions, renames, drops, and safe writes (`transform`)
- Converting between CSV, TSV, and Excel formats (`convert`)

The script lives at `skills/sheetsmith/scripts/sheetsmith.py` and is the single source of truth for all operations, so you never have to re-write pandas boilerplate.

## Dependencies (already installed)

Sheetsmith relies on the Debian-packaged stack:

- `python3-pandas` (dataframes + Excel/CSV readers)
- `python3-openpyxl` + `python3-xlrd` (Excel file support)
- `python3-tabulate` (pretty Markdown previews)

Because these are installed system-wide, you can run the CLI without building a virtualenv.

## Usage

1. **Place the file** somewhere under the workspace (e.g., `workspace/inputs/my-data.xlsx`).
2. **Run a command:** `python3 skills/sheetsmith/scripts/sheetsmith.py <command> <path>` plus any flags listed below.
3. **Inspect the output** (Markdown tables are provided for previews) and, when you write data, use `--output new.xlsx` or `--inplace` to persist it.

### Common commands

| Command     | Description                                                                           | Example                                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `summary`   | Print shape/dtypes, missing-value info, and a Markdown preview of the first/last rows | `... summary inputs/sales.csv --rows 5 --tail`                                                                            |
| `describe`  | Run `DataFrame.describe()` with optional `--include`/`--percentiles`                  | `... describe data.xlsx --include all --percentiles 10 90`                                                                |
| `preview`   | Show only head/tail rows without any analysis                                         | `... preview report.tsv --tail --rows 3`                                                                                  |
| `filter`    | Apply a pandas query string and optionally sample/write results                       | `... filter data.csv --query "state == 'CA'" --output outputs/ca.csv`                                                     |
| `transform` | Add/rename/drop columns via pandas expressions, then preview or save                  | `... transform data.csv --expr "density = population / area" --rename active:is_active --output outputs/with-density.csv` |
| `convert`   | Re-export to CSV/TSV/XLSX by specifying `--output` with the desired extension         | `... convert raw.xlsx --output clean.csv`                                                                                 |

### Filtering & transforming tips

- Query strings use pandas syntax: `"region == 'EMEA' and sales >= 1e5"`.
- Use `--sample <n>` on `filter` to inspect a random subset without overwhelming the session.
- Provide `--expr` expressions (star `column = formula`) to create calculated columns, then rename/dropping as needed before writing.
- Write to a new file with `--output`; `--inplace` only overwrites when you explicitly request it.

### Automation & repeated work

You can chain commands manually:

1. `filter` the rows you need
2. `transform` to add/rename/drop columns
3. `convert` to output the final format

Every step shares the same CLI, so scripts and workflows stay consistent.

## Handling files from humans/bots

1. **Receive the attachment** (CSV/Excel) and save it into the workspace (I usually place it under `workspace/inputs/`).
2. **Run Sheetsmith** pointing to that path. For example:
   ```bash
   python3 skills/sheetsmith/scripts/sheetsmith.py summary workspace/inputs/inbox.xlsx --rows 5
   ```
3. **Share results** back in chat. If a modified file is needed, use `--output` to write it into `workspace/outputs/` and upload that file (I can send it back via Telegram or WhatsApp).

If you want me to keep a log of every dataset I touched, I can update `memory` entries as part of the workflow.

## Testing

Run the unit tests with:

```bash
python3 -m unittest discover skills/sheetsmith/tests
```

They exercise the summary/preview workflows, `filter`, and `transform` commands using `tests/data/test.csv`, so you can trust the CLI on small but representative data.

## Publishing & development notes

- Skill metadata: `SKILL.md` explains triggers and workflows.
- Additional reference: `references/usage.md` contains a cheat sheet plus troubleshooting notes.
- Packaging script: `python3 $(npm root -g)/openclaw/skills/skill-creator/scripts/package_skill.py skills/sheetsmith` creates `sheetsmith.skill` for ClawHub or release bundles.

## Links

- **GitHub:** https://github.com/CrimsonDevil333333/sheetsmith
- **ClawHub:** https://www.clawhub.ai/skills/sheetsmith
