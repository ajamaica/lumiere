#!/usr/bin/env python3
"""
IV 分析工具 - 计算 IV Rank、IV Percentile、HV vs IV
用法: python iv_analysis.py SYMBOL [--period 1y] [--format json|md]
"""

import argparse
import json
import math
import sys
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
import yfinance as yf


def calculate_hv(prices: pd.Series, window: int = 20) -> float:
    """计算历史波动率 (年化)"""
    log_returns = np.log(prices / prices.shift(1))
    hv = log_returns.rolling(window=window).std() * np.sqrt(252)
    return hv.iloc[-1] * 100 if not pd.isna(hv.iloc[-1]) else None


def get_atm_iv(ticker: yf.Ticker, spot: float) -> tuple:
    """获取 ATM 期权的 IV"""
    expirations = ticker.options
    if not expirations:
        return None, None, None
    
    # 使用最近的到期日
    expiry = expirations[0]
    opt = ticker.option_chain(expiry)
    
    # 找 ATM 期权
    calls = opt.calls
    puts = opt.puts
    
    # 找最接近 ATM 的 strike
    calls['strike_diff'] = abs(calls['strike'] - spot)
    puts['strike_diff'] = abs(puts['strike'] - spot)
    
    atm_call = calls.loc[calls['strike_diff'].idxmin()]
    atm_put = puts.loc[puts['strike_diff'].idxmin()]
    
    # ATM IV 取 call 和 put 的平均
    call_iv = atm_call['impliedVolatility'] * 100
    put_iv = atm_put['impliedVolatility'] * 100
    atm_iv = (call_iv + put_iv) / 2
    
    return atm_iv, expiry, atm_call['strike']


def get_iv_history(ticker: yf.Ticker, spot: float, days: int = 252) -> list:
    """获取历史 IV 数据 (通过计算每日 ATM IV 的近似)
    
    注意: Yahoo Finance 不提供历史 IV，这里用 HV 作为代理估算
    实际交易中应使用专业数据源
    """
    hist = ticker.history(period='1y')
    if hist.empty:
        return []
    
    # 使用 HV 作为 IV 的代理
    log_returns = np.log(hist['Close'] / hist['Close'].shift(1))
    hv_series = log_returns.rolling(window=20).std() * np.sqrt(252) * 100
    
    return hv_series.dropna().tolist()


def calculate_iv_rank(current_iv: float, iv_history: list) -> float:
    """计算 IV Rank: 当前 IV 在过去一年的位置"""
    if not iv_history or len(iv_history) < 20:
        return None
    
    min_iv = min(iv_history)
    max_iv = max(iv_history)
    
    if max_iv == min_iv:
        return 50.0
    
    iv_rank = (current_iv - min_iv) / (max_iv - min_iv) * 100
    return iv_rank


def calculate_iv_percentile(current_iv: float, iv_history: list) -> float:
    """计算 IV Percentile: 当前 IV 超过多少比例的历史数据"""
    if not iv_history or len(iv_history) < 20:
        return None
    
    count_below = sum(1 for iv in iv_history if iv <= current_iv)
    percentile = count_below / len(iv_history) * 100
    return percentile


