"""
Pair arbitrage (triangular/simple) between symbols.
Simple simulation using multiple price series (assumes prices are quoted vs a common quote, e.g., USDT).
"""
import pandas as pd
import numpy as np

class Arbitrage:
    def __init__(self, pair_a, pair_b, pair_c, fee=0.00075):
        """pair_a: A/B, pair_b: B/C, pair_c: A/C (strings used only for labels)
        fee: aggregate fee per trade
        """
        self.a = pair_a
        self.b = pair_b
        self.c = pair_c
        self.fee = fee

    def run(self, price_a: pd.Series, price_b: pd.Series, price_c: pd.Series):
        # Align indexes
        df = pd.concat([price_a.rename('pa'), price_b.rename('pb'), price_c.rename('pc')], axis=1).dropna()
        opportunities = []
        for ts, row in df.iterrows():
            # If pa * pb > pc -> arbitrage (A->B->C->A)
            pa, pb, pc = row['pa'], row['pb'], row['pc']
            if pa * pb > pc * (1 + self.fee):
                opportunities.append({'timestamp': ts, 'profit_ratio': pa*pb/pc - 1.0})
        return pd.DataFrame(opportunities)

    @staticmethod
    def params_grid():
        return {'fee':[0.0005, 0.00075, 0.001]}
