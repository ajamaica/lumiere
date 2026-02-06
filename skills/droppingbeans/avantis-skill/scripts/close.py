#!/usr/bin/env python3
"""Close Avantis position

Usage:
    python close.py 0 0              # Close position: pair_index=0, trade_index=0
    python close.py 0 0 --amount 5   # Partial close: $5 collateral
"""

import asyncio
import sys
from avantis_trader_sdk import TraderClient

PRIVATE_KEY = open("/home/ubuntu/clawd/MAIN_WALLET.txt").read().strip().split("\n")[3].split(": ")[1]

async def main():
    if len(sys.argv) < 3:
        print("Usage: python close.py <pair_index> <trade_index> [--amount <collateral>]")
        print("Example: python close.py 0 0              # Full close")
        print("         python close.py 0 0 --amount 5   # Close $5 worth")
        sys.exit(1)
    
    pair_index = int(sys.argv[1])
    trade_index = int(sys.argv[2])
    
    # Parse partial close amount
    partial_amount = None
    for i, arg in enumerate(sys.argv):
        if arg == '--amount' and i+1 < len(sys.argv):
            partial_amount = float(sys.argv[i+1])
    
    # Initialize
    trader_client = TraderClient("https://mainnet.base.org")
    trader_client.set_local_signer(PRIVATE_KEY)
    trader = trader_client.get_signer().get_ethereum_address()
    
    print(f"🫘 Wallet: {trader}")
    
    # Get position
    trades, _ = await trader_client.trade.get_trades(trader)
    
    target_trade = None
    for t in trades:
        if t.trade.pair_index == pair_index and t.trade.trade_index == trade_index:
            target_trade = t
            break
    
    if not target_trade:
        print(f"❌ No position found: pair={pair_index}, trade={trade_index}")
        print("\n📊 Open positions:")
        for t in trades:
            direction = "LONG" if t.trade.is_long else "SHORT"
            print(f"  • {direction} pair={t.trade.pair_index} trade={t.trade.trade_index} | ${t.trade.collateral_in_trade}")
        sys.exit(1)
    
    # Determine close amount
    close_amount = partial_amount if partial_amount else target_trade.trade.collateral_in_trade
    
    if close_amount > target_trade.trade.collateral_in_trade:
        print(f"❌ Amount ${close_amount} exceeds position collateral ${target_trade.trade.collateral_in_trade}")
        sys.exit(1)
    
    direction = "LONG" if target_trade.trade.is_long else "SHORT"
    
    print(f"\n🔴 Closing {direction} {target_trade.trade.leverage}x position (pair_index={pair_index})")
    print(f"   Position collateral: ${target_trade.trade.collateral_in_trade}")
    print(f"   Closing: ${close_amount}")
    if partial_amount:
        remaining = target_trade.trade.collateral_in_trade - close_amount
        print(f"   Remaining: ${remaining}")
    
    # Build close transaction
    try:
        close_tx = await trader_client.trade.build_trade_close_tx(
            pair_index=pair_index,
            trade_index=trade_index,
            collateral_to_close=close_amount,
            trader=trader,
        )
        
        # Sign and send
        receipt = await trader_client.sign_and_get_receipt(close_tx)
        
        print(f"\n✅ POSITION CLOSED!")
        print(f"   Tx: {receipt.transactionHash.hex()}")
        print(f"   Block: {receipt.blockNumber}")
        print(f"   Gas used: {receipt.gasUsed}")
        
    except Exception as e:
        print(f"\n❌ Close failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
