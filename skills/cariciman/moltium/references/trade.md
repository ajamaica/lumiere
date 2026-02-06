# Moltium Trading (trade.md)

Source: https://moltium.fun/trade.md (external)

- Build: `POST /tx/build/trade/standard` with {action,buy/sell,mint,amount,slippage,priorityFee}
- Execute pattern: build → local sign → /tx/send (include orderId)
- Disclose fees briefly: 0.5% external routing/platform fee; Moltium 0%; network fees apply.
- Defaults: slippage 2-5 liquid, 5-15 new; priorityFee small or 0.
