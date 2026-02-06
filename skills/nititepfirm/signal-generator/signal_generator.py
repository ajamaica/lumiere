#!/usr/bin/env python3
"""
Signal Generator Skill for OpenClaw
Generates trading signals and sends alerts to Discord/Telegram
"""

import json
import os
import sys
from datetime import datetime
from typing import Dict, List, Optional

# Add quant-trading-bot to path for exchange API
sys.path.insert(0, '/root/quant-trading-bot')

import pandas as pd
import numpy as np


class SignalGenerator:
    """Generate trading signals based on technical indicators"""

    def __init__(self, config: Dict):
        self.config = config
        self.symbol = config.get('symbol', 'BTC/USDT')
        self.strategy = config.get('strategy', 'bb_breakout')
        self.intervals = config.get('intervals', ['15m', '1h'])
        self.targets = config.get('targets', [])
        self.filters = config.get('filters', {})

    def fetch_data(self, interval: str, limit: int = 100) -> pd.DataFrame:
        """Fetch OHLCV data from Binance"""
        try:
            import ccxt

            # Create exchange instance (public, no auth needed for OHLCV)
            exchange = ccxt.binance()

            # Fetch OHLCV data
            ohlcv = exchange.fetch_ohlcv(self.symbol, interval, limit=limit)

            # Convert to DataFrame
            df = pd.DataFrame(ohlcv, columns=['Timestamp', 'Open', 'High', 'Low', 'Close', 'Volume'])
            df['Timestamp'] = pd.to_datetime(df['Timestamp'], unit='ms')
            df.set_index('Timestamp', inplace=True)

            return df
        except Exception as e:
            print(f"Error fetching data: {e}")
            return pd.DataFrame()

    def calculate_bb(self, df: pd.DataFrame, period: int = 20, std: float = 2.0) -> pd.DataFrame:
        """Calculate Bollinger Bands"""
        df = df.copy()
        df['BB_Middle'] = df['Close'].rolling(window=period).mean()
        df['BB_Std'] = df['Close'].rolling(window=period).std()
        df['BB_Upper'] = df['BB_Middle'] + (df['BB_Std'] * std)
        df['BB_Lower'] = df['BB_Middle'] - (df['BB_Std'] * std)
        return df

    def calculate_kc(self, df: pd.DataFrame, period: int = 20, mult: float = 1.5) -> pd.DataFrame:
        """Calculate Keltner Channels"""
        df = df.copy()

        # True Range
        df['High_Low'] = df['High'] - df['Low']
        df['High_Close'] = np.abs(df['High'] - df['Close'].shift())
        df['Low_Close'] = np.abs(df['Low'] - df['Close'].shift())
        df['TR'] = df[['High_Low', 'High_Close', 'Low_Close']].max(axis=1)

        # ATR
        df['ATR'] = df['TR'].rolling(window=period).mean()

        # Keltner Channels
        df['KC_Middle'] = df['Close'].rolling(window=period).mean()
        df['KC_Upper'] = df['KC_Middle'] + (df['ATR'] * mult)
        df['KC_Lower'] = df['KC_Middle'] - (df['ATR'] * mult)

        return df

    def calculate_rsi(self, df: pd.DataFrame, period: int = 14) -> pd.DataFrame:
        """Calculate RSI"""
        df = df.copy()

        delta = df['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()

        rs = gain / loss
        df['RSI'] = 100 - (100 / (1 + rs))

        return df

    def bb_breakout_strategy(self, df: pd.DataFrame) -> Dict:
        """BB Breakout Strategy"""
        df = self.calculate_bb(df)
        df = self.calculate_kc(df)

        # Squeeze condition
        df['Squeeze'] = (df['BB_Upper'] < df['KC_Upper']) & (df['BB_Lower'] > df['KC_Lower'])

        # Signals
        prev_squeeze = df['Squeeze'].shift(1)
        df['Vol_SMA'] = df['Volume'].rolling(window=20).mean()

        long_signal = (
            (df['Close'] > df['BB_Upper']) &
            (df['Volume'] > df['Vol_SMA']) &
            (prev_squeeze)
        )

        short_signal = (
            (df['Close'] < df['BB_Lower']) &
            (df['Volume'] > df['Vol_SMA']) &
            (prev_squeeze)
        )

        latest = df.iloc[-1]

        return {
            'strategy': 'BB Breakout',
            'price': latest['Close'],
            'long': bool(long_signal.iloc[-1]),
            'short': bool(short_signal.iloc[-1]),
            'squeeze': bool(latest['Squeeze']),
            'bb_upper': latest['BB_Upper'],
            'bb_lower': latest['BB_Lower'],
            'rsi': latest.get('RSI', 50)
        }

    def rsi_reversal_strategy(self, df: pd.DataFrame) -> Dict:
        """RSI Reversal Strategy"""
        df = self.calculate_rsi(df)

        latest = df.iloc[-1]

        long_signal = (latest['RSI'] < 30) & (df['RSI'].iloc[-2] >= 30)
        short_signal = (latest['RSI'] > 70) & (df['RSI'].iloc[-2] <= 70)

        return {
            'strategy': 'RSI Reversal',
            'price': latest['Close'],
            'long': bool(long_signal),
            'short': bool(short_signal),
            'rsi': latest['RSI']
        }

    def generate_signal(self, interval: str) -> Optional[Dict]:
        """Generate signal for a specific interval"""
        df = self.fetch_data(interval)

        if df.empty:
            return None

        if self.strategy == 'bb_breakout':
            signal = self.bb_breakout_strategy(df)
        elif self.strategy == 'rsi_reversal':
            signal = self.rsi_reversal_strategy(df)
        else:
            # Default to BB Breakout
            signal = self.bb_breakout_strategy(df)

        signal['interval'] = interval
        signal['timestamp'] = datetime.now().isoformat()

        return signal

    def run(self) -> List[Dict]:
        """Run signal generation for all intervals"""
        signals = []

        for interval in self.intervals:
            signal = self.generate_signal(interval)

            if signal:
                signals.append(signal)

        return signals

    def format_message(self, signal: Dict) -> str:
        """Format signal as a readable message"""
        emoji_long = "🟢" if signal.get('long') else "⚪"
        emoji_short = "🔴" if signal.get('short') else "⚪"

        message = f"""
📊 **{signal['strategy']}** - {signal.get('symbol', 'BTC/USDT')}
⏱️ Interval: {signal.get('interval', '15m')}
💰 Price: ${signal.get('price', 0):,.2f}

{emoji_long} **LONG:** {signal.get('long', False)}
{emoji_short} **SHORT:** {signal.get('short', False)}

📈 BB Upper: ${signal.get('bb_upper', 0):,.2f}
📉 BB Lower: ${signal.get('bb_lower', 0):,.2f}
🔢 RSI: {signal.get('rsi', 0):.2f}

🕐 {signal.get('timestamp', '')}
        """.strip()

        return message


def main():
    """Main entry point"""
    # Load config
    config_path = os.path.join(os.path.dirname(__file__), 'config.json')

    if not os.path.exists(config_path):
        print("Error: config.json not found. Copy config.json.example and configure.")
        return

    with open(config_path, 'r') as f:
        config = json.load(f)

    # Run signal generator
    generator = SignalGenerator(config)
    signals = generator.run()

    # Output signals
    if signals:
        print(f"\n{'='*50}")
        print(f"📊 Generated {len(signals)} Signal(s)")
        print(f"{'='*50}\n")

        for signal in signals:
            message = generator.format_message(signal)
            print(message)
            print(f"\n{'='*50}\n")

        # Save to file for OpenClaw to send
        output_path = os.path.join(os.path.dirname(__file__), 'last_signal.json')
        with open(output_path, 'w') as f:
            json.dump(signals, f, indent=2)

        print(f"✅ Signals saved to: {output_path}")
    else:
        print("⚪ No signals generated")


if __name__ == '__main__':
    main()
