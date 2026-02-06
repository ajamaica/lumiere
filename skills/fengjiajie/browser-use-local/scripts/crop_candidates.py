"""Generate a few likely QR-code crops from a full-page screenshot.

This is a heuristic helper: many login pages place QR codes on the right side.
"""

import argparse
from pathlib import Path

from PIL import Image


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", required=True, help="Input screenshot (png/jpg)")
    ap.add_argument("--outdir", required=True, help="Output directory")
    args = ap.parse_args()

    inp = Path(args.inp)
    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    img = Image.open(inp)
    w, h = img.size

    crops = {
        "right_half": (w // 2, 0, w, h),
        "right_center": (int(w * 0.55), int(h * 0.15), int(w * 0.95), int(h * 0.85)),
        "center": (int(w * 0.25), int(h * 0.15), int(w * 0.75), int(h * 0.85)),
        "top_center": (int(w * 0.25), 0, int(w * 0.75), int(h * 0.5)),
        "bottom_center": (int(w * 0.25), int(h * 0.5), int(w * 0.75), h),
    }

    for name, box in crops.items():
        out = outdir / f"{inp.stem}_crop_{name}.png"
        img.crop(box).save(out)
        print(str(out))


if __name__ == "__main__":
    main()
