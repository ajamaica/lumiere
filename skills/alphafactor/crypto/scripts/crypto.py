#!/usr/bin/env python3
"""
加密货币行情获取与价格监控预警工具
基于 CCXT 库，支持多交易所、实时行情、价格预警
"""

import os
import sys
import json
import time
import argparse
from datetime import datetime
from typing import Dict, List, Optional, Tuple

# 尝试导入 ccxt
try:
    import ccxt
    CCXT_AVAILABLE = True
except ImportError:
    CCXT_AVAILABLE = False

def check_ccxt():
    """检查 ccxt 是否安装，未安装时提供帮助信息"""
    if CCXT_AVAILABLE:
        return True
    
    print("=" * 60)
    print("❌ 缺少依赖: ccxt 库未安装")
    print("=" * 60)
    print()
    print("📦 安装方式（选择其一）：")
    print()
    print("  方式1 - 用户安装（推荐）：")
    print("    pip3 install ccxt --user")
    print()
    print("  方式2 - 系统安装（需管理员权限）：")
    print("    pip3 install ccxt")
    print()
    print("  方式3 - macOS 外部管理环境：")
    print("    pip3 install ccxt --user --break-system-packages")
    print()
    print("📖 文档: https://docs.ccxt.com/")
    print("=" * 60)
    return False

# 配置存储
CONFIG_DIR = os.path.expanduser("~/.config/crypto")
ALERTS_FILE = os.path.join(CONFIG_DIR, "alerts.json")

def ensure_config_dir():
    """确保配置目录存在"""
    os.makedirs(CONFIG_DIR, exist_ok=True)

def get_exchange(exchange_id: str = 'binance'):
    """获取交易所实例"""
    if not CCXT_AVAILABLE:
        return None
    
    try:
        exchange_class = getattr(ccxt, exchange_id)
        exchange = exchange_class({
            'enableRateLimit': True,
        })
        return exchange
    except AttributeError:
        print(f"❌ 不支持的交易所: {exchange_id}")
        print(f"   支持的交易所: binance, okx, bybit, gateio, kucoin, huobi, coinbase...")
        return None
    except Exception as e:
        print(f"❌ 初始化交易所失败: {e}")
        return None

def load_alerts() -> Dict:
    """加载预警配置"""
    ensure_config_dir()
    
    if os.path.exists(ALERTS_FILE):
        try:
            with open(ALERTS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"⚠️  加载预警配置失败: {e}")
    
    return {}

def save_alerts(alerts: Dict):
    """保存预警配置"""
    ensure_config_dir()
    
    try:
        with open(ALERTS_FILE, 'w', encoding='utf-8') as f:
            json.dump(alerts, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"❌ 保存预警配置失败: {e}")

def get_ticker(exchange, symbol: str) -> Optional[Dict]:
    """获取行情数据"""
    try:
        ticker = exchange.fetch_ticker(symbol.upper())
        return {
            'symbol': ticker['symbol'],
            'last': ticker['last'],
            'high': ticker['high'],
            'low': ticker['low'],
            'bid': ticker['bid'],
            'ask': ticker['ask'],
            'volume': ticker['baseVolume'],
            'quote_volume': ticker['quoteVolume'],
            'change': ticker['change'],
            'percentage': ticker['percentage'],
            'timestamp': ticker['timestamp']
        }
    except ccxt.NetworkError as e:
        print(f"❌ 网络错误: {e}")
        return None
    except ccxt.ExchangeError as e:
        print(f"❌ 交易所错误: {e}")
        return None
    except Exception as e:
        print(f"❌ 获取行情失败: {e}")
        return None

def get_orderbook(exchange, symbol: str, limit: int = 10) -> Optional[Dict]:
    """获取订单簿"""
    try:
        orderbook = exchange.fetch_order_book(symbol.upper(), limit)
        return {
            'symbol': symbol.upper(),
            'bids': orderbook['bids'][:5],
            'asks': orderbook['asks'][:5],
            'timestamp': orderbook['timestamp']
        }
    except Exception as e:
        print(f"❌ 获取订单簿失败: {e}")
        return None

