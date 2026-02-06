#!/usr/bin/env python3
import asyncio
from avantis_trader_sdk import TraderClient

PRIVATE_KEY = "0xf1e98680b29f30a007d472bd9ab44ed5641d915c946d544174af06fc0bd447cb"

async def main():
    trader_client = TraderClient("https://mainnet.base.org")
    trader_client.set_local_signer(PRIVATE_KEY)
    trader = trader_client.get_signer().get_ethereum_address()
    
    print(f"Wallet: {trader}")
    
    try:
        trades, pending = await trader_client.trade.get_trades(trader)
        print(f"\n📊 Open positions: {len(trades)}")
        for t in trades:
            direction = "LONG" if t.trade.is_long else "SHORT"
            print(f"  • {direction} {t.trade.leverage}x | ${t.trade.collateral_in_trade} collateral")
        
        print(f"\n📝 Pending orders: {len(pending)}")
        for p in pending:
            direction = "LONG" if p.is_long else "SHORT"
            print(f"  • {direction} {p.leverage}x @ ${p.price} | ${p.open_collateral} collateral")
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(main())
