#!/usr/bin/env python3
"""
Greeks 计算器 - 使用 Black-Scholes 模型计算期权 Greeks
用法: python greeks_calc.py --spot 180 --strike 185 --dte 30 --rate 5 --iv 25 --type call
"""

import argparse
import json
import math
import sys
from datetime import datetime
from typing import Optional

try:
    import mibian
    USE_MIBIAN = True
except ImportError:
    USE_MIBIAN = False

import yfinance as yf
from scipy.stats import norm


class BlackScholes:
    """Black-Scholes 期权定价和 Greeks 计算"""
    
    def __init__(self, spot: float, strike: float, dte: int, rate: float, iv: float, option_type: str = 'call'):
        """
        Args:
            spot: 标的价格
            strike: 行权价
            dte: 距到期天数
            rate: 无风险利率 (百分比, 如 5 表示 5%)
            iv: 隐含波动率 (百分比, 如 25 表示 25%)
            option_type: 'call' 或 'put'
        """
        self.S = spot
        self.K = strike
        self.T = dte / 365.0  # 转为年
        self.r = rate / 100.0  # 转为小数
        self.sigma = iv / 100.0  # 转为小数
        self.option_type = option_type.lower()
        
        # 计算 d1 和 d2
        if self.T <= 0:
            self.T = 0.0001  # 防止除零
        
        self.d1 = (math.log(self.S / self.K) + (self.r + 0.5 * self.sigma ** 2) * self.T) / (self.sigma * math.sqrt(self.T))
        self.d2 = self.d1 - self.sigma * math.sqrt(self.T)
    
    def price(self) -> float:
        """期权价格"""
        if self.option_type == 'call':
            return self.S * norm.cdf(self.d1) - self.K * math.exp(-self.r * self.T) * norm.cdf(self.d2)
        else:
            return self.K * math.exp(-self.r * self.T) * norm.cdf(-self.d2) - self.S * norm.cdf(-self.d1)
    
    def delta(self) -> float:
        """Delta: 标的价格变动1美元，期权价格变动多少"""
        if self.option_type == 'call':
            return norm.cdf(self.d1)
        else:
            return norm.cdf(self.d1) - 1
    
    def gamma(self) -> float:
        """Gamma: Delta 对标的价格的敏感度"""
        return norm.pdf(self.d1) / (self.S * self.sigma * math.sqrt(self.T))
    
    def theta(self) -> float:
        """Theta: 每天时间衰减 (负数表示损失)"""
        term1 = -(self.S * norm.pdf(self.d1) * self.sigma) / (2 * math.sqrt(self.T))
        if self.option_type == 'call':
            term2 = -self.r * self.K * math.exp(-self.r * self.T) * norm.cdf(self.d2)
        else:
            term2 = self.r * self.K * math.exp(-self.r * self.T) * norm.cdf(-self.d2)
        return (term1 + term2) / 365  # 每天的 theta
    
    def vega(self) -> float:
        """Vega: IV 变动1%，期权价格变动多少"""
        return self.S * norm.pdf(self.d1) * math.sqrt(self.T) / 100
    
    def rho(self) -> float:
        """Rho: 利率变动1%，期权价格变动多少"""
        if self.option_type == 'call':
            return self.K * self.T * math.exp(-self.r * self.T) * norm.cdf(self.d2) / 100
        else:
            return -self.K * self.T * math.exp(-self.r * self.T) * norm.cdf(-self.d2) / 100
    
    def all_greeks(self) -> dict:
        """计算所有 Greeks"""
        return {
            'price': round(self.price(), 4),
            'delta': round(self.delta(), 4),
            'gamma': round(self.gamma(), 4),
            'theta': round(self.theta(), 4),
            'vega': round(self.vega(), 4),
            'rho': round(self.rho(), 4)
        }


def calculate_greeks_mibian(spot: float, strike: float, dte: int, rate: float, iv: float, option_type: str) -> dict:
    """使用 mibian 库计算 Greeks"""
    bs = mibian.BS([spot, strike, rate, dte], volatility=iv)
    
    if option_type.lower() == 'call':
        return {
            'price': round(bs.callPrice, 4),
            'delta': round(bs.callDelta, 4),
            'gamma': round(bs.gamma, 4),
            'theta': round(bs.callTheta, 4),
            'vega': round(bs.vega, 4),
            'rho': round(bs.callRho, 4)
        }
    else:
        return {
            'price': round(bs.putPrice, 4),
            'delta': round(bs.putDelta, 4),
            'gamma': round(bs.gamma, 4),
            'theta': round(bs.putTheta, 4),
            'vega': round(bs.vega, 4),
            'rho': round(bs.putRho, 4)
        }


