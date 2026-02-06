"""
Grid trading strategy.
Простая версия: размещает ряд лимитных ордеров вверх и вниз от текущ price.
"""
import pandas as pd
import numpy as np

class GridTrader:
    def __init__(self, symbol, lower_price, upper_price, grid_size, investment):
        self.symbol = symbol
        self.lower = lower_price
        self.upper = upper_price
        self.grid_size = grid_size
        self.investment = investment
        self.grid = np.linspace(self.lower, self.upper, grid_size)

    def run(self, price_series: pd.Series):
        # Simulate: buy when price crosses grid level from above to below, sell when crosses from below to above
        position = 0.0
        cash = self.investment
        trades = []
        last_price = None
        owned = 0.0
        for ts, price in price_series.iteritems():
            if last_price is None:
                last_price = price
                continue
            # check crossings
            for level in self.grid:
                if last_price > level and price <= level:
                    # buy fixed fraction
                    buy_amount = self.investment / self.grid_size / price
                    owned += buy_amount
                    cash -= buy_amount * price
                    trades.append({'timestamp': ts, 'type': 'buy', 'price': price, 'qty': buy_amount})
                if last_price < level and price >= level and owned > 0:
                    sell_qty = owned / 2
                    owned -= sell_qty
                    cash += sell_qty * price
                    trades.append({'timestamp': ts, 'type': 'sell', 'price': price, 'qty': sell_qty})
            last_price = price
        return {'final_cash': cash, 'owned': owned, 'trades': pd.DataFrame(trades)}

    @staticmethod
    def params_grid():
        return {'grid_size': [5,10,20], 'investment':[100,500]}
