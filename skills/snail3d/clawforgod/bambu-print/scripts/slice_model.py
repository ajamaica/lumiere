#!/usr/bin/env python3
"""
Slice STL/3MF models using BambuStudio CLI.
Requires: bambu-studio CLI installed and in PATH
"""

import sys
import os
import json
import subprocess
from pathlib import Path
from typing import Optional

def slice_model(
    input_file: str,
    output_file: str,
    printer_profile: Optional[str] = None,
    process_profile: Optional[str] = None,
    filament_profile: Optional[str] = None,
    orient: bool = True,
    arrange: bool = True
) -> bool:
    """
    Slice a model using BambuStudio CLI.
    
    Args:
        input_file: Path to STL or 3MF file
        output_file: Path to output 3MF file
        printer_profile: Path to printer settings JSON
        process_profile: Path to process settings JSON
        filament_profile: Path to filament settings JSON
        orient: Auto-orient the model
        arrange: Auto-arrange on bed
    
    Returns:
        True if successful, False otherwise
    """
    
    # Check input file exists
    if not os.path.exists(input_file):
        print(f"Error: Input file not found: {input_file}", file=sys.stderr)
        return False
    
    # Build bambu-studio command
    cmd = ["bambu-studio"]
    
    if orient:
        cmd.append("--orient")
    
    if arrange:
        cmd.append("--arrange")
        cmd.append("1")
    
    # Load settings
    settings = []
    if printer_profile and os.path.exists(printer_profile):
        settings.append(printer_profile)
    if process_profile and os.path.exists(process_profile):
        settings.append(process_profile)
    
    if settings:
        cmd.append("--load-settings")
        cmd.append(";".join(settings))
    
    if filament_profile and os.path.exists(filament_profile):
        cmd.append("--load-filaments")
        cmd.append(filament_profile)
    
    # Slice and export
    cmd.extend(["--slice", "0"])
    cmd.extend(["--export-3mf", output_file])
    cmd.append(input_file)
    
    print(f"Running: {' '.join(cmd)}", file=sys.stderr)
    
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print(f"Slicing successful! Output: {output_file}", file=sys.stderr)
        if result.stdout:
            print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error: Slicing failed", file=sys.stderr)
        print(f"Command: {' '.join(cmd)}", file=sys.stderr)
        print(f"Error output: {e.stderr}", file=sys.stderr)
        return False
    except FileNotFoundError:
        print(f"Error: bambu-studio not found. Install BambuStudio and ensure 'bambu-studio' is in PATH", file=sys.stderr)
        return False

def main():
    if len(sys.argv) < 3:
        print("Usage: slice_model.py <input.stl> <output.3mf> [--printer <path>] [--process <path>] [--filament <path>]", file=sys.stderr)
        print("Example: slice_model.py model.stl output.3mf --printer printer.json --filament filament.json", file=sys.stderr)
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    printer_profile = None
    process_profile = None
    filament_profile = None
    
    # Parse optional arguments
    i = 3
    while i < len(sys.argv):
        if sys.argv[i] == "--printer" and i + 1 < len(sys.argv):
            printer_profile = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == "--process" and i + 1 < len(sys.argv):
            process_profile = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == "--filament" and i + 1 < len(sys.argv):
            filament_profile = sys.argv[i + 1]
            i += 2
        else:
            i += 1
    
    success = slice_model(
        input_file,
        output_file,
        printer_profile,
        process_profile,
        filament_profile,
        orient=True,
        arrange=True
    )
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
