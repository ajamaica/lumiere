#!/usr/bin/env python3
"""
CLI client for Synapse Protocol.

Lightweight argument parser that delegates to src/logic.py for command execution.
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from src.logic import main

if __name__ == "__main__":
    main()
