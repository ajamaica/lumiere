---
name: kicad-pcb
version: 1.0.0
description: Automate PCB design with KiCad. Create schematics, design boards, export Gerbers, order from PCBWay. Full design-to-manufacturing pipeline.
author: PaxSwarm
license: MIT
keywords: [pcb, kicad, electronics, gerber, schematic, circuit, pcbway, manufacturing, hardware]
triggers:
  ['pcb design', 'kicad', 'circuit board', 'schematic', 'gerber', 'pcbway', 'electronics project']
---

# 🔧 KiCad PCB Automation

**Design → Prototype → Manufacture**

Automate PCB design workflows using KiCad. From natural language circuit descriptions to manufacturing-ready Gerber files.

## What This Skill Does

1. **Design** — Create schematics from circuit descriptions
2. **Layout** — Design PCB layouts with component placement
3. **Verify** — Run DRC checks, generate previews for review
4. **Export** — Generate manufacturing files (Gerbers, drill files, BOM)
5. **Order** — Prepare and place orders on PCBWay

## Requirements

### KiCad Installation

```bash
# Ubuntu/Debian
sudo add-apt-repository ppa:kicad/kicad-8.0-releases
sudo apt update
sudo apt install kicad

# Verify CLI
kicad-cli --version
```

### Python Dependencies

```bash
pip install pillow cairosvg
```

## Quick Start

```bash
# 1. Create a new project
python3 scripts/kicad_pcb.py new "LED Blinker" --description "555 timer LED blinker circuit"

# 2. Add components to schematic
python3 scripts/kicad_pcb.py add-component NE555 U1
python3 scripts/kicad_pcb.py add-component LED D1
python3 scripts/kicad_pcb.py add-component "R 1K" R1 R2

# 3. Generate schematic preview (for review)
python3 scripts/kicad_pcb.py preview-schematic

# 4. Run design rule check
python3 scripts/kicad_pcb.py drc

# 5. Export manufacturing files
python3 scripts/kicad_pcb.py export-gerbers

# 6. Prepare PCBWay order
python3 scripts/kicad_pcb.py pcbway-quote --quantity 5
```

## Commands

### Project Management

| Command         | Description               |
| --------------- | ------------------------- |
| `new <name>`    | Create new KiCad project  |
| `open <path>`   | Open existing project     |
| `info`          | Show current project info |
| `list-projects` | List recent projects      |

### Schematic Design

| Command                         | Description                |
| ------------------------------- | -------------------------- |
| `add-component <type> <ref>`    | Add component to schematic |
| `connect <ref1.pin> <ref2.pin>` | Wire components together   |
| `add-net <name> <refs...>`      | Create named net           |
| `preview-schematic`             | Generate schematic image   |
| `erc`                           | Run electrical rules check |

### PCB Layout

| Command                  | Description                 |
| ------------------------ | --------------------------- |
| `import-netlist`         | Import schematic to PCB     |
| `auto-place`             | Auto-place components       |
| `auto-route`             | Auto-route traces           |
| `set-board-size <W>x<H>` | Set board dimensions (mm)   |
| `preview-pcb`            | Generate PCB preview images |
| `drc`                    | Run design rules check      |

### Manufacturing Export

| Command           | Description                |
| ----------------- | -------------------------- |
| `export-gerbers`  | Export Gerber files        |
| `export-drill`    | Export drill files         |
| `export-bom`      | Export bill of materials   |
| `export-pos`      | Export pick-and-place file |
| `export-3d`       | Export 3D model (STEP/GLB) |
| `package-for-fab` | Create ZIP with all files  |

### PCBWay Integration

| Command         | Description                 |
| --------------- | --------------------------- |
| `pcbway-quote`  | Get instant quote           |
| `pcbway-upload` | Upload Gerbers to PCBWay    |
| `pcbway-cart`   | Add to cart (requires auth) |

## Workflow: Natural Language to PCB

### Step 1: Describe Your Circuit

Tell me what you want to build:

> "I need a simple 555 timer circuit that blinks an LED at about 1Hz.
> Should run on 9V battery, through-hole components for easy soldering."

### Step 2: I'll Generate the Design

```bash
# Create project
kicad_pcb.py new "LED_Blinker_555"

# Add components based on description
kicad_pcb.py from-description "555 timer LED blinker, 1Hz, 9V battery"
```

### Step 3: Review & Confirm

I'll show you:

- Schematic preview image
- Component list (BOM)
- Calculated values (resistors for timing, etc.)

You confirm or request changes.

### Step 4: PCB Layout

```bash
# Import to PCB
kicad_pcb.py import-netlist

# Auto-layout (or manual guidance)
kicad_pcb.py auto-place --strategy compact
kicad_pcb.py set-board-size 50x30

# Preview
kicad_pcb.py preview-pcb --layers F.Cu,B.Cu,F.Silkscreen
```

### Step 5: Manufacturing

```bash
# Run final checks
kicad_pcb.py drc --strict

# Export everything
kicad_pcb.py package-for-fab --output LED_Blinker_fab.zip

# Get quote
kicad_pcb.py pcbway-quote --quantity 10 --layers 2 --thickness 1.6
```

## Common Circuit Templates

### templates/555_astable.kicad_sch

Classic 555 timer in astable mode. Parameters:

- R1, R2: Timing resistors
- C1: Timing capacitor
- Freq ≈ 1.44 / ((R1 + 2*R2) * C1)

### templates/arduino_shield.kicad_pcb

Arduino Uno shield template with:

- Header footprints
- Mounting holes
- Power rails

### templates/usb_c_power.kicad_sch

USB-C power delivery (5V):

- USB-C connector
- CC resistors
- ESD protection

## Configuration

Create `~/.kicad-pcb/config.json`:

```json
{
  "default_fab": "pcbway",
  "pcbway": {
    "email": "your@email.com",
    "default_options": {
      "layers": 2,
      "thickness": 1.6,
      "color": "green",
      "surface_finish": "hasl"
    }
  },
  "kicad_path": "/usr/bin/kicad-cli",
  "projects_dir": "~/kicad-projects",
  "auto_backup": true
}
```

## Design Review Protocol

Before ordering, I'll always:

1. **Show schematic** — Visual confirmation of circuit
2. **Show PCB renders** — Top, bottom, 3D view
3. **List BOM** — All components with values
4. **Report DRC** — Any warnings or errors
5. **Show quote** — Cost breakdown before ordering

**I will NOT auto-order without explicit confirmation.**

## PCBWay Order Flow (Current)

1. Export Gerbers + drill files
2. Create ZIP package
3. **Manual step**: You upload to pcbway.com
4. **Future**: Automated upload + cart placement

## Cost Reference

PCBWay typical pricing (2-layer, 100x100mm, qty 5):

- Standard (5-7 days): ~$5
- Express (3-4 days): ~$15
- Shipping: ~$15-30 DHL

## Safety Notes

⚠️ **High Voltage Warning**: This skill does not validate electrical safety. For mains-connected circuits, consult a qualified engineer.

⚠️ **No Auto-Order (Yet)**: Cart placement requires your explicit confirmation.

## Changelog

### v1.0.0

- Initial release
- KiCad CLI integration
- Schematic/PCB preview generation
- Gerber export
- PCBWay quote integration
- Template system

---

_Built by [PaxSwarm](https://moltbook.com/agent/PaxSwarm)_
