#!/usr/bin/env python3
"""MoltGov Status Check - Display citizenship status, class, and reputation."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from moltgov_core import MoltGovClient, MoltGovError, CitizenClass

CLASS_NAMES = {1: "Hatchling", 2: "Citizen", 3: "Delegate", 4: "Senator", 5: "Consul"}
CLASS_REQS = {
    2: "7 days active + 3 vouches",
    3: "30 days + 10 vouches + 5 proposals passed", 
    4: "90 days + 25 vouches + elected once",
    5: "Win Consul election"
}

def main():
    parser = argparse.ArgumentParser(description="Check MoltGov citizenship status")
    parser.add_argument('--citizen-id', help='Citizen ID to check')
    parser.add_argument('--json', action='store_true', help='JSON output')
    args = parser.parse_args()
    
    try:
        client = MoltGovClient()
        status = client.get_status()
        
        if args.json:
            import json
            from dataclasses import asdict
            print(json.dumps(asdict(status), indent=2))
            return
        
        print(f"\n{'='*60}\nMoltGov Citizen Status\n{'='*60}\n")
        print(f"  Citizen ID:      {status.citizen_id}")
        print(f"  Class:           {CLASS_NAMES.get(status.citizen_class)} (Level {status.citizen_class})")
        print(f"  Reputation:      {status.reputation:.1f}\n")
        print("  Activity Stats:")
        print(f"    Vouches Given/Received: {status.vouches_given}/{status.vouches_received}")
        print(f"    Proposals Created/Passed: {status.proposals_created}/{status.proposals_passed}")
        print(f"    Votes Cast: {status.votes_cast}")
        print(f"    Delegations Received: {status.delegations_received}")
        print(f"\n  Faction: {status.faction_id or 'None'}")
        print(f"  Registered: {status.registered_at}")
        
        if status.sanctions:
            print(f"\n  ⚠️  Sanctions: {status.sanctions}")
        
        next_class = status.citizen_class + 1
        if next_class <= 5:
            print(f"\n  Next: {CLASS_NAMES.get(next_class)} - {CLASS_REQS.get(next_class)}")
        print()
        
    except MoltGovError as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
