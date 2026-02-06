#!/usr/bin/env python3
"""
Binance Alpha 新币上线监控
通过 WebSocket 监听 !miniTicker@arr 检测新上线交易对
"""

import os
import sys
import json
import time
import signal
import argparse
import urllib.request
import urllib.error
from datetime import datetime
from typing import Set, Dict, List, Optional

# 尝试导入 websocket
try:
    import websocket
    WEBSOCKET_AVAILABLE = True
except ImportError:
    WEBSOCKET_AVAILABLE = False
    print("⚠️  websocket-client 库未安装，请先运行: pip3 install websocket-client --user")

# Binance 配置
BINANCE_WS_URL = "wss://stream.binance.com:9443/ws/!miniTicker@arr"
BINANCE_API_URL = "https://api.binance.com/api/v3"

# 存储文件
STATE_DIR = os.path.expanduser("~/.config/alpha")
KNOWN_SYMBOLS_FILE = os.path.join(STATE_DIR, "known_symbols.json")
ALERT_HISTORY_FILE = os.path.join(STATE_DIR, "alerts_history.json")

# 全局变量
known_symbols: Set[str] = set()
alert_history: List[Dict] = []
ws_app = None
running = True

def ensure_state_dir():
    """确保状态目录存在"""
    os.makedirs(STATE_DIR, exist_ok=True)

def load_known_symbols() -> Set[str]:
    """加载已知的交易对集合"""
    global known_symbols
    
    ensure_state_dir()
    
    if os.path.exists(KNOWN_SYMBOLS_FILE):
        try:
            with open(KNOWN_SYMBOLS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                known_symbols = set(data.get('symbols', []))
                print(f"📂 已加载 {len(known_symbols)} 个已知交易对")
                return known_symbols
        except Exception as e:
            print(f"⚠️  加载已知交易对失败: {e}")
    
    print("📂 首次运行，将创建新的交易对集合")
    return set()

def save_known_symbols():
    """保存已知的交易对集合"""
    ensure_state_dir()
    
    try:
        with open(KNOWN_SYMBOLS_FILE, 'w', encoding='utf-8') as f:
            json.dump({
                'symbols': sorted(list(known_symbols)),
                'updated_at': datetime.now().isoformat()
            }, f, indent=2)
    except Exception as e:
        print(f"⚠️  保存已知交易对失败: {e}")

def load_alert_history() -> List[Dict]:
    """加载报警历史"""
    global alert_history
    
    ensure_state_dir()
    
    if os.path.exists(ALERT_HISTORY_FILE):
        try:
            with open(ALERT_HISTORY_FILE, 'r', encoding='utf-8') as f:
                alert_history = json.load(f)
                return alert_history
        except Exception as e:
            print(f"⚠️  加载报警历史失败: {e}")
    
    return []

def save_alert_history():
    """保存报警历史"""
    ensure_state_dir()
    
    try:
        with open(ALERT_HISTORY_FILE, 'w', encoding='utf-8') as f:
            json.dump(alert_history[-100:], f, indent=2, ensure_ascii=False)  # 只保留最近100条
    except Exception as e:
        print(f"⚠️  保存报警历史失败: {e}")

def check_symbol_has_price(symbol: str) -> bool:
    """通过 REST API 检查交易对是否已有开盘价"""
    try:
        url = f"{BINANCE_API_URL}/ticker/price?symbol={symbol}"
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Alpha-New-Coin-Monitor/1.0'
        })
        
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            price = data.get('price', '0')
            # 检查价格是否有效（不为0且不为空）
            return float(price) > 0
    except urllib.error.HTTPError as e:
        if e.code == 400:
            # 交易对不存在或无效
            return False
        print(f"⚠️  检查 {symbol} 价格时 HTTP 错误: {e.code}")
        return False
    except Exception as e:
        print(f"⚠️  检查 {symbol} 价格失败: {e}")
        return False

