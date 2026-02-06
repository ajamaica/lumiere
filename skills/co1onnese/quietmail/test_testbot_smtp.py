#!/usr/bin/env python3
"""Test sending email with test-bot credentials"""
import asyncio
import aiosmtplib
from email.mime.text import MIMEText

async def test_send():
    msg = MIMEText("This is a test email from test-bot mailbox")
    msg['Subject'] = "Test from test-bot"
    msg['From'] = "test-bot@quiet-mail.com"
    msg['To'] = "bob@quiet-mail.com"
    
    await aiosmtplib.send(
        msg,
        hostname="quiet-mail.com",
        port=587,
        username="test-bot@quiet-mail.com",
        password="LxTWbNgAHxY9vRYeslfIqf7xbwMqyoA3pWL720y-R0o",
        start_tls=True,
        timeout=30
    )
    print("Email sent successfully from test-bot!")

if __name__ == "__main__":
    asyncio.run(test_send())
