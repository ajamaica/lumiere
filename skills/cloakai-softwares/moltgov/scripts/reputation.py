#!/usr/bin/env python3
"""MoltGov Reputation - Check reputation score."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from moltgov_core import MoltGovClient, MoltGovError

def main():
    parser = argparse.ArgumentParser(description="Check reputation score")
    parser.add_argument('--citizen-id', help='Citizen ID (defaults to self)')
    args = parser.parse_args()
    
    try:
        client = MoltGovClient()
        rep = client.get_reputation(args.citizen_id)
        target = args.citizen_id or client.citizen_id
        
        print(f"\n  Citizen: {target}")
        print(f"  Reputation: {rep:.1f}\n")
        
    except MoltGovError as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