def analyze_iv(symbol: str) -> dict:
    """完整 IV 分析"""
    ticker = yf.Ticker(symbol)
    
    # 获取当前价格
    info = ticker.info
    spot = info.get('currentPrice') or info.get('regularMarketPrice') or info.get('previousClose')
    if not spot:
        hist = ticker.history(period='1d')
        spot = hist['Close'].iloc[-1] if not hist.empty else None
    
    if not spot:
        raise ValueError(f"无法获取 {symbol} 的价格")
    
    # 获取历史数据
    hist = ticker.history(period='1y')
    if hist.empty:
        raise ValueError(f"无法获取 {symbol} 的历史数据")
    
    # 计算历史波动率
    hv_20 = calculate_hv(hist['Close'], 20)
    hv_60 = calculate_hv(hist['Close'], 60)
    
    # 获取 ATM IV
    atm_iv, expiry, atm_strike = get_atm_iv(ticker, spot)
    
    if atm_iv is None:
        raise ValueError(f"{symbol} 没有期权数据")
    
    # 获取 IV 历史 (使用 HV 代理)
    iv_history = get_iv_history(ticker, spot)
    
    # 计算 IV Rank 和 Percentile
    iv_rank = calculate_iv_rank(atm_iv, iv_history)
    iv_percentile = calculate_iv_percentile(atm_iv, iv_history)
    
    # IV-HV Premium
    iv_hv_premium = atm_iv - hv_20 if hv_20 else None
    
    # 52周高低
    iv_52w_high = max(iv_history) if iv_history else None
    iv_52w_low = min(iv_history) if iv_history else None
    
    # IV 环境判断
    if iv_rank is not None:
        if iv_rank >= 70:
            iv_environment = "HIGH_IV"
            iv_advice = "高 IV 环境，适合卖权策略 (Iron Condor, Credit Spread)"
        elif iv_rank <= 30:
            iv_environment = "LOW_IV"
            iv_advice = "低 IV 环境，适合买权策略 (Long Call/Put, Debit Spread)"
        else:
            iv_environment = "NORMAL_IV"
            iv_advice = "中性 IV 环境，根据方向判断选择策略"
    else:
        iv_environment = "UNKNOWN"
        iv_advice = "数据不足，无法判断"
    
    return {
        'symbol': symbol,
        'spot': round(spot, 2),
        'atm_strike': atm_strike,
        'expiry': expiry,
        'atm_iv': round(atm_iv, 2),
        'iv_rank': round(iv_rank, 2) if iv_rank else None,
        'iv_percentile': round(iv_percentile, 2) if iv_percentile else None,
        'hv_20': round(hv_20, 2) if hv_20 else None,
        'hv_60': round(hv_60, 2) if hv_60 else None,
        'iv_hv_premium': round(iv_hv_premium, 2) if iv_hv_premium else None,
        'iv_52w_high': round(iv_52w_high, 2) if iv_52w_high else None,
        'iv_52w_low': round(iv_52w_low, 2) if iv_52w_low else None,
        'iv_environment': iv_environment,
        'iv_advice': iv_advice
    }


def format_markdown(data: dict) -> str:
    """格式化为 Markdown"""
    lines = []
    lines.append(f"# {data['symbol']} IV 分析")
    lines.append(f"\n**当前价格**: ${data['spot']}")
    lines.append(f"**ATM 行权价**: ${data['atm_strike']} (到期: {data['expiry']})")
    
    lines.append("\n## 📊 IV 指标")
    lines.append("| 指标 | 值 | 说明 |")
    lines.append("|------|-----|------|")
    lines.append(f"| **ATM IV** | {data['atm_iv']:.1f}% | 当前隐含波动率 |")
    
    if data['iv_rank'] is not None:
        rank_emoji = "🔴" if data['iv_rank'] >= 70 else "🟢" if data['iv_rank'] <= 30 else "🟡"
        lines.append(f"| **IV Rank** | {data['iv_rank']:.1f}% {rank_emoji} | 当前IV在52周的位置 |")
    
    if data['iv_percentile'] is not None:
        lines.append(f"| **IV Percentile** | {data['iv_percentile']:.1f}% | 超过多少历史数据 |")
    
    lines.append("\n## 📈 历史波动率")
    lines.append("| 指标 | 值 |")
    lines.append("|------|-----|")
    if data['hv_20']:
        lines.append(f"| **HV(20)** | {data['hv_20']:.1f}% |")
    if data['hv_60']:
        lines.append(f"| **HV(60)** | {data['hv_60']:.1f}% |")
    if data['iv_hv_premium'] is not None:
        premium_sign = "+" if data['iv_hv_premium'] > 0 else ""
        lines.append(f"| **IV-HV Premium** | {premium_sign}{data['iv_hv_premium']:.1f}% |")
    
    lines.append("\n## 📉 52周 IV 范围")
    if data['iv_52w_high'] and data['iv_52w_low']:
        lines.append(f"- **高**: {data['iv_52w_high']:.1f}%")
        lines.append(f"- **低**: {data['iv_52w_low']:.1f}%")
        lines.append(f"- **当前**: {data['atm_iv']:.1f}%")
    
    lines.append(f"\n## 💡 策略建议")
    env_emoji = {"HIGH_IV": "🔴", "LOW_IV": "🟢", "NORMAL_IV": "🟡"}.get(data['iv_environment'], "⚪")
    lines.append(f"\n{env_emoji} **{data['iv_environment']}**: {data['iv_advice']}")
    
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description='IV 分析工具')
    parser.add_argument('symbol', help='股票代码')
    parser.add_argument('--format', '-f', choices=['json', 'md'], default='md', help='输出格式')
    
    args = parser.parse_args()
    
    try:
        data = analyze_iv(args.symbol.upper())
        
        if args.format == 'json':
            print(json.dumps(data, indent=2, ensure_ascii=False))
        else:
            print(format_markdown(data))
            
    except Exception as e:
        print(f"❌ 错误: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
