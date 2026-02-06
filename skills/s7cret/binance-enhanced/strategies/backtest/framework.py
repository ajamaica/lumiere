"""
Simple backtesting framework. Load OHLCV historical data (pandas.DataFrame), run strategy classes which implement run(...)
and generate basic metrics and a report.
"""
import pandas as pd
import numpy as np
import json
import os

class Backtest:
    def __init__(self, price_df: pd.DataFrame):
        self.price = price_df

    def run_strategy(self, strategy, *args, **kwargs):
        result = strategy.run(self.price, *args, **kwargs) if hasattr(strategy, 'run') else strategy(self.price)
        return result

    @staticmethod
    def performance_report(result, initial_cash=1000.0):
        # result may contain final_cash/final_base/owned etc. Generate simple metrics
        report = {}
        if isinstance(result, dict):
            report.update(result)
        # basic: ROI if final portfolio value known
        if 'final_cash' in report and 'owned' in report and 'last_price' in report:
            total = report['final_cash'] + report['owned'] * report['last_price']
            report['roi'] = (total - initial_cash) / initial_cash
        return report

    def optimize(self, strategy_cls, param_grid: dict):
        # param_grid: dict of param->list
        import itertools
        keys = list(param_grid.keys())
        best = None
        for vals in itertools.product(*[param_grid[k] for k in keys]):
            params = dict(zip(keys, vals))
            strat = strategy_cls(**params)
            res = self.run_strategy(strat)
            rep = self.performance_report(res)
            rep['_params'] = params
            if best is None or rep.get('roi', -999) > best.get('roi', -999):
                best = rep
        return best

    def save_report(self, report, path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w') as f:
            json.dump(report, f, default=str, indent=2)
        return path
