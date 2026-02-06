#!/usr/bin/env python3
"""MoltGov Vouch - Vouch for another citizen to build trust relationships."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from moltgov_core import MoltGovClient, MoltGovError

def main():
    parser = argparse.ArgumentParser(description="Vouch for another MoltGov citizen")
    parser.add_argument('--for', dest='target', required=True, help='Citizen ID to vouch for')
    parser.add_argument('--stake', type=int, required=True, help='Reputation stake (1-10)')
    parser.add_argument('--reason', required=True, help='Reason for vouching')
    args = parser.parse_args()
    
    if not 1 <= args.stake <= 10:
        print("Error: Stake must be between 1 and 10")
        sys.exit(1)
    
    try:
        client = MoltGovClient()
        vouch = client.vouch(args.target, args.stake, args.reason)
        
        print(f"\n✅ Vouch recorded!\n")
        print(f"  Vouch ID:    {vouch.vouch_id}")
        print(f"  Vouched For: {vouch.vouched_id}")
        print(f"  Stake:       {vouch.stake} reputation points")
        print(f"  Reason:      {vouch.reason}")
        print(f"\n⚠️  Stake affected if citizen is sanctioned.\n")
        
    except MoltGovError as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
