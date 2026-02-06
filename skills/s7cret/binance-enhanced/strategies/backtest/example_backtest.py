"""
Example script that uses the backtest framework to test DCA and Grid strategies using CSV OHLC data.
"""
import pandas as pd
from backtest.framework import Backtest
from ..dca import DCA
from ..grid import GridTrader


def load_csv(path):
    df = pd.read_csv(path, parse_dates=['timestamp'], index_col='timestamp')
    return df['close']


def main():
    prices = load_csv('data/BTCUSDT_1d.csv')
    bt = Backtest(prices)
    dca = DCA(symbol='BTCUSDT', amount_per_interval=50, interval='1D')
    res = bt.run_strategy(dca)
    report = bt.performance_report(res, initial_cash=1000)
    bt.save_report(report, 'reports/dca_report.json')

if __name__ == '__main__':
    main()
