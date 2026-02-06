#!/usr/bin/env python3
"""View open Avantis positions"""

import asyncio
import sys
from avantis_trader_sdk import TraderClient
from avantis_trader_sdk.types import TradeInput, TradeInputOrderType

PRIVATE_KEY = open("/home/ubuntu/clawd/MAIN_WALLET.txt").read().strip().split("\n")[3].split(": ")[1]

async def main():
    trader_client = TraderClient("https://mainnet.base.org")
    trader_client.set_local_signer(PRIVATE_KEY)
    trader = trader_client.get_signer().get_ethereum_address()
    
    print(f"🫘 Wallet: {trader}")
    
    # Get balance
    balance = await trader_client.get_usdc_balance(trader)
    print(f"💰 USDC Balance: {balance}")
    
    # Get positions
    trades, pending = await trader_client.trade.get_trades(trader)
    
    print(f"\n📊 Open positions: {len(trades)}")
    if trades:
        for t in trades:
            direction = "LONG" if t.trade.is_long else "SHORT"
            
            print(f"  • {direction} {t.trade.leverage}x | ${t.trade.collateral_in_trade} collateral | pair_index={t.trade.pair_index}")
            print(f"    Indices: pair={t.trade.pair_index}, trade={t.trade.trade_index}")
    
    print(f"\n📝 Pending orders: {len(pending)}")
    if pending:
        for p in pending:
            direction = "LONG" if p.is_long else "SHORT"
            print(f"  • {direction} {p.leverage}x @ ${p.price} | ${p.open_collateral} collateral")

if __name__ == "__main__":
    asyncio.run(main())