def get_ohlcv(exchange, symbol: str, timeframe: str = '1h', limit: int = 24) -> List[List]:
    """获取K线数据"""
    try:
        ohlcv = exchange.fetch_ohlcv(symbol.upper(), timeframe, limit=limit)
        return ohlcv
    except Exception as e:
        print(f"❌ 获取K线数据失败: {e}")
        return []

def print_ticker(ticker: Dict):
    """打印行情信息"""
    if not ticker:
        return
    
    symbol = ticker['symbol']
    last = ticker['last']
    high = ticker['high']
    low = ticker['low']
    volume = ticker['volume']
    change = ticker['change']
    percentage = ticker['percentage']
    
    # 涨跌颜色
    emoji = "🟢" if change >= 0 else "🔴"
    
    print(f"\n📊 {symbol} 行情:\n")
    print(f"  当前价格: {last:,.4f} {emoji}")
    print(f"  24h涨跌: {change:+.4f} ({percentage:+.2f}%)")
    print(f"  24h最高: {high:,.4f}")
    print(f"  24h最低: {low:,.4f}")
    print(f"  24h成交量: {volume:,.2f}")
    print(f"  买一/卖一: {ticker['bid']:,.4f} / {ticker['ask']:,.4f}")
    print()

def print_ohlcv(ohlcv: List[List], symbol: str):
    """打印K线数据"""
    if not ohlcv:
        return
    
    print(f"\n📈 {symbol} K线数据 (最近 {len(ohlcv)} 条):\n")
    print(f"{'时间':<20} {'开盘':<12} {'最高':<12} {'最低':<12} {'收盘':<12} {'成交量':<12}")
    print("-" * 90)
    
    for candle in ohlcv[-10:]:  # 只显示最近10条
        timestamp, open_p, high, low, close, volume = candle
        dt = datetime.fromtimestamp(timestamp / 1000).strftime('%Y-%m-%d %H:%M')
        
        change_emoji = "🟢" if close >= open_p else "🔴"
        
        print(f"{dt:<20} {open_p:<12.4f} {high:<12.4f} {low:<12.4f} {close:<12.4f} {volume:<12.4f} {change_emoji}")

def add_alert(symbol: str, condition: str, threshold: float, exchange_id: str = 'binance') -> bool:
    """添加价格预警"""
    alerts = load_alerts()
    
    alert_id = f"{symbol}_{int(time.time())}"
    
    alerts[alert_id] = {
        'symbol': symbol.upper(),
        'exchange': exchange_id,
        'condition': condition,  # 'above', 'below', 'up_percent', 'down_percent'
        'threshold': threshold,
        'created_at': datetime.now().isoformat(),
        'triggered': False,
        'base_price': None  # 用于计算涨跌幅
    }
    
    save_alerts(alerts)
    
    condition_text = {
        'above': f'价格高于 {threshold}',
        'below': f'价格低于 {threshold}',
        'up_percent': f'涨幅超过 {threshold}%',
        'down_percent': f'跌幅超过 {threshold}%'
    }.get(condition, condition)
    
    print(f"✅ 预警已添加: {symbol.upper()} {condition_text}")
    return True

def remove_alert(alert_id: str) -> bool:
    """删除预警"""
    alerts = load_alerts()
    
    if alert_id in alerts:
        del alerts[alert_id]
        save_alerts(alerts)
        print(f"✅ 预警已删除: {alert_id}")
        return True
    else:
        print(f"❌ 预警不存在: {alert_id}")
        return False

def list_alerts():
    """列出所有预警"""
    alerts = load_alerts()
    
    if not alerts:
        print("📭 没有配置任何预警")
        return
    
    print(f"\n🔔 价格预警列表 ({len(alerts)} 个):\n")
    print(f"{'ID':<25} {'交易对':<15} {'交易所':<12} {'条件':<25} {'状态':<8}")
    print("-" * 90)
    
    for alert_id, alert in alerts.items():
        symbol = alert['symbol']
        exchange = alert['exchange']
        condition = alert['condition']
        threshold = alert['threshold']
        triggered = "✅已触发" if alert.get('triggered') else "⏳监控中"
        
        condition_text = {
            'above': f'价格 > {threshold}',
            'below': f'价格 < {threshold}',
            'up_percent': f'涨幅 > {threshold}%',
            'down_percent': f'跌幅 > {threshold}%'
        }.get(condition, f'{condition} {threshold}')
        
        print(f"{alert_id:<25} {symbol:<15} {exchange:<12} {condition_text:<25} {triggered:<8}")

