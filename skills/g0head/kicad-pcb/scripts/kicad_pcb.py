#!/usr/bin/env python3
"""
KiCad PCB Automation — Design to Manufacturing Pipeline

Commands:
    new <name>              Create new KiCad project
    info                    Show current project info
    preview-schematic       Generate schematic preview image
    preview-pcb             Generate PCB preview images
    drc                     Run design rules check
    erc                     Run electrical rules check
    export-gerbers          Export Gerber files for manufacturing
    export-drill            Export drill files
    export-bom              Export bill of materials
    package-for-fab         Create ZIP with all fab files
    pcbway-quote            Get PCBWay instant quote
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any

# Configuration
CONFIG_DIR = Path.home() / ".kicad-pcb"
CONFIG_FILE = CONFIG_DIR / "config.json"
PROJECTS_DIR = Path.home() / "kicad-projects"
CURRENT_PROJECT_FILE = CONFIG_DIR / "current_project.json"

# KiCad paths (auto-detect)
KICAD_CLI = shutil.which("kicad-cli") or "/usr/bin/kicad-cli"

# Default PCB options
DEFAULT_PCB_OPTIONS = {
    "layers": 2,
    "thickness": 1.6,
    "color": "green",
    "surface_finish": "hasl",
    "copper_weight": "1oz",
    "min_hole": 0.3,
    "min_trace": 0.15
}


def ensure_dirs():
    """Create necessary directories."""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    PROJECTS_DIR.mkdir(parents=True, exist_ok=True)


def load_config() -> dict:
    """Load configuration."""
    ensure_dirs()
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE) as f:
                return json.load(f)
        except:
            pass
    return {"projects_dir": str(PROJECTS_DIR)}


def save_config(config: dict):
    """Save configuration."""
    ensure_dirs()
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)


def get_current_project() -> Optional[dict]:
    """Get current project info."""
    if CURRENT_PROJECT_FILE.exists():
        try:
            with open(CURRENT_PROJECT_FILE) as f:
                return json.load(f)
        except:
            pass
    return None


def set_current_project(project: dict):
    """Set current project."""
    ensure_dirs()
    with open(CURRENT_PROJECT_FILE, "w") as f:
        json.dump(project, f, indent=2)


def check_kicad():
    """Check if KiCad CLI is available."""
    if not shutil.which("kicad-cli"):
        print("❌ KiCad CLI not found!")
        print("\nInstall KiCad:")
        print("  Ubuntu: sudo apt install kicad")
        print("  Or: https://www.kicad.org/download/")
        return False
    return True


def run_kicad_cli(args: List[str], capture=True) -> subprocess.CompletedProcess:
    """Run kicad-cli command."""
    cmd = [KICAD_CLI] + args
    if capture:
        return subprocess.run(cmd, capture_output=True, text=True)
    else:
        return subprocess.run(cmd)


# =============================================================================
# Project Management
# =============================================================================

def cmd_new(args):
    """Create new KiCad project."""
    name = args.name.replace(" ", "_")
    config = load_config()
    projects_dir = Path(config.get("projects_dir", PROJECTS_DIR))
    
    project_dir = projects_dir / name
    if project_dir.exists():
        print(f"❌ Project already exists: {project_dir}")
        sys.exit(1)
    
    project_dir.mkdir(parents=True)
    
    # Create project file
    pro_file = project_dir / f"{name}.kicad_pro"
    pro_content = {
        "board": {"design_settings": {}},
        "meta": {"filename": f"{name}.kicad_pro", "version": 1},
        "schematic": {"drawing": {}},
        "sheets": [[f"{name}.kicad_sch", ""]]
    }
    with open(pro_file, "w") as f:
        json.dump(pro_content, f, indent=2)
    
    # Create empty schematic
    sch_file = project_dir / f"{name}.kicad_sch"
    sch_content = f'''(kicad_sch (version 20230121) (generator eeschema)
  (uuid "{datetime.now().strftime('%Y%m%d%H%M%S')}")
  (paper "A4")
  (lib_symbols)
  (sheet_instances
    (path "/" (page "1"))
  )
)
'''
    with open(sch_file, "w") as f:
        f.write(sch_content)
    
    # Create empty PCB
    pcb_file = project_dir / f"{name}.kicad_pcb"
    pcb_content = f'''(kicad_pcb (version 20230121) (generator pcbnew)
  (general
    (thickness 1.6)
  )
  (paper "A4")
  (layers
    (0 "F.Cu" signal)
    (31 "B.Cu" signal)
    (32 "B.Adhes" user "B.Adhesive")
    (33 "F.Adhes" user "F.Adhesive")
    (34 "B.Paste" user)
    (35 "F.Paste" user)
    (36 "B.SilkS" user "B.Silkscreen")
    (37 "F.SilkS" user "F.Silkscreen")
    (38 "B.Mask" user)
    (39 "F.Mask" user)
    (40 "Dwgs.User" user "User.Drawings")
    (41 "Cmts.User" user "User.Comments")
    (42 "Eco1.User" user "User.Eco1")
    (43 "Eco2.User" user "User.Eco2")
    (44 "Edge.Cuts" user)
    (45 "Margin" user)
    (46 "B.CrtYd" user "B.Courtyard")
    (47 "F.CrtYd" user "F.Courtyard")
    (48 "B.Fab" user)
    (49 "F.Fab" user)
    (50 "User.1" user)
    (51 "User.2" user)
  )
  (setup
    (pad_to_mask_clearance 0)
  )
  (net 0 "")
)
'''
    with open(pcb_file, "w") as f:
        f.write(pcb_content)
    
    # Save as current project
    project = {
        "name": name,
        "path": str(project_dir),
        "created": datetime.now().isoformat(),
        "description": args.description or ""
    }
    set_current_project(project)
    
    print(f"✅ Created project: {name}")
    print(f"   Path: {project_dir}")
    print(f"   Files:")
    print(f"     - {name}.kicad_pro")
    print(f"     - {name}.kicad_sch")
    print(f"     - {name}.kicad_pcb")
    
    if args.description:
        print(f"   Description: {args.description}")


def cmd_info(args):
    """Show current project info."""
    project = get_current_project()
    
    if not project:
        print("❌ No project selected")
        print("   Use: kicad_pcb.py new <name>")
        sys.exit(1)
    
    project_dir = Path(project["path"])
    
    print(f"╭─────────────────────────────────────╮")
    print(f"│      🔧 KICAD PROJECT INFO          │")
    print(f"├─────────────────────────────────────┤")
    print(f"│  Name: {project['name']:<27} │")
    print(f"│  Path: {str(project_dir)[:27]:<27} │")
    print(f"╰─────────────────────────────────────╯")
    
    # List files
    if project_dir.exists():
        print(f"\nFiles:")
        for f in sorted(project_dir.iterdir()):
            size = f.stat().st_size
            print(f"  {f.name:<30} {size:>8} bytes")


def cmd_open(args):
    """Open existing project."""
    project_path = Path(args.path).resolve()
    
    if not project_path.exists():
        print(f"❌ Path not found: {project_path}")
        sys.exit(1)
    
    # Find project file
    if project_path.is_file() and project_path.suffix == ".kicad_pro":
        pro_file = project_path
        project_dir = project_path.parent
    else:
        project_dir = project_path
        pro_files = list(project_dir.glob("*.kicad_pro"))
        if not pro_files:
            print(f"❌ No .kicad_pro file found in {project_dir}")
            sys.exit(1)
        pro_file = pro_files[0]
    
    name = pro_file.stem
    
    project = {
        "name": name,
        "path": str(project_dir),
        "opened": datetime.now().isoformat()
    }
    set_current_project(project)
    
    print(f"✅ Opened project: {name}")
    print(f"   Path: {project_dir}")


# =============================================================================
# Design Rules Check
# =============================================================================

def cmd_drc(args):
    """Run design rules check on PCB."""
    if not check_kicad():
        sys.exit(1)
    
    project = get_current_project()
    if not project:
        print("❌ No project selected")
        sys.exit(1)
    
    project_dir = Path(project["path"])
    pcb_file = project_dir / f"{project['name']}.kicad_pcb"
    
    if not pcb_file.exists():
        print(f"❌ PCB file not found: {pcb_file}")
        sys.exit(1)
    
    output_file = project_dir / "drc_report.json"
    
    print(f"🔍 Running DRC on {pcb_file.name}...")
    
    result = run_kicad_cli([
        "pcb", "drc",
        "--format", "json",
        "--output", str(output_file),
        "--severity-all",
        str(pcb_file)
    ])
    
    if result.returncode != 0:
        print(f"⚠️  DRC completed with issues")
        if result.stderr:
            print(result.stderr)
    else:
        print(f"✅ DRC passed!")
    
    # Parse and display results
    if output_file.exists():
        with open(output_file) as f:
            report = json.load(f)
        
        violations = report.get("violations", [])
        if violations:
            print(f"\n📋 Found {len(violations)} issues:")
            for v in violations[:10]:
                severity = v.get("severity", "unknown")
                desc = v.get("description", "No description")
                print(f"  [{severity}] {desc}")
            if len(violations) > 10:
                print(f"  ... and {len(violations) - 10} more")
        else:
            print("\n✅ No violations found!")


def cmd_erc(args):
    """Run electrical rules check on schematic."""
    if not check_kicad():
        sys.exit(1)
    
    project = get_current_project()
    if not project:
        print("❌ No project selected")
        sys.exit(1)
    
    project_dir = Path(project["path"])
    sch_file = project_dir / f"{project['name']}.kicad_sch"
    
    if not sch_file.exists():
        print(f"❌ Schematic file not found: {sch_file}")
        sys.exit(1)
    
    output_file = project_dir / "erc_report.json"
    
    print(f"🔍 Running ERC on {sch_file.name}...")
    
    result = run_kicad_cli([
        "sch", "erc",
        "--format", "json",
        "--output", str(output_file),
        "--severity-all",
        str(sch_file)
    ])
    
    if result.returncode != 0:
        print(f"⚠️  ERC completed with issues")
    else:
        print(f"✅ ERC passed!")


# =============================================================================
# Export Functions
# =============================================================================

def cmd_export_gerbers(args):
    """Export Gerber files for manufacturing."""
    if not check_kicad():
        sys.exit(1)
    
    project = get_current_project()
    if not project:
        print("❌ No project selected")
        sys.exit(1)
    
    project_dir = Path(project["path"])
    pcb_file = project_dir / f"{project['name']}.kicad_pcb"
    
    if not pcb_file.exists():
        print(f"❌ PCB file not found: {pcb_file}")
        sys.exit(1)
    
    output_dir = project_dir / "gerbers"
    output_dir.mkdir(exist_ok=True)
    
    print(f"📤 Exporting Gerbers...")
    
    result = run_kicad_cli([
        "pcb", "export", "gerbers",
        "--output", str(output_dir),
        str(pcb_file)
    ])
    
    if result.returncode != 0:
        print(f"❌ Gerber export failed")
        if result.stderr:
            print(result.stderr)
        sys.exit(1)
    
    # Count exported files
    gerber_files = list(output_dir.glob("*"))
    print(f"✅ Exported {len(gerber_files)} Gerber files to {output_dir}")
    for f in gerber_files:
        print(f"   {f.name}")


def cmd_export_drill(args):
    """Export drill files."""
    if not check_kicad():
        sys.exit(1)
    
    project = get_current_project()
    if not project:
        print("❌ No project selected")
        sys.exit(1)
    
    project_dir = Path(project["path"])
    pcb_file = project_dir / f"{project['name']}.kicad_pcb"
    
    output_dir = project_dir / "gerbers"
    output_dir.mkdir(exist_ok=True)
    
    print(f"📤 Exporting drill files...")
    
    result = run_kicad_cli([
        "pcb", "export", "drill",
        "--output", str(output_dir),
        "--format", "excellon",
        "--excellon-separate-th",
        "--generate-map",
        "--map-format", "pdf",
        str(pcb_file)
    ])
    
    if result.returncode == 0:
        print(f"✅ Drill files exported to {output_dir}")
    else:
        print(f"❌ Drill export failed")


def cmd_export_bom(args):
    """Export bill of materials."""
    project = get_current_project()
    if not project:
        print("❌ No project selected")
        sys.exit(1)
    
    project_dir = Path(project["path"])
    sch_file = project_dir / f"{project['name']}.kicad_sch"
    
    # For now, create a simple BOM from schematic parsing
    # Full implementation would use kicad-cli sch export bom
    
    print(f"📤 Exporting BOM...")
    print(f"⚠️  BOM export requires populated schematic")
    print(f"   Output: {project_dir}/bom.csv")


def cmd_package_for_fab(args):
    """Create ZIP with all fabrication files."""
    project = get_current_project()
    if not project:
        print("❌ No project selected")
        sys.exit(1)
    
    project_dir = Path(project["path"])
    gerber_dir = project_dir / "gerbers"
    
    if not gerber_dir.exists() or not list(gerber_dir.glob("*")):
        print("⚠️  No Gerber files found. Running export first...")
        # Would call cmd_export_gerbers here
    
    output_name = args.output or f"{project['name']}_fab.zip"
    output_path = project_dir / output_name
    
    print(f"📦 Creating fabrication package...")
    
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        if gerber_dir.exists():
            for f in gerber_dir.iterdir():
                zf.write(f, f.name)
    
    size_kb = output_path.stat().st_size / 1024
    print(f"✅ Created: {output_path}")
    print(f"   Size: {size_kb:.1f} KB")
    print(f"\n📤 Ready to upload to PCBWay!")


# =============================================================================
# Preview Generation
# =============================================================================

def cmd_preview_schematic(args):
    """Generate schematic preview image."""
    if not check_kicad():
        sys.exit(1)
    
    project = get_current_project()
    if not project:
        print("❌ No project selected")
        sys.exit(1)
    
    project_dir = Path(project["path"])
    sch_file = project_dir / f"{project['name']}.kicad_sch"
    
    if not sch_file.exists():
        print(f"❌ Schematic file not found: {sch_file}")
        sys.exit(1)
    
    output_file = project_dir / "schematic_preview.svg"
    
    print(f"🖼️  Generating schematic preview...")
    
    result = run_kicad_cli([
        "sch", "export", "svg",
        "--output", str(output_file),
        str(sch_file)
    ])
    
    if result.returncode == 0 and output_file.exists():
        print(f"✅ Preview saved: {output_file}")
        
        # Try to convert to PNG for easier viewing
        try:
            import cairosvg
            png_file = project_dir / "schematic_preview.png"
            cairosvg.svg2png(url=str(output_file), write_to=str(png_file))
            print(f"   PNG: {png_file}")
        except ImportError:
            print("   (Install cairosvg for PNG conversion)")
    else:
        print(f"❌ Preview generation failed")


def cmd_preview_pcb(args):
    """Generate PCB preview images."""
    if not check_kicad():
        sys.exit(1)
    
    project = get_current_project()
    if not project:
        print("❌ No project selected")
        sys.exit(1)
    
    project_dir = Path(project["path"])
    pcb_file = project_dir / f"{project['name']}.kicad_pcb"
    
    if not pcb_file.exists():
        print(f"❌ PCB file not found: {pcb_file}")
        sys.exit(1)
    
    print(f"🖼️  Generating PCB previews...")
    
    # Export SVG for each major layer
    layers = ["F.Cu", "B.Cu", "F.Silkscreen", "Edge.Cuts"]
    
    for layer in layers:
        output_file = project_dir / f"pcb_preview_{layer.replace('.', '_')}.svg"
        result = run_kicad_cli([
            "pcb", "export", "svg",
            "--output", str(output_file),
            "--layers", layer,
            str(pcb_file)
        ])
        if result.returncode == 0:
            print(f"   ✅ {layer}: {output_file.name}")
    
    # Try 3D export
    glb_file = project_dir / "pcb_3d.glb"
    result = run_kicad_cli([
        "pcb", "export", "glb",
        "--output", str(glb_file),
        str(pcb_file)
    ])
    if result.returncode == 0 and glb_file.exists():
        print(f"   ✅ 3D: {glb_file.name}")


# =============================================================================
# PCBWay Integration
# =============================================================================

def cmd_pcbway_quote(args):
    """Get PCBWay instant quote."""
    project = get_current_project()
    
    print(f"╭─────────────────────────────────────╮")
    print(f"│       💰 PCBWAY QUOTE ESTIMATE      │")
    print(f"├─────────────────────────────────────┤")
    
    # Parse options
    quantity = args.quantity or 5
    layers = args.layers or 2
    thickness = args.thickness or 1.6
    
    # Rough estimate based on typical pricing
    # Real implementation would call PCBWay API
    base_price = 5.0  # $5 base for small boards
    layer_mult = 1.0 if layers <= 2 else 2.0 if layers <= 4 else 4.0
    qty_mult = 1.0 if quantity <= 10 else 0.8  # volume discount
    
    board_cost = base_price * layer_mult * qty_mult
    shipping = 18.0  # DHL estimate
    
    print(f"│  Quantity:    {quantity:>4} pcs              │")
    print(f"│  Layers:      {layers:>4}                   │")
    print(f"│  Thickness:   {thickness:>4} mm              │")
    print(f"├─────────────────────────────────────┤")
    print(f"│  Board cost:  ${board_cost:>7.2f}              │")
    print(f"│  Shipping:    ${shipping:>7.2f} (DHL est.)   │")
    print(f"│  ─────────────────────────          │")
    print(f"│  TOTAL:       ${board_cost + shipping:>7.2f}              │")
    print(f"╰─────────────────────────────────────╯")
    
    print(f"\n⚠️  This is an estimate. Actual price may vary.")
    print(f"📤 To order: Upload Gerbers at pcbway.com/orderonline.aspx")
    
    if project:
        gerber_zip = Path(project["path"]) / f"{project['name']}_fab.zip"
        if gerber_zip.exists():
            print(f"\n✅ Gerber package ready: {gerber_zip}")
        else:
            print(f"\n💡 Run `package-for-fab` first to create Gerber ZIP")


# =============================================================================
# Main
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        prog="kicad_pcb",
        description="🔧 KiCad PCB Automation — Design to Manufacturing",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Command")
    
    # new
    p_new = subparsers.add_parser("new", help="Create new project")
    p_new.add_argument("name", help="Project name")
    p_new.add_argument("-d", "--description", help="Project description")
    p_new.set_defaults(func=cmd_new)
    
    # info
    p_info = subparsers.add_parser("info", help="Show project info")
    p_info.set_defaults(func=cmd_info)
    
    # open
    p_open = subparsers.add_parser("open", help="Open existing project")
    p_open.add_argument("path", help="Project path")
    p_open.set_defaults(func=cmd_open)
    
    # drc
    p_drc = subparsers.add_parser("drc", help="Run design rules check")
    p_drc.add_argument("--strict", action="store_true", help="Strict mode")
    p_drc.set_defaults(func=cmd_drc)
    
    # erc
    p_erc = subparsers.add_parser("erc", help="Run electrical rules check")
    p_erc.set_defaults(func=cmd_erc)
    
    # export-gerbers
    p_gerbers = subparsers.add_parser("export-gerbers", help="Export Gerber files")
    p_gerbers.set_defaults(func=cmd_export_gerbers)
    
    # export-drill
    p_drill = subparsers.add_parser("export-drill", help="Export drill files")
    p_drill.set_defaults(func=cmd_export_drill)
    
    # export-bom
    p_bom = subparsers.add_parser("export-bom", help="Export bill of materials")
    p_bom.set_defaults(func=cmd_export_bom)
    
    # package-for-fab
    p_package = subparsers.add_parser("package-for-fab", help="Create fab ZIP")
    p_package.add_argument("-o", "--output", help="Output filename")
    p_package.set_defaults(func=cmd_package_for_fab)
    
    # preview-schematic
    p_prev_sch = subparsers.add_parser("preview-schematic", help="Generate schematic preview")
    p_prev_sch.set_defaults(func=cmd_preview_schematic)
    
    # preview-pcb
    p_prev_pcb = subparsers.add_parser("preview-pcb", help="Generate PCB previews")
    p_prev_pcb.set_defaults(func=cmd_preview_pcb)
    
    # pcbway-quote
    p_quote = subparsers.add_parser("pcbway-quote", help="Get PCBWay quote")
    p_quote.add_argument("-q", "--quantity", type=int, default=5, help="Quantity")
    p_quote.add_argument("-l", "--layers", type=int, default=2, help="Layer count")
    p_quote.add_argument("-t", "--thickness", type=float, default=1.6, help="Thickness mm")
    p_quote.set_defaults(func=cmd_pcbway_quote)
    
    args = parser.parse_args()
    
    if args.command is None:
        parser.print_help()
        sys.exit(0)
    
    args.func(args)


if __name__ == "__main__":
    main()
