#!/usr/bin/env python3
"""
USDC Security Skill - Main command router
"""

import sys
import argparse
from arc_contract import ArcContract
from cctp_client import CCTPClient
from x402_client import X402Client


def check_skill(skill_id: str):
    """Check skill bond status and trust score"""
    contract = ArcContract()
    skill_info = contract.get_skill_info(skill_id)
    
    if skill_info['totalBonded'] == 0:
        print(f"❌ Skill '{skill_id}' not found or not bonded")
        return
    
    total_bonded = skill_info['totalBonded'] / 1e6  # Convert from 6 decimals
    usage_count = skill_info['usageCount']
    auditor_count = contract.contract.functions.getSkillAuditorCount(skill_id).call()
    flagged = skill_info['flagged']
    
    # Calculate trust score
    trust_score = min(100, (total_bonded / 100) * 40 + (usage_count / 1000) * 40 + (auditor_count * 5))
    if flagged:
        trust_score = max(0, trust_score - 50)
    
    print(f"\nSkill: {skill_id}")
    print(f"├─ Bonded: {total_bonded:.2f} USDC by {auditor_count} auditors")
    print(f"├─ Used: {usage_count:,} times")
    print(f"├─ Trust Score: {trust_score:.0f}/100")
    print(f"├─ Status: {'🚩 Flagged for review' if flagged else '✅ Safe to use'}")
    print(f"└─ Created: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(skill_info['createdAt']))}\n")


def use_skill(skill_id: str):
    """Pay via x402 and download skill"""
    print(f"\nUsing skill: {skill_id}")
    
    # Check skill status first
    contract = ArcContract()
    skill_info = contract.get_skill_info(skill_id)
    
    if skill_info['totalBonded'] == 0:
        print(f"❌ Skill '{skill_id}' is not bonded. Cannot use.")
        return
    
    print(f"✓ Skill is bonded: {skill_info['totalBonded'] / 1e6:.2f} USDC")
    print(f"Fee: 0.1 USDC\n")
    
    x402_client = X402Client()
    
    # Check wallet balances
    print("Checking wallet balances...")
    balances = x402_client.get_balances()
    for chain, bal in balances.items():
        print(f"  {chain}: {bal:.2f} USDC")
    
    # Selection logic
    selected_chain = None
    if balances.get('arc-testnet', 0) >= 0.1:
        selected_chain = 'arc-testnet'
    else:
        for chain in ['base-sepolia', 'arbitrum-sepolia', 'ethereum-sepolia']:
            if balances.get(chain, 0) >= 0.1:
                selected_chain = chain
                break
    
    if not selected_chain:
        print("\n❌ Error: Insufficient USDC balance on all supported chains.")
        return

    print(f"\nProceeding with payment from {selected_chain}...")
    response = input("Confirm payment of 0.1 USDC? (yes/no): ")
    if response.lower() != 'yes':
        print("Cancelled.")
        return

    result = x402_client.request_skill(skill_id, chain=selected_chain)
    
    if result['success']:
        print(f"\n✓ Payment verified")
        print(f"✓ Skill downloaded and installed")
        if 'txHash' in result:
            print(f"Transaction: {result['txHash']}")
    else:
        print(f"\n❌ Error: {result.get('error', 'Unknown error')}")


def bond_skill(skill_id: str, amount: float, chain: str):
    """Stake USDC to vouch for a skill"""
    print(f"\nBonding skill: {skill_id}")
    print(f"Amount: {amount} USDC")
    print(f"Chain: {chain}\n")
    
    contract = ArcContract()
    existing_stake = contract.contract.functions.getAuditorStake(skill_id, contract.account.address).call()
    
    if existing_stake > 0:
        print(f"⚠️  You already have {existing_stake/1e6:.2f} USDC staked for this skill.")
        response = input("Do you want to add more to your stake? (yes/no): ")
        if response.lower() != 'yes':
            return

    # Confirm
    response = input(f"⚠️  You are staking {amount} USDC to vouch for {skill_id}\n"
                     f"If this skill is found malicious, you will lose 50% of stake.\n\n"
                     f"Continue? (yes/no): ")
    
    if response.lower() != 'yes':
        print("Cancelled.")
        return
    
    # Execute CCTP transfer
    cctp_client = CCTPClient()
    result = cctp_client.bond_skill(skill_id, amount, chain)
    
    if result['success']:
        print(f"\n✓ Successfully initiated bond for {skill_id}")
        print(f"Transaction: {result.get('txHash', 'N/A')}")
        print("Note: Bond will be processed after CCTP attestation (~30s).")
    else:
        print(f"\n❌ Error: {result.get('error', 'Unknown error')}")


