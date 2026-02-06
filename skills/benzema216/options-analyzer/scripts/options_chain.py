#!/usr/bin/env python3
"""
期权链分析工具 - 获取并展示股票期权链数据
用法: python options_chain.py SYMBOL [--expiry DATE] [--strike-range PCT] [--format json|md]
"""

import argparse
import json
import sys
from datetime import datetime
from typing import Optional

import pandas as pd
import yfinance as yf


def get_options_chain(symbol: str, expiry: Optional[str] = None, strike_range: float = 10) -> dict:
    """获取期权链数据"""
    ticker = yf.Ticker(symbol)
    
    # 获取当前价格
    info = ticker.info
    current_price = info.get('currentPrice') or info.get('regularMarketPrice') or info.get('previousClose')
    if not current_price:
        hist = ticker.history(period='1d')
        if not hist.empty:
            current_price = hist['Close'].iloc[-1]
    
    if not current_price:
        raise ValueError(f"无法获取 {symbol} 的当前价格")
    
    # 获取可用到期日
    expirations = ticker.options
    if not expirations:
        raise ValueError(f"{symbol} 没有可用的期权数据")
    
    # 选择到期日
    if expiry:
        if expiry not in expirations:
            expiry_date = datetime.strptime(expiry, '%Y-%m-%d')
            closest = min(expirations, key=lambda x: abs(datetime.strptime(x, '%Y-%m-%d') - expiry_date))
            print(f"⚠️ 指定到期日 {expiry} 不可用，使用最接近的: {closest}", file=sys.stderr)
            expiry = closest
    else:
        expiry = expirations[0]
    
    # 获取期权链
    opt = ticker.option_chain(expiry)
    calls = opt.calls
    puts = opt.puts
    
    # 计算行权价范围
    min_strike = current_price * (1 - strike_range / 100)
    max_strike = current_price * (1 + strike_range / 100)
    
    # 筛选行权价范围内的期权
    calls_filtered = calls[(calls['strike'] >= min_strike) & (calls['strike'] <= max_strike)].copy()
    puts_filtered = puts[(puts['strike'] >= min_strike) & (puts['strike'] <= max_strike)].copy()
    
    # 计算DTE
    expiry_date = datetime.strptime(expiry, '%Y-%m-%d')
    dte = (expiry_date - datetime.now()).days + 1
    
    # 选择需要的列
    columns = ['strike', 'bid', 'ask', 'lastPrice', 'volume', 'openInterest', 'impliedVolatility', 'inTheMoney']
    
    def process_df(df, opt_type):
        if df.empty:
            return pd.DataFrame()
        df = df[columns].copy()
        df.columns = ['Strike', 'Bid', 'Ask', 'Last', 'Volume', 'OI', 'IV', 'ITM']
        df['IV'] = (df['IV'] * 100).round(2)
        df['Type'] = opt_type
        df = df.fillna(0)
        df['Volume'] = df['Volume'].astype(int)
        df['OI'] = df['OI'].astype(int)
        return df
    
    calls_df = process_df(calls_filtered, 'CALL')
    puts_df = process_df(puts_filtered, 'PUT')
    
    return {
        'symbol': symbol,
        'current_price': round(current_price, 2),
        'expiry': expiry,
        'dte': dte,
        'available_expiries': list(expirations[:10]),
        'calls': calls_df.to_dict('records') if not calls_df.empty else [],
        'puts': puts_df.to_dict('records') if not puts_df.empty else []
    }


def format_markdown(data: dict) -> str:
    """格式化为 Markdown"""
    lines = []
    lines.append(f"# {data['symbol']} 期权链")
    lines.append(f"\n**当前价格**: ${data['current_price']}")
    lines.append(f"**到期日**: {data['expiry']} (DTE: {data['dte']}天)")
    lines.append(f"**可用到期日**: {', '.join(data['available_expiries'][:5])}...")
    
    if data['calls']:
        lines.append("\n## 📈 看涨期权 (Calls)")
        lines.append("| Strike | Bid | Ask | Last | Volume | OI | IV% | ITM |")
        lines.append("|--------|-----|-----|------|--------|-----|-----|-----|")
        for c in data['calls']:
            itm = "✅" if c['ITM'] else ""
            lines.append(f"| {c['Strike']} | {c['Bid']:.2f} | {c['Ask']:.2f} | {c['Last']:.2f} | {c['Volume']} | {c['OI']} | {c['IV']:.1f} | {itm} |")
    
    if data['puts']:
        lines.append("\n## 📉 看跌期权 (Puts)")
        lines.append("| Strike | Bid | Ask | Last | Volume | OI | IV% | ITM |")
        lines.append("|--------|-----|-----|------|--------|-----|-----|-----|")
        for p in data['puts']:
            itm = "✅" if p['ITM'] else ""
            lines.append(f"| {p['Strike']} | {p['Bid']:.2f} | {p['Ask']:.2f} | {p['Last']:.2f} | {p['Volume']} | {p['OI']} | {p['IV']:.1f} | {itm} |")
    
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description='获取股票期权链数据')
    parser.add_argument('symbol', help='股票代码 (如 AAPL, SPY)')
    parser.add_argument('--expiry', '-e', help='到期日 (YYYY-MM-DD)')
    parser.add_argument('--strike-range', '-r', type=float, default=10, help='行权价范围 ATM±百分比 (默认10)')
    parser.add_argument('--format', '-f', choices=['json', 'md'], default='md', help='输出格式')
    
    args = parser.parse_args()
    
    try:
        data = get_options_chain(args.symbol.upper(), args.expiry, args.strike_range)
        
        if args.format == 'json':
            print(json.dumps(data, indent=2, ensure_ascii=False))
        else:
            print(format_markdown(data))
            
    except Exception as e:
        print(f"❌ 错误: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
