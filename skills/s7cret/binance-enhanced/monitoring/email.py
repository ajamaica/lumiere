"""Email report sender

Usage:
    from email import EmailSender
    s = EmailSender(config)
    s.send_html_report('recipient@example.com', 'Daily report', html)
"""

import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)

class EmailSender:
    def __init__(self, config):
        self.smtp_host = config.get('email', {}).get('smtp_host')
        self.smtp_port = config.get('email', {}).get('smtp_port', 587)
        self.username = config.get('email', {}).get('username')
        self.password = config.get('email', {}).get('password')
        self.from_addr = config.get('email', {}).get('from')

    def send_html_report(self, to_addr, subject, html_body):
        if not all([self.smtp_host, self.username, self.password]):
            logger.error('SMTP not configured')
            return False
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = self.from_addr
        msg['To'] = to_addr
        part = MIMEText(html_body, 'html')
        msg.attach(part)
        try:
            with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=10) as s:
                s.starttls()
                s.login(self.username, self.password)
                s.sendmail(self.from_addr, [to_addr], msg.as_string())
            return True
        except Exception as e:
            logger.exception('Failed to send email: %s', e)
            return False
