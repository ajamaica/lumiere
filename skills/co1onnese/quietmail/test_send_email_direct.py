#!/usr/bin/env python3
"""Test sending email directly with Bob's credentials"""
import asyncio
import aiosmtplib
from email.mime.text import MIMEText

async def test_send():
    msg = MIMEText("This is a test email from Python direct SMTP test")
    msg['Subject'] = "Python Direct SMTP Test"
    msg['From'] = "bob@quiet-mail.com"
    msg['To'] = "bob@quiet-mail.com"
    
    await aiosmtplib.send(
        msg,
        hostname="quiet-mail.com",
        port=587,
        username="bob@quiet-mail.com",
        password="TG4IqhvLyXXOv4F2HV8m",
        start_tls=True,
        timeout=30
    )
    print("Email sent successfully!")

if __name__ == "__main__":
    asyncio.run(test_send())
