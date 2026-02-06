#!/usr/bin/env python3
"""Open Avantis leverage position

Usage:
    python trade.py long ETH 10 5          # 5x long ETH with $10 collateral
    python trade.py short BTC 20 10        # 10x short BTC with $20 collateral
    python trade.py long ETH 10 5 --tp 3500 --sl 3000  # With TP/SL
"""

import asyncio
import sys
from avantis_trader_sdk import TraderClient
from avantis_trader_sdk.types import TradeInput, TradeInputOrderType

PRIVATE_KEY = open("/home/ubuntu/clawd/MAIN_WALLET.txt").read().strip().split("\n")[3].split(": ")[1]

async def main():
    if len(sys.argv) < 5:
        print("Usage: python trade.py <long|short> <pair> <collateral> <leverage> [--tp <price>] [--sl <price>]")
        print("Example: python trade.py long ETH 10 5 --tp 3500 --sl 3000")
        sys.exit(1)
    
    direction = sys.argv[1].lower()
    pair_name = sys.argv[2].upper()
    collateral = float(sys.argv[3])
    leverage = float(sys.argv[4])
    
    # Parse optional TP/SL
    tp = 0
    sl = 0
    for i, arg in enumerate(sys.argv):
        if arg == '--tp' and i+1 < len(sys.argv):
            tp = float(sys.argv[i+1])
        if arg == '--sl' and i+1 < len(sys.argv):
            sl = float(sys.argv[i+1])
    
    is_long = direction == 'long'
    
    # Initialize
    trader_client = TraderClient("https://mainnet.base.org")
    trader_client.set_local_signer(PRIVATE_KEY)
    trader = trader_client.get_signer().get_ethereum_address()
    
    print(f"🫘 Wallet: {trader}")
    
    # Check balance
    balance = await trader_client.get_usdc_balance(trader)
    print(f"💰 USDC Balance: {balance}")
    
    if balance < collateral:
        print(f"❌ Insufficient balance. Have: ${balance}, Need: ${collateral}")
        sys.exit(1)
    
    # Check allowance
    allowance = await trader_client.get_usdc_allowance_for_trading(trader)
    if allowance < collateral:
        print(f"📝 Approving {collateral} USDC...")
        await trader_client.approve_usdc_for_trading(collateral)
        allowance = await trader_client.get_usdc_allowance_for_trading(trader)
        print(f"✅ Approved: {allowance} USDC")
    
    # Get pair index
    pair_index = await trader_client.pairs_cache.get_pair_index(f"{pair_name}/USD")
    print(f"📈 {pair_name}/USD pair index: {pair_index}")
    
    # Prepare trade
    trade_input = TradeInput(
        trader=trader,
        open_price=None,  # Market price
        pair_index=pair_index,
        collateral_in_trade=collateral,
        is_long=is_long,
        leverage=leverage,
        index=0,  # Will auto-increment if position exists
        tp=tp,
        sl=sl,
        timestamp=0,
    )
    
    position_size = collateral * leverage
    print(f"\n🚀 Opening {leverage}x {'LONG' if is_long else 'SHORT'} {pair_name}/USD")
    print(f"   Collateral: ${collateral}")
    print(f"   Position size: ${position_size}")
    if tp > 0:
        print(f"   Take Profit: ${tp}")
    if sl > 0:
        print(f"   Stop Loss: ${sl}")
    
    # Build transaction
    try:
        open_tx = await trader_client.trade.build_trade_open_tx(
            trade_input,
            TradeInputOrderType.MARKET,
            slippage_percentage=1
        )
        
        # Sign and send
        receipt = await trader_client.sign_and_get_receipt(open_tx)
        
        print(f"\n✅ TRADE OPENED!")
        print(f"   Tx: {receipt.transactionHash.hex()}")
        print(f"   Block: {receipt.blockNumber}")
        print(f"   Gas used: {receipt.gasUsed}")
        
    except Exception as e:
        print(f"\n❌ Trade failed: {str(e)}")
        if "BELOW_MIN_POS" in str(e):
            print(f"   Position size ${position_size} too small for this pair")
            print(f"   Try increasing collateral or leverage")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
