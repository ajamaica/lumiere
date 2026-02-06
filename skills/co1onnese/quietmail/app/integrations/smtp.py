"""
SMTP client for sending emails
"""
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from ..config import settings


async def send_email(
    from_email: str,
    from_password: str,
    to: str,
    subject: str,
    text: str,
    html: Optional[str] = None,
    reply_to: Optional[str] = None
) -> None:
    """
    Send an email via SMTP
    
    Args:
        from_email: Sender email address
        from_password: Sender mailbox password
        to: Recipient email address
        subject: Email subject
        text: Plain text body
        html: HTML body (optional)
        reply_to: Reply-to address (optional)
    
    Raises:
        aiosmtplib.SMTPException if sending fails
    """
    # Create message
    if html:
        msg = MIMEMultipart('alternative')
        msg.attach(MIMEText(text, 'plain', 'utf-8'))
        msg.attach(MIMEText(html, 'html', 'utf-8'))
    else:
        msg = MIMEText(text, 'plain', 'utf-8')
    
    # Set headers
    msg['Subject'] = subject
    msg['From'] = from_email
    msg['To'] = to
    
    if reply_to:
        msg['Reply-To'] = reply_to
    
    # Send via SMTP with STARTTLS
    await aiosmtplib.send(
        msg,
        hostname=settings.SMTP_HOST,
        port=settings.SMTP_PORT,
        username=from_email,
        password=from_password,
        start_tls=True,  # Use STARTTLS for port 587
        timeout=30
    )
