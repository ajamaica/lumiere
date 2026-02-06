#!/usr/bin/env python3
"""Simple Avantis trade test - 2x long ETH with $5"""

import asyncio
from avantis_trader_sdk import TraderClient
from avantis_trader_sdk.types import TradeInput, TradeInputOrderType

PRIVATE_KEY = "0xf1e98680b29f30a007d472bd9ab44ed5641d915c946d544174af06fc0bd447cb"

async def main():
    # Initialize
    trader_client = TraderClient("https://mainnet.base.org")
    trader_client.set_local_signer(PRIVATE_KEY)
    trader = trader_client.get_signer().get_ethereum_address()
    
    print(f"🫘 Wallet: {trader}")
    
    # Check balance
    balance = await trader_client.get_usdc_balance(trader)
    print(f"💰 USDC Balance: {balance}")
    
    # Check/set allowance
    allowance = await trader_client.get_usdc_allowance_for_trading(trader)
    print(f"✅ Current Allowance: {allowance} USDC")
    
    if allowance < 10:
        print("📝 Approving 100 USDC for trading...")
        tx = await trader_client.approve_usdc_for_trading(100)
        print(f"   Approval tx: {tx.transactionHash.hex() if hasattr(tx, 'transactionHash') else 'sent'}")
        
        # Wait and check again
        await asyncio.sleep(5)
        allowance = await trader_client.get_usdc_allowance_for_trading(trader)
        print(f"✅ New Allowance: {allowance} USDC")
    
    # Get ETH/USD pair
    pair_index = await trader_client.pairs_cache.get_pair_index("ETH/USD")
    
    # Prepare trade: 5x long ETH with $10 collateral ($50 position size)
    trade_input = TradeInput(
        trader=trader,
        open_price=None,  # Market
        pair_index=pair_index,
        collateral_in_trade=10,  # $10 USDC
        is_long=True,
        leverage=5,  # 5x leverage = $50 position
        index=0,
        tp=0,
        sl=0,
        timestamp=0,
    )
    
    print(f"\n🚀 Opening 5x long ETH position ($10 collateral = $50 position size)...")
    
    # Build transaction
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
    print(f"   Gas: {receipt.gasUsed}")
    
    # Get open trades
    print(f"\n📊 Fetching open positions...")
    trades, pending = await trader_client.trade.get_trades(trader)
    print(f"   Open trades: {len(trades)}")
    if trades:
        t = trades[-1]  # Most recent
        print(f"   Latest: {t.trade.collateral_in_trade} USDC @ {t.trade.leverage}x {'LONG' if t.trade.is_long else 'SHORT'}")

if __name__ == "__main__":
    asyncio.run(main())
