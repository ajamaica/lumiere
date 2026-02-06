"""Extract data:image/*;base64,... images from browser-use get html JSON output.

Input is the JSON produced by:
  browser-use --json get html > /tmp/page_html.json

Writes extracted images into --outdir.
"""

import argparse
import base64
import json
import re
from pathlib import Path


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", required=True, help="Input JSON file")
    ap.add_argument("--outdir", required=True, help="Output directory")
    args = ap.parse_args()

    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    obj = json.load(open(args.inp, "r", encoding="utf-8"))
    html = obj.get("data", {}).get("html", "")

    imgs = re.findall(r"data:image/(png|jpeg);base64,([A-Za-z0-9+/=]+)", html)
    if not imgs:
        print("no data:image found")
        return

    # sort biggest first
    imgs = sorted(imgs, key=lambda x: len(x[1]), reverse=True)

    for i, (ext, b64) in enumerate(imgs):
        out = outdir / f"dataimg_{i}.{ext}"
        out.write_bytes(base64.b64decode(b64))
        print(str(out))


if __name__ == "__main__":
    main()
