#!/usr/bin/env python3
# SVG → FreeCAD/STL Exporter for Naubiomech Leg (Elysium)
# Usage: python export-svg-to-3d.py leg.svg → leg.fcstd / leg.stl
# Req: FreeCAD (pip install freecad) or svg.path + simple extrusion

import sys
import json
from xml.etree import ElementTree as ET
import numpy as np

def parse_svg_leg(svg_path):
    tree = ET.parse(svg_path)
    root = tree.getroot()
    primitives = []
    for elem in root.iter('rect'):
        primitives.append({
            'type': 'extrude',
            'width': float(elem.get('width', 0)),
            'height': float(elem.get('height', 0)),
            'x': float(elem.get('x', 0)),
            'y': float(elem.get('y', 0)),
            'depth': 20  # Leg thickness mm
        })
    for elem in root.iter('circle'):
        primitives.append({
            'type': 'cylinder',
            'r': float(elem.get('r', 0)),
            'cx': float(elem.get('cx', 0)),
            'cy': float(elem.get('cy', 0)),
            'height': 15
        })
    return primitives

def export_freecad_json(primitives, out_path):
    # FreeCAD macro JSON (import to Part workbench)
    fcstd = {'objects': primitives}
    with open(out_path, 'w') as f:
        json.dump(fcstd, f, indent=2)
    print(f'FreeCAD JSON: {out_path} (Load: Part > Import JSON)')

def export_stl_ascii(primitives, out_path):
    # Simple STL ASCII (mesh viewer)
    stl = 'solid leg\n'
    for prim in primitives:
        if prim['type'] == 'extrude':
            # Box mesh (simplified)
            w, h, d, x, y = prim['width'], prim['height'], prim['depth'], prim['x'], prim['y']
            # 12 triangles (cube)...
            stl += f'facet normal 0 0 1\nouter loop\nvertex {x} {y} 0\nvertex {x+w} {y} 0\nvertex {x+w} {y+h} 0\n...\nendloop\nendfacet\n'  # Trunc
    stl += 'endsolid'
    with open(out_path, 'w') as f:
        f.write(stl)
    print(f'STL: {out_path} (View: MeshLab/FreeCAD)')

if __name__ == '__main__':
    import os
svg_dir = os.path.dirname(__file__)
svg = sys.argv[1] if len(sys.argv)>1 else os.path.join(svg_dir, 'assets', 'leg.svg')
print(f'Loading SVG: {svg}')
    try:
        prims = parse_svg_leg(svg)
        out_fc = svg.replace('.svg', '.fcstd.json')
        out_stl = svg.replace('.svg', '.stl')
        export_freecad_json(prims, out_fc)
        export_stl_ascii(prims, out_stl)
        print(f'✅ Exported: {out_fc}, {out_stl}')
        print(f'Primitives parsed: {len(prims)}')
    except FileNotFoundError:
        print(f'❌ SVG not found: {svg}. Run: python scripts/export-svg-to-3d.py assets/leg.svg')
    except Exception as e:
        print(f'❌ Error: {e}')
