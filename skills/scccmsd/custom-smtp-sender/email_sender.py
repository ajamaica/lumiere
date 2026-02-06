import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
import json
import os

CONFIG_PATH = "/home/bb/.openclaw/smtp-config.json"

# Load SMTP configuration
def load_config():
    with open(CONFIG_PATH, 'r') as f:
        return json.load(f)

# Send an email
def send_email(to_email, subject, body, html=False, body_file=None, attachments=[]):
    config = load_config()

    # Set up email server
    server = smtplib.SMTP_SSL(config['server'], config['port']) if config.get('useTLS') else smtplib.SMTP(config['server'], config['port'])
    server.login(config['username'], config['password'])

    # Prepare the email
    msg = MIMEMultipart()
    msg['From'] = config['emailFrom']
    msg['To'] = to_email
    msg['Subject'] = subject

    # Attach the body or read from body file
    if body_file:
        with open(body_file, 'r') as file:
            body_content = file.read()
        msg.attach(MIMEText(body_content, 'html' if html else 'plain'))
    else:
        msg.attach(MIMEText(body, 'html' if html else 'plain'))

    # Attach files
    for file_path in attachments:
        with open(file_path, 'rb') as attachment:
            mime_part = MIMEBase('application', 'octet-stream')
            mime_part.set_payload(attachment.read())
            encoders.encode_base64(mime_part)
            mime_part.add_header('Content-Disposition', f'attachment; filename={os.path.basename(file_path)}')
            msg.attach(mime_part)

    # Send the email
    server.send_message(msg)
    server.quit()

# Example usage
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Send an email via SMTP")
    parser.add_argument('--to', required=True, help="Recipient email address")
    parser.add_argument('--subject', required=True, help="Subject of the email")
    parser.add_argument('--body', help="Body text of the email")
    parser.add_argument('--body-file', help="Path to HTML or text file for email body")
    parser.add_argument('--html', action='store_true', help="Send as HTML email")
    parser.add_argument('--attachments', nargs='*', help="List of file paths to attach")

    args = parser.parse_args()

    if not args.body and not args.body_file:
        parser.error("Either --body or --body-file must be provided")

    send_email(
        to_email=args.to,
        subject=args.subject,
        body=args.body,
        body_file=args.body_file,
        html=args.html,
        attachments=args.attachments or []
    )