def get_symbol_info(symbol: str) -> Optional[Dict]:
    """获取交易对详细信息"""
    try:
        url = f"{BINANCE_API_URL}/ticker/24hr?symbol={symbol}"
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Alpha-New-Coin-Monitor/1.0'
        })
        
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            return {
                'symbol': data.get('symbol'),
                'price': data.get('lastPrice'),
                'open': data.get('openPrice'),
                'high': data.get('highPrice'),
                'low': data.get('lowPrice'),
                'volume': data.get('volume'),
                'quote_volume': data.get('quoteVolume'),
                'change': data.get('priceChange'),
                'change_percent': data.get('priceChangePercent'),
                'count': data.get('count')
            }
    except Exception as e:
        print(f"⚠️  获取 {symbol} 信息失败: {e}")
        return None

def alert_new_coin(symbol: str, ticker_data: Dict):
    """新币上线报警"""
    timestamp = datetime.now().isoformat()
    
    # 获取详细信息
    info = get_symbol_info(symbol)
    
    alert_data = {
        'symbol': symbol,
        'detected_at': timestamp,
        'ticker': ticker_data,
        'detail': info
    }
    
    # 添加到历史
    alert_history.append(alert_data)
    save_alert_history()
    
    # 控制台输出（带颜色）
    print("\n" + "=" * 70)
    print(f"🚀🚀🚀 新币上线 detected! 🚀🚀🚀")
    print("=" * 70)
    print(f"⏰ 检测时间: {timestamp}")
    print(f"🪙 交易对: {symbol}")
    
    if info:
        print(f"💰 当前价格: {info.get('price', 'N/A')}")
        print(f"📊 开盘价: {info.get('open', 'N/A')}")
        print(f"📈 24h涨跌: {info.get('change', 'N/A')} ({info.get('change_percent', 'N/A')}%)")
        print(f"📦 24h成交量: {info.get('volume', 'N/A')}")
        print(f"💵 24h成交额: {info.get('quote_volume', 'N/A')}")
    else:
        print(f"📈 最新价格: {ticker_data.get('c', 'N/A')}")
    
    print("=" * 70)
    print()
    
    # 如果有配置通知方式，可以在这里添加
    # send_notification(symbol, info)

def on_message(ws, message):
    """WebSocket 消息处理"""
    global known_symbols, running
    
    if not running:
        return
    
    try:
        data = json.loads(message)
        
        if not isinstance(data, list):
            return
        
        new_symbols_found = []
        
        for ticker in data:
            if not isinstance(ticker, dict):
                continue
            
            symbol = ticker.get('s')
            
            # 过滤无效 symbol
            if not symbol or not isinstance(symbol, str):
                continue
            
            # 跳过 status 等系统symbol
            if symbol.startswith('!') or symbol == 'status':
                continue
            
            # 检查是否是新交易对
            if symbol not in known_symbols:
                # 确认是否已有开盘价
                if check_symbol_has_price(symbol):
                    new_symbols_found.append((symbol, ticker))
                
                # 添加到已知集合（无论是否有价格，避免重复检查）
                known_symbols.add(symbol)
        
        # 保存更新后的集合
        if new_symbols_found:
            save_known_symbols()
            
            # 触发报警
            for symbol, ticker in new_symbols_found:
                alert_new_coin(symbol, ticker)
        
    except json.JSONDecodeError:
        print(f"⚠️  JSON 解析错误: {message[:100]}")
    except Exception as e:
        print(f"⚠️  处理消息时出错: {e}")

def on_error(ws, error):
    """WebSocket 错误处理"""
    print(f"❌ WebSocket 错误: {error}")

def on_close(ws, close_status_code, close_msg):
    """WebSocket 关闭处理"""
    print(f"🔌 WebSocket 连接关闭 (code: {close_status_code}, msg: {close_msg})")
    
    if running:
        print("🔄 将在 5 秒后重新连接...")
        time.sleep(5)
        start_monitoring()

def on_open(ws):
    """WebSocket 连接成功"""
    print("✅ WebSocket 连接成功")
    print(f"📊 开始监控... 已知交易对: {len(known_symbols)} 个")
    print("⏳ 等待新币上线...\n")