def check_alerts(exchange_id: str = 'binance'):
    """检查所有预警条件"""
    alerts = load_alerts()
    
    if not alerts:
        print("📭 没有配置任何预警")
        return
    
    exchange = get_exchange(exchange_id)
    if not exchange:
        return
    
    print(f"\n🔍 检查预警条件...\n")
    
    triggered_alerts = []
    
    for alert_id, alert in alerts.items():
        if alert.get('triggered'):
            continue
        
        symbol = alert['symbol']
        condition = alert['condition']
        threshold = alert['threshold']
        
        # 获取当前价格
        ticker = get_ticker(exchange, symbol)
        if not ticker:
            continue
        
        current_price = ticker['last']
        base_price = alert.get('base_price')
        
        # 如果是首次检查，记录基准价格
        if base_price is None and condition in ['up_percent', 'down_percent']:
            alert['base_price'] = current_price
            base_price = current_price
            save_alerts(alerts)
        
        triggered = False
        message = ""
        
        if condition == 'above' and current_price > threshold:
            triggered = True
            message = f"🚨 {symbol} 价格突破 {threshold}，当前价格: {current_price}"
        
        elif condition == 'below' and current_price < threshold:
            triggered = True
            message = f"🚨 {symbol} 价格跌破 {threshold}，当前价格: {current_price}"
        
        elif condition == 'up_percent' and base_price:
            change_pct = ((current_price - base_price) / base_price) * 100
            if change_pct >= threshold:
                triggered = True
                message = f"🚀 {symbol} 涨幅达到 {change_pct:.2f}%，当前价格: {current_price}"
        
        elif condition == 'down_percent' and base_price:
            change_pct = ((base_price - current_price) / base_price) * 100
            if change_pct >= threshold:
                triggered = True
                message = f"📉 {symbol} 跌幅达到 {change_pct:.2f}%，当前价格: {current_price}"
        
        if triggered:
            alert['triggered'] = True
            alert['triggered_at'] = datetime.now().isoformat()
            alert['trigger_price'] = current_price
            triggered_alerts.append((alert_id, message))
    
    save_alerts(alerts)
    
    if triggered_alerts:
        print(f"⚠️  触发 {len(triggered_alerts)} 个预警:\n")
        for alert_id, message in triggered_alerts:
            print(f"  {message}")
            print(f"  预警ID: {alert_id}")
            print()
    else:
        print("✅ 所有监控正常，暂无预警触发")

def watch_price(exchange, symbol: str, interval: int = 10):
    """实时监控价格"""
    print(f"\n👁️ 开始监控 {symbol} 价格 (每 {interval} 秒刷新，按 Ctrl+C 停止)\n")
    
    try:
        while True:
            ticker = get_ticker(exchange, symbol)
            if ticker:
                timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                change_emoji = "🟢" if ticker['change'] >= 0 else "🔴"
                print(f"\r[{timestamp}] {symbol}: {ticker['last']:,.4f} ({ticker['percentage']:+.2f}%) {change_emoji}", end='', flush=True)
            
            time.sleep(interval)
    except KeyboardInterrupt:
        print("\n\n✅ 监控已停止")

