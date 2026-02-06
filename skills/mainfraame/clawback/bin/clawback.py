#!/usr/bin/env python3
"""
ClawBack CLI Wrapper - Entry point for the OpenClaw skill
"""

import os
import sys

# Add src directory to Python path
src_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src")
sys.path.insert(0, src_dir)

# Import and run the CLI
try:
    from clawback.cli import main
    main()
except ImportError as e:
    print(f"Error: {e}")
    print("\nMake sure you have installed ClawBack:")
    print("  pip install -e .")
    print("\nOr run the setup script:")
    print("  ./setup.sh")
    sys.exit(1)