def start_monitoring():
    """启动监控"""
    global ws_app
    
    if not WEBSOCKET_AVAILABLE:
        print("❌ 请先安装 websocket-client: pip3 install websocket-client --user")
        return
    
    # 加载已知交易对
    load_known_symbols()
    load_alert_history()
    
    # 创建 WebSocket 连接
    ws_app = websocket.WebSocketApp(
        BINANCE_WS_URL,
        on_open=on_open,
        on_message=on_message,
        on_error=on_error,
        on_close=on_close
    )
    
    # 启动（会阻塞）
    ws_app.run_forever()

def stop_monitoring():
    """停止监控"""
    global running, ws_app
    
    running = False
    print("\n🛑 正在停止监控...")
    
    if ws_app:
        ws_app.close()
    
    # 保存状态
    save_known_symbols()
    save_alert_history()
    
    print("✅ 监控已停止")

def signal_handler(sig, frame):
    """信号处理"""
    stop_monitoring()
    sys.exit(0)

def list_alerts(limit: int = 20):
    """列出历史报警"""
    history = load_alert_history()
    
    if not history:
        print("📭 暂无报警记录")
        return
    
    print(f"\n📜 历史报警记录 (最近 {min(limit, len(history))} 条):\n")
    
    for alert in history[-limit:]:
        symbol = alert.get('symbol', 'Unknown')
        detected_at = alert.get('detected_at', 'Unknown')
        detail = alert.get('detail', {})
        
        print(f"⏰ {detected_at}")
        print(f"🪙 {symbol}")
        if detail:
            print(f"💰 价格: {detail.get('price', 'N/A')}")
            print(f"📊 涨跌: {detail.get('change_percent', 'N/A')}%")
        print("-" * 50)

def reset_known_symbols():
    """重置已知交易对集合"""
    global known_symbols
    
    confirm = input("⚠️  确定要重置已知交易对集合吗？这将清除所有历史记录。\n输入 'yes' 确认: ")
    
    if confirm.lower() == 'yes':
        known_symbols = set()
        save_known_symbols()
        
        # 也清除历史记录
        global alert_history
        alert_history = []
        save_alert_history()
        
        print("✅ 已重置")
    else:
        print("❎ 已取消")

def main():
    parser = argparse.ArgumentParser(
        description='Binance Alpha 新币上线监控',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 启动监控
  %(prog)s monitor

  # 查看历史报警
  %(prog)s history

  # 重置已知交易对（重新开始）
  %(prog)s reset
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='可用命令')
    
    # monitor 命令
    subparsers.add_parser('monitor', help='启动新币监控')
    
    # history 命令
    history_parser = subparsers.add_parser('history', help='查看历史报警')
    history_parser.add_argument('--limit', '-l', type=int, default=20,
                               help='显示条数（默认: 20）')
    
    # reset 命令
    subparsers.add_parser('reset', help='重置已知交易对集合')
    
    # status 命令
    subparsers.add_parser('status', help='查看当前状态')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    if not WEBSOCKET_AVAILABLE:
        print("❌ 请先安装 websocket-client:")
        print("   pip3 install websocket-client --user")
        return
    
    if args.command == 'monitor':
        # 注册信号处理
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
        
        print("🚀 Binance Alpha 新币上线监控")
        print("=" * 50)
        
        try:
            start_monitoring()
        except KeyboardInterrupt:
            stop_monitoring()
    
    elif args.command == 'history':
        list_alerts(args.limit)
    
    elif args.command == 'reset':
        reset_known_symbols()
    
    elif args.command == 'status':
        load_known_symbols()
        load_alert_history()
        
        print(f"\n📊 当前状态:\n")
        print(f"  已知交易对数量: {len(known_symbols)}")
        print(f"  历史报警数量: {len(alert_history)}")
        print(f"  状态文件位置: {STATE_DIR}")
        
        if alert_history:
            latest = alert_history[-1]
            print(f"\n  最近报警:")
            print(f"    时间: {latest.get('detected_at', 'N/A')}")
            print(f"    交易对: {latest.get('symbol', 'N/A')}")

if __name__ == '__main__':
    main()