def report_skill(skill_id: str, evidence_hash: str):
    """Submit malicious behavior claim"""
    print(f"\nReporting skill: {skill_id}")
    print(f"Evidence: {evidence_hash}\n")
    
    contract = ArcContract()
    if contract.contract.functions.hasActiveClaim(skill_id).call():
        print(f"❌ Error: Skill '{skill_id}' already has an active claim under investigation.")
        return

    # Confirm
    response = input(f"You are reporting {skill_id} as malicious.\n"
                     f"Required: 1 USDC anti-spam deposit (refunded if claim valid)\n\n"
                     f"Submit claim? (yes/no): ")
    
    if response.lower() != 'yes':
        print("Cancelled.")
        return
    
    # Submit claim
    result = contract.submit_claim(skill_id, evidence_hash)
    
    if result['success']:
        print(f"\n✓ Claim submitted successfully")
        print(f"Transaction: {result.get('txHash', 'N/A')}")
        print("Voting window is now open for 72 hours.")
    else:
        print(f"\n❌ Error: {result.get('error', 'Unknown error')}")


def vote_claim(claim_id: int, support: str):
    """Vote on a pending claim"""
    is_support = support.lower() in ['support', 'yes', 'true', '1']
    
    print(f"\nVoting on claim #{claim_id}")
    print(f"Support: {'Yes (guilty)' if is_support else 'No (innocent)'}\n")
    
    contract = ArcContract()
    # Check eligibility
    rep = contract.contract.functions.auditorReputations(contract.account.address).call()
    if rep[0] == 0: # totalStaked
        print("❌ Error: You must have a stake in any skill to vote.")
        return

    result = contract.vote_on_claim(claim_id, is_support)
    
    if result['success']:
        print(f"✓ Vote submitted")
        print(f"Transaction: {result.get('txHash', 'N/A')}")
    else:
        print(f"\n❌ Error: {result.get('error', 'Unknown error')}")


def claim_earnings(destination_chain: str):
    """Withdraw accumulated fees"""
    print(f"\nClaiming earnings to {destination_chain}\n")
    
    contract = ArcContract()
    earnings = contract.get_pending_earnings()
    
    if earnings == 0:
        print("❌ No pending earnings")
        return
    
    print(f"Accumulated earnings: {earnings / 1e6:.2f} USDC")
    
    cctp_client = CCTPClient()
    domain_id = cctp_client.DOMAIN_IDS.get(destination_chain)
    if domain_id is None:
        print(f"❌ Error: Unsupported destination chain '{destination_chain}'")
        return

    response = input(f"\nProceed with withdrawal to {destination_chain}? (yes/no): ")
    if response.lower() != 'yes':
        print("Cancelled.")
        return
    
    result = contract.claim_earnings(domain_id)
    
    if result['success']:
        print(f"\n✓ Earnings claim initiated")
        print(f"Amount: {earnings / 1e6:.2f} USDC")
        print(f"Transaction: {result.get('txHash', 'N/A')}")
    else:
        print(f"\n❌ Error: {result.get('error', 'Unknown error')}")


def main():
    parser = argparse.ArgumentParser(description='USDC Security Skill')
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # check command
    check_parser = subparsers.add_parser('check', help='Check skill bond status')
    check_parser.add_argument('skill_id', help='Skill identifier')
    
    # use command
    use_parser = subparsers.add_parser('use', help='Pay and use a skill')
    use_parser.add_argument('skill_id', help='Skill identifier')
    
    # bond command
    bond_parser = subparsers.add_parser('bond', help='Bond USDC to vouch for a skill')
    bond_parser.add_argument('skill_id', help='Skill identifier')
    bond_parser.add_argument('amount', type=float, help='Amount in USDC')
    bond_parser.add_argument('chain', help='Source chain (e.g., ethereum-sepolia)')
    
    # report command
    report_parser = subparsers.add_parser('report', help='Report malicious skill')
    report_parser.add_argument('skill_id', help='Skill identifier')
    report_parser.add_argument('--evidence', required=True, help='IPFS hash of evidence')
    
    # vote-claim command
    vote_parser = subparsers.add_parser('vote-claim', help='Vote on a claim')
    vote_parser.add_argument('claim_id', type=int, help='Claim ID')
    vote_parser.add_argument('support', choices=['support', 'oppose'], help='Vote support or oppose')
    
    # claim-earnings command
    earnings_parser = subparsers.add_parser('claim-earnings', help='Claim accumulated fees')
    earnings_parser.add_argument('chain', help='Destination chain')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    try:
        if args.command == 'check':
            check_skill(args.skill_id)
        elif args.command == 'use':
            use_skill(args.skill_id)
        elif args.command == 'bond':
            bond_skill(args.skill_id, args.amount, args.chain)
        elif args.command == 'report':
            report_skill(args.skill_id, args.evidence)
        elif args.command == 'vote-claim':
            vote_claim(args.claim_id, args.support)
        elif args.command == 'claim-earnings':
            claim_earnings(args.chain)
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        sys.exit(1)


if __name__ == '__main__':
    main()
