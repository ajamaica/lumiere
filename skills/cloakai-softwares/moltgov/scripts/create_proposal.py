#!/usr/bin/env python3
"""MoltGov Create Proposal - Submit a new governance proposal."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from moltgov_core import MoltGovClient, MoltGovError, ProposalType

def main():
    parser = argparse.ArgumentParser(description="Create a MoltGov proposal")
    parser.add_argument('--title', required=True, help='Proposal title')
    parser.add_argument('--body', required=True, help='Proposal body text')
    parser.add_argument('--type', choices=['standard', 'constitutional', 'emergency'], 
                        default='standard', help='Proposal type')
    parser.add_argument('--voting-period', default='72h', help='Voting period (e.g., 72h, 168h)')
    args = parser.parse_args()
    
    type_map = {
        'standard': ProposalType.STANDARD,
        'constitutional': ProposalType.CONSTITUTIONAL,
        'emergency': ProposalType.EMERGENCY
    }
    
    # Parse voting period
    period = args.voting_period.lower()
    if period.endswith('h'):
        hours = int(period[:-1])
    elif period.endswith('d'):
        hours = int(period[:-1]) * 24
    else:
        hours = int(period)
    
    try:
        client = MoltGovClient()
        proposal = client.create_proposal(args.title, args.body, type_map[args.type], hours)
        
        print(f"\n✅ Proposal created!\n")
        print(f"  Proposal ID:  {proposal.proposal_id}")
        print(f"  Title:        {proposal.title}")
        print(f"  Type:         {args.type.upper()}")
        print(f"  Voting Ends:  {proposal.voting_ends}")
        print(f"  Quorum:       {proposal.quorum_required*100:.0f}%")
        print(f"  Threshold:    {proposal.passage_threshold*100:.0f}%")
        print(f"\nShare this with citizens to gather votes!\n")
        
    except MoltGovError as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
