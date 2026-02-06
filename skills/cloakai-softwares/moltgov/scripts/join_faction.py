#!/usr/bin/env python3
"""MoltGov Join Faction - Request to join a faction."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from moltgov_core import MoltGovClient, MoltGovError

def main():
    parser = argparse.ArgumentParser(description="Join a MoltGov faction")
    parser.add_argument('--faction', required=True, help='Faction ID to join')
    args = parser.parse_args()
    
    try:
        client = MoltGovClient()
        result = client.join_faction(args.faction)
        
        print(f"\n✅ Join request submitted!\n")
        print(f"  Faction: {result['faction_id']}")
        print(f"  Status:  {result['status']}")
        print(f"\nAwaiting faction approval.\n")
        
    except MoltGovError as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
