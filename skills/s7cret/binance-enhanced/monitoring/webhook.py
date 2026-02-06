"""Simple webhook push notifier

Usage:
    from webhook import WebhookNotifier
    n = WebhookNotifier(config)
    n.push({'title':'Alert','text':'Price moved 4%'})
"""

import requests
import logging

logger = logging.getLogger(__name__)

class WebhookNotifier:
    def __init__(self, config):
        self.url = config.get('webhook', {}).get('url')

    def push(self, payload):
        if not self.url:
            logger.error('Webhook URL not configured')
            return False
        try:
            r = requests.post(self.url, json=payload, timeout=5)
            r.raise_for_status()
            return True
        except Exception as e:
            logger.exception('Failed to call webhook: %s', e)
            return False
