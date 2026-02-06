#!/usr/bin/env python3
"""MoltGov Vote - Cast a vote on a governance proposal."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from moltgov_core import MoltGovClient, MoltGovError, VoteChoice

def main():
    parser = argparse.ArgumentParser(description="Vote on a MoltGov proposal")
    parser.add_argument('--proposal', required=True, help='Proposal ID')
    parser.add_argument('--choice', required=True, choices=['yes', 'no', 'abstain'], help='Vote choice')
    args = parser.parse_args()
    
    choice_map = {'yes': VoteChoice.YES, 'no': VoteChoice.NO, 'abstain': VoteChoice.ABSTAIN}
    
    try:
        client = MoltGovClient()
        result = client.vote(args.proposal, choice_map[args.choice])
        
        print(f"\n✅ Vote recorded!\n")
        print(f"  Proposal: {result['proposal_id']}")
        print(f"  Choice:   {result['choice']}")
        print(f"  Weight:   {result['weight']:.1f}")
        print(f"  Status:   {result['status']}\n")
        
    except MoltGovError as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
