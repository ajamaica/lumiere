#!/usr/bin/env python3
"""image_to_relief.py

Generate a watertight ASCII STL bas-relief from an input image.

Approach (v0): raster heightfield mesh.
- Convert image to a 2D grid of heights.
- Emit top surface + bottom + side walls at boundaries.

This is robust and dependency-light (Pillow only).

Units: millimeters.
"""

from __future__ import annotations

import argparse
import hashlib
import math
from typing import Dict, Iterable, List, Tuple

from PIL import Image

Vec3 = Tuple[float, float, float]
Tri = Tuple[Vec3, Vec3, Vec3]


def vsub(a: Vec3, b: Vec3) -> Vec3:
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def vcross(a: Vec3, b: Vec3) -> Vec3:
    return (
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    )


def vnorm(a: Vec3) -> Vec3:
    l = math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2])
    if l == 0:
        return (0.0, 0.0, 0.0)
    return (a[0] / l, a[1] / l, a[2] / l)


def tri_normal(t: Tri) -> Vec3:
    (a, b, c) = t
    return vnorm(vcross(vsub(b, a), vsub(c, a)))


def write_ascii_stl(path: str, name: str, tris: Iterable[Tri]) -> None:
    with open(path, "w", encoding="utf-8") as f:
        f.write(f"solid {name}\n")
        for t in tris:
            n = tri_normal(t)
            f.write(f"  facet normal {n[0]:.6e} {n[1]:.6e} {n[2]:.6e}\n")
            f.write("    outer loop\n")
            for v in t:
                f.write(f"      vertex {v[0]:.6e} {v[1]:.6e} {v[2]:.6e}\n")
            f.write("    endloop\n")
            f.write("  endfacet\n")
        f.write(f"endsolid {name}\n")


def parse_palette(p: str) -> Dict[Tuple[int, int, int], float]:
    """Parse palette string '#rrggbb=h,#rrggbb=h' to RGB->height."""
    out: Dict[Tuple[int, int, int], float] = {}
    if not p:
        return out
    for item in p.split(","):
        item = item.strip()
        if not item:
            continue
        color_s, h_s = item.split("=")
        color_s = color_s.strip().lower()
        if color_s.startswith("#"):
            color_s = color_s[1:]
        if len(color_s) != 6:
            raise ValueError(f"bad color: {color_s}")
        r = int(color_s[0:2], 16)
        g = int(color_s[2:4], 16)
        b = int(color_s[4:6], 16)
        out[(r, g, b)] = float(h_s)
    return out


def height_grid_palette(img: Image.Image, palette: Dict[Tuple[int, int, int], float]) -> List[List[float]]:
    px = img.convert("RGBA").load()
    w, h = img.size
    grid = [[0.0 for _ in range(w)] for __ in range(h)]

    # Map exact colors; unknown colors -> 0.
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 10:
                grid[y][x] = 0.0
            else:
                grid[y][x] = float(palette.get((r, g, b), 0.0))
    return grid


def height_grid_grayscale(img: Image.Image, minh: float, maxh: float) -> List[List[float]]:
    g = img.convert("L")
    px = g.load()
    w, h = g.size
    grid = [[0.0 for _ in range(w)] for __ in range(h)]
    for y in range(h):
        for x in range(w):
            v = px[x, y] / 255.0
            grid[y][x] = minh + (maxh - minh) * v
    return grid


