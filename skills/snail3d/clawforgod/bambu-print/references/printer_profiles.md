# Bambu Lab Printer Profiles

## A1 Mini (Your Printer)

- **Build plate**: 165 x 180 x 165 mm
- **Nozzle**: Single color (0.4mm)
- **Filament**: PLA, PETG, TPU, ABS, ASA, PA, PC
- **Max speed**: 250 mm/s

### Recommended Settings

**Fast Print** (high speed, less quality):

- Layer height: 0.2mm
- Infill: 10-15%
- Speed: 200 mm/s

**Standard Print** (balanced):

- Layer height: 0.15mm
- Infill: 15-20%
- Speed: 150 mm/s

**Quality Print** (high detail):

- Layer height: 0.10mm
- Infill: 15-20%
- Speed: 80-100 mm/s

### Temperature Profile (PLA - Purple)

```json
{
  "filament_type": "PLA",
  "bed_temp": 60,
  "nozzle_temp": 210,
  "first_layer_bed_temp": 65,
  "first_layer_nozzle_temp": 215
}
```

## Other Bambu Lab Models

### P1S

- Build plate: 256 x 256 x 256 mm
- Multi-color: Yes (AMS + Extruder)
- Similar settings to A1 Mini, but larger

### P1P

- Build plate: 256 x 256 x 256 mm
- Single color
- Similar to P1S but no multi-color support

### X1C

- Build plate: 256 x 256 x 256 mm
- Multi-color: Yes
- Built-in enclosure, higher temp capability

## Profile Configuration

Store printer settings in `~/.bambu-config/printers/`:

```
~/.bambu-config/
├── printers/
│   └── a1-mini.json
├── process/
│   ├── fast.json
│   ├── standard.json
│   └── quality.json
└── filaments/
    ├── purple-pla.json
    ├── black-pla.json
    └── white-pla.json
```

### Example printer.json (A1 Mini)

```json
{
  "machine_type": "BambuLab A1 Mini",
  "resolution": 0.4,
  "nozzle_diameter": 0.4,
  "max_layer_height": 0.2,
  "min_layer_height": 0.08,
  "bed_shape": "rectangular",
  "bed_size": [165, 180],
  "max_print_height": 165
}
```

### Example process.json (Standard Quality)

```json
{
  "layer_height": 0.15,
  "wall_thickness": 0.8,
  "infill_density": 15,
  "print_speed": 150,
  "travel_speed": 200,
  "initial_layer_speed": 30,
  "retraction_enabled": true
}
```
