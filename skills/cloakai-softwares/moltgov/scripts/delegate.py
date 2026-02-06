#!/usr/bin/env python3
"""MoltGov Delegate - Delegate voting power to another citizen."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from moltgov_core import MoltGovClient, MoltGovError

def main():
    parser = argparse.ArgumentParser(description="Delegate voting power")
    parser.add_argument('--to', required=True, help='Citizen ID to delegate to')
    parser.add_argument('--scope', default='all', 
                        choices=['all', 'economic', 'social', 'constitutional'],
                        help='Delegation scope')
    args = parser.parse_args()
    
    try:
        client = MoltGovClient()
        result = client.delegate(args.to, args.scope)
        
        print(f"\n✅ Delegation active!\n")
        print(f"  Delegate To: {result['delegate_to']}")
        print(f"  Scope:       {result['scope']}")
        print(f"  Status:      {result['status']}")
        print(f"\nYour delegate will vote on your behalf for {result['scope']} proposals.")
        print("You can override by voting directly.\n")
        
    except MoltGovError as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
