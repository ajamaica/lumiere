"""
Dollar-Cost Averaging (DCA) strategy implementation.
Простая реализация: регулярные покупки фиксированной суммы в указанную пару.
Поддерживает backtest API совместимый с backtest/framework.py
"""
import pandas as pd
import numpy as np

class DCA:
    def __init__(self, symbol, amount_per_interval, interval='1D'):
        self.symbol = symbol
        self.amount = amount_per_interval
        self.interval = interval
        self.orders = []

    def run(self, price_series: pd.Series):
        """Run DCA on price_series (indexed by timestamp)"""
        balance_base = 0.0  # base asset amount (e.g., BTC)
        cash_spent = 0.0
        trades = []
        for ts, price in price_series.resample(self.interval).last().iteritems():
            qty = self.amount / price
            balance_base += qty
            cash_spent += self.amount
            trades.append({'timestamp': ts, 'price': price, 'qty': qty, 'cash': self.amount})
        return {
            'final_base': balance_base,
            'cash_spent': cash_spent,
            'trades': pd.DataFrame(trades)
        }

    @staticmethod
    def params_grid():
        return {'amount_per_interval': [10, 50, 100], 'interval': ['1D','1W']}
