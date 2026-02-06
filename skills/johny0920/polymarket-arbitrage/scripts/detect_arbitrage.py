#!/usr/bin/env python3
"""
Detect arbitrage opportunities in Polymarket markets.

Usage:
    python detect_arbitrage.py markets.json [--min-edge 3.0] [--output arbs.json]

Types of arbitrage detected:
    1. Math Arb: Multi-outcome markets where probabilities don't sum to 100%
    2. Cross-Market Arb: Same event in different markets with contradictory odds
    3. Orderbook Arb: Bid/ask spreads with profitable crossover (requires orderbook data)
"""

import json
import sys
import argparse
from datetime import datetime


# Polymarket fee structure
MAKER_FEE = 0.00  # 0% maker fee
TAKER_FEE = 0.02  # 2% taker fee
TOTAL_FEES = 0.02  # Conservative estimate (assume taker fees)


def load_markets(filepath):
    """Load markets from JSON file."""
    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
            return data.get('markets', [])
    except Exception as e:
        print(f"Error loading markets: {e}", file=sys.stderr)
        sys.exit(1)


def detect_math_arb(markets, min_edge=3.0):
    """
    Detect math arbitrage in multi-outcome markets.
    
    If probabilities sum to <100%, we can buy all outcomes profitably.
    If probabilities sum to >100%, we can sell all outcomes profitably (requires liquidity).
    
    Args:
        markets: List of market dicts
        min_edge: Minimum edge percentage after fees
    
    Returns:
        List of arbitrage opportunities
    """
    arbs = []
    
    for market in markets:
        # Only consider multi-outcome markets (2+ outcomes)
        if market['outcome_count'] < 2:
            continue
        
        prob_sum = market['prob_sum']
        
        # Type 1: Probabilities sum to less than 100% (buy all outcomes)
        if prob_sum < 100:
            implied_profit_pct = 100 - prob_sum
            
            # Account for fees (need to pay fees on all legs)
            net_profit_pct = implied_profit_pct - (TOTAL_FEES * 100 * market['outcome_count'])
            
            if net_profit_pct >= min_edge:
                arbs.append({
                    'type': 'math_arb_buy',
                    'market_id': market['market_id'],
                    'title': market['title'],
                    'url': market['url'],
                    'prob_sum': prob_sum,
                    'implied_profit_pct': implied_profit_pct,
                    'net_profit_pct': net_profit_pct,
                    'volume': market['volume'],
                    'probabilities': market['probabilities'],
                    'action': 'BUY all outcomes',
                    'risk_score': calculate_risk_score(market, net_profit_pct)
                })
        
        # Type 2: Probabilities sum to more than 100% (sell all outcomes)
        elif prob_sum > 100:
            implied_profit_pct = prob_sum - 100
            net_profit_pct = implied_profit_pct - (TOTAL_FEES * 100 * market['outcome_count'])
            
            if net_profit_pct >= min_edge:
                arbs.append({
                    'type': 'math_arb_sell',
                    'market_id': market['market_id'],
                    'title': market['title'],
                    'url': market['url'],
                    'prob_sum': prob_sum,
                    'implied_profit_pct': implied_profit_pct,
                    'net_profit_pct': net_profit_pct,
                    'volume': market['volume'],
                    'probabilities': market['probabilities'],
                    'action': 'SELL all outcomes (requires liquidity)',
                    'risk_score': calculate_risk_score(market, net_profit_pct, is_sell=True)
                })
    
    return arbs