def downsample(grid: List[List[float]], factor: int) -> List[List[float]]:
    if factor <= 1:
        return grid
    h = len(grid)
    w = len(grid[0])
    nh = max(1, h // factor)
    nw = max(1, w // factor)
    out = [[0.0 for _ in range(nw)] for __ in range(nh)]
    for y2 in range(nh):
        for x2 in range(nw):
            # max-pool (preserves silhouette)
            m = 0.0
            for yy in range(y2 * factor, min(h, (y2 + 1) * factor)):
                for xx in range(x2 * factor, min(w, (x2 + 1) * factor)):
                    m = max(m, grid[yy][xx])
            out[y2][x2] = m
    return out


def mesh_heightfield(grid: List[List[float]], pixel: float, base: float) -> List[Tri]:
    """Generate watertight mesh for heightfield.

    grid[y][x] is additional height above base plane.
    """
    h = len(grid)
    w = len(grid[0])

    # coordinate: center on origin
    ox = -w * pixel / 2.0
    oy = -h * pixel / 2.0

    def z_at(x: int, y: int) -> float:
        return base + grid[y][x]

    tris: List[Tri] = []

    # Top surface (2 tris per cell)
    for y in range(h - 1):
        for x in range(w - 1):
            z00 = z_at(x, y)
            z10 = z_at(x + 1, y)
            z01 = z_at(x, y + 1)
            z11 = z_at(x + 1, y + 1)

            p00 = (ox + x * pixel, oy + y * pixel, z00)
            p10 = (ox + (x + 1) * pixel, oy + y * pixel, z10)
            p01 = (ox + x * pixel, oy + (y + 1) * pixel, z01)
            p11 = (ox + (x + 1) * pixel, oy + (y + 1) * pixel, z11)

            tris.append((p00, p10, p11))
            tris.append((p00, p11, p01))

    # Bottom plane (flat at z=0)
    z0 = 0.0
    p00 = (ox, oy, z0)
    p10 = (ox + (w - 1) * pixel, oy, z0)
    p11 = (ox + (w - 1) * pixel, oy + (h - 1) * pixel, z0)
    p01 = (ox, oy + (h - 1) * pixel, z0)
    tris.append((p00, p11, p10))
    tris.append((p00, p01, p11))

    # Side walls: compare edge heights and create quads along boundary of grid.
    # Left & right boundaries
    for y in range(h - 1):
        # left edge at x=0
        x = 0
        zt0 = z_at(x, y)
        zt1 = z_at(x, y + 1)
        xt = ox + x * pixel
        y0 = oy + y * pixel
        y1 = oy + (y + 1) * pixel
        # quad (xt,y0,z0)->(xt,y1,z0)->(xt,y1,zt1)->(xt,y0,zt0)
        a = (xt, y0, z0)
        b = (xt, y1, z0)
        c = (xt, y1, zt1)
        d = (xt, y0, zt0)
        tris.append((a, b, c))
        tris.append((a, c, d))

        # right edge at x=w-1
        x = w - 1
        zt0 = z_at(x, y)
        zt1 = z_at(x, y + 1)
        xt = ox + x * pixel
        a = (xt, y0, z0)
        b = (xt, y0, zt0)
        c = (xt, y1, zt1)
        d = (xt, y1, z0)
        tris.append((a, b, c))
        tris.append((a, c, d))

    # Top & bottom boundaries
    for x in range(w - 1):
        # top edge y=0
        y = 0
        zt0 = z_at(x, y)
        zt1 = z_at(x + 1, y)
        yt = oy + y * pixel
        x0 = ox + x * pixel
        x1 = ox + (x + 1) * pixel
        a = (x0, yt, z0)
        b = (x1, yt, z0)
        c = (x1, yt, zt1)
        d = (x0, yt, zt0)
        tris.append((a, b, c))
        tris.append((a, c, d))

        # bottom edge y=h-1
        y = h - 1
        zt0 = z_at(x, y)
        zt1 = z_at(x + 1, y)
        yt = oy + y * pixel
        a = (x0, yt, z0)
        b = (x0, yt, zt0)
        c = (x1, yt, zt1)
        d = (x1, yt, z0)
        tris.append((a, b, c))
        tris.append((a, c, d))

    return tris


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", required=True)
    ap.add_argument("--out", dest="out", required=True)
    ap.add_argument("--mode", choices=["palette", "grayscale"], default="palette")
    ap.add_argument("--palette", default="")
    ap.add_argument("--base", type=float, default=1.5)
    ap.add_argument("--pixel", type=float, default=0.4)
    ap.add_argument("--min-height", type=float, default=0.0)
    ap.add_argument("--max-height", type=float, default=3.0)
    ap.add_argument("--downsample", type=int, default=1)
    args = ap.parse_args()

    img = Image.open(args.inp)

    if args.mode == "palette":
        pal = parse_palette(args.palette)
        if not pal:
            raise SystemExit("palette mode requires --palette")
        grid = height_grid_palette(img, pal)
    else:
        grid = height_grid_grayscale(img, args.min_height, args.max_height)

    grid = downsample(grid, args.downsample)

    tris = mesh_heightfield(grid, pixel=args.pixel, base=args.base)

    name = "relief"
    write_ascii_stl(args.out, name, tris)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
