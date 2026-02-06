"""Telegram notifier for Binance monitoring

Usage:
    from telegram import TelegramNotifier
    n = TelegramNotifier(config)
    n.send_alert("Price moved 5%", chat_id=config['telegram']['chat_id'])
"""

import requests
import logging

logger = logging.getLogger(__name__)

class TelegramNotifier:
    def __init__(self, config):
        self.token = config.get('telegram', {}).get('bot_token')
        self.base = f'https://api.telegram.org/bot{self.token}' if self.token else None

    def send_alert(self, message, chat_id=None):
        if not self.base:
            logger.error('Telegram token not configured')
            return False
        params = {'chat_id': chat_id, 'text': message}
        try:
            r = requests.post(f'{self.base}/sendMessage', json=params, timeout=10)
            r.raise_for_status()
            return True
        except Exception as e:
            logger.exception('Failed to send telegram message: %s', e)
            return False