def calculate_risk_score(market, net_profit_pct, is_sell=False):
    """
    Calculate risk score for an arbitrage opportunity.
    
    Lower score = lower risk
    
    Factors:
        - Volume (higher = lower risk)
        - Edge size (higher = lower risk usually, but could indicate stale data)
        - Sell vs Buy (sell is riskier due to liquidity requirements)
    """
    score = 50  # Base score
    
    # Volume factor (higher volume = lower risk)
    if market['volume'] > 10_000_000:
        score -= 20
    elif market['volume'] > 1_000_000:
        score -= 10
    elif market['volume'] < 100_000:
        score += 20
    
    # Edge factor (very high edge might be stale/wrong data)
    if net_profit_pct > 10:
        score += 15  # Suspiciously high edge
    elif net_profit_pct > 5:
        score += 5
    elif net_profit_pct < 3.5:
        score -= 5  # Tight edge, might close quickly
    
    # Sell arbs are riskier (liquidity requirements)
    if is_sell:
        score += 25
    
    return max(0, min(100, score))


def detect_cross_market_arb(markets, min_edge=3.0):
    """
    Detect cross-market arbitrage (same event, different markets).
    
    This requires identifying markets about the same event.
    For MVP, we'll use simple keyword matching.
    """
    # TODO: Implement cross-market detection
    # This requires more sophisticated market matching
    return []


def main():
    parser = argparse.ArgumentParser(description='Detect Polymarket arbitrage')
    parser.add_argument('markets_file', help='Input markets JSON file')
    parser.add_argument('--min-edge', type=float, default=3.0, 
                        help='Minimum edge percentage after fees (default: 3.0)')
    parser.add_argument('--output', default='arbs.json', help='Output JSON file')
    parser.add_argument('--pretty', action='store_true', help='Pretty print JSON')
    
    args = parser.parse_args()
    
    print(f"Loading markets from {args.markets_file}...", file=sys.stderr)
    markets = load_markets(args.markets_file)
    
    print(f"Analyzing {len(markets)} markets for arbitrage...", file=sys.stderr)
    print(f"Minimum edge: {args.min_edge}% (after {TOTAL_FEES*100}% fees)", file=sys.stderr)
    
    # Detect different types of arbitrage
    math_arbs = detect_math_arb(markets, args.min_edge)
    cross_arbs = detect_cross_market_arb(markets, args.min_edge)
    
    all_arbs = math_arbs + cross_arbs
    
    # Sort by net profit percentage (highest first)
    all_arbs.sort(key=lambda x: x['net_profit_pct'], reverse=True)
    
    print(f"\nFound {len(all_arbs)} arbitrage opportunities:", file=sys.stderr)
    print(f"  - Math arb (buy): {len([a for a in math_arbs if a['type'] == 'math_arb_buy'])}", file=sys.stderr)
    print(f"  - Math arb (sell): {len([a for a in math_arbs if a['type'] == 'math_arb_sell'])}", file=sys.stderr)
    
    # Write output
    output_data = {
        'detected_at': datetime.utcnow().isoformat(),
        'min_edge': args.min_edge,
        'fee_assumption': TOTAL_FEES * 100,
        'arbitrage_count': len(all_arbs),
        'arbitrages': all_arbs
    }
    
    with open(args.output, 'w') as f:
        if args.pretty:
            json.dump(output_data, f, indent=2)
        else:
            json.dump(output_data, f)
    
    print(f"\nSaved to {args.output}", file=sys.stderr)
    
    # Print summary
    if all_arbs:
        print("\n=== TOP ARBITRAGE OPPORTUNITIES ===", file=sys.stderr)
        for i, arb in enumerate(all_arbs[:5], 1):
            print(f"\n{i}. {arb['title'][:60]}...", file=sys.stderr)
            print(f"   Type: {arb['type']}", file=sys.stderr)
            print(f"   Net Profit: {arb['net_profit_pct']:.2f}%", file=sys.stderr)
            print(f"   Volume: ${arb['volume']:,}", file=sys.stderr)
            print(f"   Risk Score: {arb['risk_score']}/100", file=sys.stderr)
            print(f"   Action: {arb['action']}", file=sys.stderr)
    
    print(json.dumps({
        'success': True,
        'arbitrage_count': len(all_arbs),
        'output_file': args.output
    }))


if __name__ == '__main__':
    main()
