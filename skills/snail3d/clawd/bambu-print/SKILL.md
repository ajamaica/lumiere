---
name: bambu-print
description: Search online 3D model repositories (Printables, MakerWorld, etc.), download models, slice with BambuStudio CLI, and send prints to Bambu Lab printers (A1 Mini, P1, etc.). Use when you want to find, prepare, and print 3D models without manual GUI interaction.
---

# Bambu Print Skill

Automate 3D model discovery, slicing, and printing with Bambu Lab printers via CLI.

## Quick Start

### Search and Print a Model

```bash
# Search for a model and print it
bambu-print search "dragon" --site printables --color purple --printer-model a1-mini

# Or download and slice directly
bambu-print download https://printables.com/model/12345 --output /path/to/output.stl
bambu-print slice output.stl --printer a1-mini --color purple --export result.3mf
bambu-print send result.3mf --printer-name "A1 Mini"
```

## Workflow

### 1. Search Online Repositories

Search Printables, MakerWorld, MyMiniFactory, or Thingiverse for models:

- Query terms: model name, type, style
- Filter by: popularity, complexity, print time
- Return: top results with download links

### 2. Download Models

Download STL/3MF files from search results to local disk.

### 3. Slice with BambuStudio

Use `bambu-studio` CLI to slice STL → 3MF:

```bash
bambu-studio \
  --orient \
  --arrange 1 \
  --load-settings "printer.json;process.json" \
  --load-filaments "filament.json" \
  --slice 0 \
  --export-3mf output.3mf \
  input.stl
```

Key options:

- `--orient`: Auto-orient for printing
- `--arrange`: Auto-arrange on bed
- `--load-settings`: Custom printer/process profiles
- `--load-filaments`: Filament settings (color, material)
- `--export-3mf`: Output sliced file ready to print

### 4. Send to Printer

Send the sliced 3MF file to your Bambu Lab printer via Bambu Studio.

## Configuration

Store printer and filament profiles in `~/.bambu-config/`:

- `printers/a1-mini.json` - Machine settings for A1 Mini
- `process/standard.json` - Print profiles (speed, quality)
- `filaments/purple-pla.json` - Filament settings (color, material)

### Example Filament Config

```json
{
  "filament_type": "PLA",
  "filament_color": "#7B2CBF",
  "bed_temp": 60,
  "nozzle_temp": 210
}
```

## Bundled Resources

- **scripts/search_models.py** - Search multiple model repositories
- **scripts/slice_model.py** - Wrapper around bambu-studio CLI
- **references/printer_profiles.md** - Printer-specific settings
- **references/sites.md** - Supported model repositories

## Common Tasks

**Find and print a dragon:**

```bash
bambu-print search "dragon" --site printables --color purple --auto
```

**Slice a downloaded model with custom settings:**

```bash
bambu-print slice model.stl --printer a1-mini --process fast --filament purple-pla
```

**Send to a specific printer:**

```bash
bambu-print send model.3mf --printer-name "My A1 Mini"
```

## Troubleshooting

**BambuStudio not found**: Ensure `bambu-studio` CLI is installed and in PATH.

**Model slicing fails**: Check printer.json and process.json settings are valid.

**Printer not responding**: Verify printer is online and reachable via Bambu Cloud.