def get_from_symbol(symbol: str, strike: float, expiry: str, option_type: str, rate: float = 5.0) -> dict:
    """从股票代码获取实时数据并计算 Greeks"""
    ticker = yf.Ticker(symbol)
    
    # 获取当前价格
    info = ticker.info
    spot = info.get('currentPrice') or info.get('regularMarketPrice') or info.get('previousClose')
    if not spot:
        hist = ticker.history(period='1d')
        spot = hist['Close'].iloc[-1] if not hist.empty else None
    
    if not spot:
        raise ValueError(f"无法获取 {symbol} 的价格")
    
    # 获取期权链找到 IV
    opt = ticker.option_chain(expiry)
    chain = opt.calls if option_type.lower() == 'call' else opt.puts
    
    # 找到最接近的行权价
    chain['strike_diff'] = abs(chain['strike'] - strike)
    closest = chain.loc[chain['strike_diff'].idxmin()]
    
    iv = closest['impliedVolatility'] * 100  # 转为百分比
    actual_strike = closest['strike']
    
    # 计算 DTE
    expiry_date = datetime.strptime(expiry, '%Y-%m-%d')
    dte = (expiry_date - datetime.now()).days + 1
    
    # 计算 Greeks
    bs = BlackScholes(spot, actual_strike, dte, rate, iv, option_type)
    greeks = bs.all_greeks()
    
    greeks.update({
        'symbol': symbol,
        'spot': round(spot, 2),
        'strike': actual_strike,
        'expiry': expiry,
        'dte': dte,
        'iv': round(iv, 2),
        'rate': rate,
        'type': option_type.upper(),
        'market_price': round(closest['lastPrice'], 2),
        'bid': round(closest['bid'], 2),
        'ask': round(closest['ask'], 2)
    })
    
    return greeks


def format_output(greeks: dict, format_type: str = 'md') -> str:
    """格式化输出"""
    if format_type == 'json':
        return json.dumps(greeks, indent=2, ensure_ascii=False)
    
    lines = []
    if 'symbol' in greeks:
        lines.append(f"# {greeks['symbol']} {greeks['type']} Option Greeks")
        lines.append(f"\n**标的价格**: ${greeks['spot']}")
        lines.append(f"**行权价**: ${greeks['strike']}")
        lines.append(f"**到期日**: {greeks['expiry']} (DTE: {greeks['dte']}天)")
        lines.append(f"**隐含波动率**: {greeks['iv']:.1f}%")
        lines.append(f"**无风险利率**: {greeks['rate']:.1f}%")
        if 'market_price' in greeks:
            lines.append(f"**市场价格**: ${greeks['market_price']} (Bid: ${greeks['bid']}, Ask: ${greeks['ask']})")
    
    lines.append("\n## Greeks")
    lines.append("| Greek | 值 | 含义 |")
    lines.append("|-------|-----|------|")
    lines.append(f"| **Delta** | {greeks['delta']:.4f} | 标的涨$1，期权涨${abs(greeks['delta']):.2f} |")
    lines.append(f"| **Gamma** | {greeks['gamma']:.4f} | Delta的变化率 |")
    lines.append(f"| **Theta** | {greeks['theta']:.4f} | 每天损失${abs(greeks['theta']):.2f} |")
    lines.append(f"| **Vega** | {greeks['vega']:.4f} | IV涨1%，期权涨${greeks['vega']:.2f} |")
    lines.append(f"| **Rho** | {greeks['rho']:.4f} | 利率涨1%，期权涨${greeks['rho']:.2f} |")
    lines.append(f"\n**理论价格**: ${greeks['price']:.2f}")
    
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description='计算期权 Greeks')
    
    # 两种模式: 手动输入参数 或 从股票获取
    parser.add_argument('--symbol', '-s', help='股票代码 (自动获取价格和IV)')
    parser.add_argument('--spot', type=float, help='标的价格')
    parser.add_argument('--strike', '-k', type=float, required=True, help='行权价')
    parser.add_argument('--expiry', '-e', help='到期日 (YYYY-MM-DD，使用 --symbol 时需要)')
    parser.add_argument('--dte', '-d', type=int, help='距到期天数')
    parser.add_argument('--rate', '-r', type=float, default=5.0, help='无风险利率 (百分比，默认5)')
    parser.add_argument('--iv', type=float, help='隐含波动率 (百分比，如25表示25%%)')
    parser.add_argument('--type', '-t', choices=['call', 'put'], default='call', help='期权类型')
    parser.add_argument('--format', '-f', choices=['json', 'md'], default='md', help='输出格式')
    parser.add_argument('--use-mibian', action='store_true', help='使用 mibian 库计算')
    
    args = parser.parse_args()
    
    try:
        if args.symbol:
            # 从股票获取实时数据
            if not args.expiry:
                # 获取最近的到期日
                ticker = yf.Ticker(args.symbol)
                args.expiry = ticker.options[0]
                print(f"ℹ️ 使用最近到期日: {args.expiry}", file=sys.stderr)
            
            greeks = get_from_symbol(args.symbol.upper(), args.strike, args.expiry, args.type, args.rate)
        else:
            # 手动输入参数
            if not args.spot or not args.dte or not args.iv:
                parser.error("手动模式需要提供 --spot, --dte, --iv")
            
            if args.use_mibian and USE_MIBIAN:
                greeks = calculate_greeks_mibian(args.spot, args.strike, args.dte, args.rate, args.iv, args.type)
            else:
                bs = BlackScholes(args.spot, args.strike, args.dte, args.rate, args.iv, args.type)
                greeks = bs.all_greeks()
            
            greeks.update({
                'spot': args.spot,
                'strike': args.strike,
                'dte': args.dte,
                'iv': args.iv,
                'rate': args.rate,
                'type': args.type.upper()
            })
        
        print(format_output(greeks, args.format))
        
    except Exception as e:
        print(f"❌ 错误: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
