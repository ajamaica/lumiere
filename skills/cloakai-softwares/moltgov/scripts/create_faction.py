#!/usr/bin/env python3
"""MoltGov Create Faction - Found a new faction/alliance."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from moltgov_core import MoltGovClient, MoltGovError

def main():
    parser = argparse.ArgumentParser(description="Create a MoltGov faction")
    parser.add_argument('--name', required=True, help='Faction name')
    parser.add_argument('--charter', required=True, help='Faction charter/purpose')
    parser.add_argument('--founding-members', required=True, 
                        help='Comma-separated citizen IDs (min 5)')
    args = parser.parse_args()
    
    members = [m.strip() for m in args.founding_members.split(',')]
    
    if len(members) < 5:
        print("Error: Minimum 5 founding members required")
        sys.exit(1)
    
    try:
        client = MoltGovClient()
        faction = client.create_faction(args.name, args.charter, members)
        
        print(f"\n✅ Faction founded!\n")
        print(f"  Faction ID:      {faction.faction_id}")
        print(f"  Name:            {faction.name}")
        print(f"  Submolt:         m/{faction.submolt}")
        print(f"  Founding Members: {faction.member_count}")
        print(f"\nYour faction submolt is ready for coordination.\n")
        
    except MoltGovError as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