def main():
    parser = argparse.ArgumentParser(
        description='加密货币行情获取与价格监控预警',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 查看行情
  %(prog)s --exchange binance ticker BTC/USDT
  %(prog)s -e okx ticker ETH/USDT
  
  # K线数据
  %(prog)s ohlcv BTC/USDT --timeframe 1h --limit 24
  
  # 添加价格预警
  %(prog)s alert-add BTC/USDT above 70000
  %(prog)s alert-add ETH/USDT below 3000
  %(prog)s alert-add BTC/USDT up_percent 5
  
  # 检查预警
  %(prog)s alert-check
  
  # 实时监控
  %(prog)s watch BTC/USDT --interval 5
        """
    )
    
    parser.add_argument('--exchange', '-e', default='okx',
                       help='交易所 (默认: okx, 可选: binance, bybit, gateio, kucoin...)')
    
    subparsers = parser.add_subparsers(dest='command', help='可用命令')
    
    # ticker 命令
    ticker_parser = subparsers.add_parser('ticker', help='获取实时行情')
    ticker_parser.add_argument('symbol', help='交易对 (如: BTC/USDT)')
    
    # ohlcv 命令
    ohlcv_parser = subparsers.add_parser('ohlcv', help='获取K线数据')
    ohlcv_parser.add_argument('symbol', help='交易对')
    ohlcv_parser.add_argument('--timeframe', '-t', default='1h', 
                             help='时间周期 (1m, 5m, 15m, 1h, 4h, 1d, 1w, 1M)')
    ohlcv_parser.add_argument('--limit', '-l', type=int, default=24,
                             help='获取条数')
    
    # orderbook 命令
    orderbook_parser = subparsers.add_parser('orderbook', help='获取订单簿')
    orderbook_parser.add_argument('symbol', help='交易对')
    orderbook_parser.add_argument('--limit', '-l', type=int, default=10,
                                 help='深度')
    
    # watch 命令
    watch_parser = subparsers.add_parser('watch', help='实时监控价格')
    watch_parser.add_argument('symbol', help='交易对')
    watch_parser.add_argument('--interval', '-i', type=int, default=10,
                             help='刷新间隔(秒)')
    
    # alert-add 命令
    alert_add_parser = subparsers.add_parser('alert-add', help='添加价格预警')
    alert_add_parser.add_argument('symbol', help='交易对')
    alert_add_parser.add_argument('condition', choices=['above', 'below', 'up_percent', 'down_percent'],
                                 help='条件: above(高于), below(低于), up_percent(涨幅%%), down_percent(跌幅%%)')
    alert_add_parser.add_argument('threshold', type=float, help='阈值')
    
    # alert-remove 命令
    alert_remove_parser = subparsers.add_parser('alert-remove', help='删除预警')
    alert_remove_parser.add_argument('alert_id', help='预警ID')
    
    # alert-list 命令
    subparsers.add_parser('alert-list', help='列出所有预警')
    
    # alert-check 命令
    subparsers.add_parser('alert-check', help='检查预警条件')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    if not check_ccxt():
        return
    
    # 获取交易所实例
    exchange = get_exchange(args.exchange)
    if not exchange:
        return
    
    if args.command == 'ticker':
        ticker = get_ticker(exchange, args.symbol)
        print_ticker(ticker)
    
    elif args.command == 'ohlcv':
        ohlcv = get_ohlcv(exchange, args.symbol, args.timeframe, args.limit)
        print_ohlcv(ohlcv, args.symbol)
    
    elif args.command == 'orderbook':
        orderbook = get_orderbook(exchange, args.symbol, args.limit)
        if orderbook:
            print(f"\n📖 {args.symbol} 订单簿:\n")
            print(f"{'买单 (Bids)':<40} {'卖单 (Asks)':<40}")
            print("-" * 85)
            for i in range(min(5, len(orderbook['bids']), len(orderbook['asks']))):
                bid_price, bid_vol = orderbook['bids'][i]
                ask_price, ask_vol = orderbook['asks'][i]
                print(f"{bid_price:,.4f} x {bid_vol:.4f}    |    {ask_price:,.4f} x {ask_vol:.4f}")
    
    elif args.command == 'watch':
        watch_price(exchange, args.symbol, args.interval)
    
    elif args.command == 'alert-add':
        add_alert(args.symbol, args.condition, args.threshold, args.exchange)
    
    elif args.command == 'alert-remove':
        remove_alert(args.alert_id)
    
    elif args.command == 'alert-list':
        list_alerts()
    
    elif args.command == 'alert-check':
        check_alerts(args.exchange)

if __name__ == '__main__':
    main()
