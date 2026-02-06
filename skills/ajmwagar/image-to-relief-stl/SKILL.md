---
name: image-to-relief-stl
description: Turn a source image (or multi-color mask image) into a 3D-printable bas-relief STL by mapping colors (or grayscale) to heights. Use when you have an image from an image-gen skill (nano-banana-pro, etc.) and want a real, printable model (STL) via a deterministic pipeline.
metadata:
  openclaw:
    requires:
      bins: ['python3', 'potrace', 'mkbitmap']
    install:
      - id: apt
        kind: apt
        package: potrace
        bins: ['potrace', 'mkbitmap']
        label: Install potrace + mkbitmap (apt)
      - id: brew
        kind: brew
        formula: potrace
        bins: ['potrace', 'mkbitmap']
        label: Install potrace + mkbitmap (brew)
---

# image-to-relief-stl

Generate a **watertight, printable STL** from an input image by mapping colors (or grayscale) to heights.

This is an orchestrator-friendly workflow:

- Use **nano-banana-pro** (or any image model) to generate a **flat-color** image.
- Run this skill to convert it into a **bas-relief** model.

## Practical constraints (to make it work well)

Ask the image model for:

- **exactly N solid colors** (no gradients)
- **no shadows / no antialiasing**
- bold shapes with clear edges

That makes segmentation reliable.

## Quick start (given an image)

```bash
bash scripts/image_to_relief.sh input.png --out out.stl \
  --mode palette \
  --palette '#000000=3.0,#ffffff=0.0' \
  --base 1.5 \
  --pixel 0.4
```

### Grayscale mode

```bash
bash scripts/image_to_relief.sh input.png --out out.stl \
  --mode grayscale \
  --min-height 0.0 \
  --max-height 3.0 \
  --base 1.5 \
  --pixel 0.4
```

## Outputs

- `out.stl` (ASCII STL)
- optional `out-preview.svg` (vector preview via potrace; best-effort)

## Notes

- This v0 uses a **raster heightfield** meshing approach (robust, no heavy CAD deps).
- The `--pixel` parameter controls resolution (smaller = higher detail, bigger STL).
