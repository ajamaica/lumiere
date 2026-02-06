#!/usr/bin/env python3
import os
import sys
import imaplib
import smtplib
import email
import argparse
from email.header import decode_header
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def get_creds():
    user = os.environ.get("GMAIL_USER")
    password = os.environ.get("GMAIL_PASS")
    if not user or not password:
        print("Error: GMAIL_USER and GMAIL_PASS environment variables required.")
        sys.exit(1)
    return user, password

def clean_text(text):
    # Basic cleanup
    return "".join(filter(lambda x: x.isprintable(), text))

def cmd_list(limit=5):
    user, password = get_creds()
    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(user, password)
        mail.select("inbox")

        status, messages = mail.search(None, "UNSEEN")
        if status != "OK":
            print("No new messages.")
            return

        email_ids = messages[0].split()
        if not email_ids:
            print("No unread messages.")
            return

        # Get latest first
        latest_ids = email_ids[-limit:]
        
        print(f"Found {len(email_ids)} unread messages. Showing last {len(latest_ids)}:")
        
        for e_id in reversed(latest_ids):
            _, msg_data = mail.fetch(e_id, "(RFC822)")
            for response_part in msg_data:
                if isinstance(response_part, tuple):
                    msg = email.message_from_bytes(response_part[1])
                    subject, encoding = decode_header(msg["Subject"])[0]
                    if isinstance(subject, bytes):
                        subject = subject.decode(encoding if encoding else "utf-8")
                    
                    frm = msg.get("From")
                    print(f"[{e_id.decode()}] From: {frm} | Subject: {subject}")
                    
        mail.close()
        mail.logout()
    except Exception as e:
        print(f"Error: {e}")

def cmd_read(email_id):
    user, password = get_creds()
    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(user, password)
        mail.select("inbox")
        
        _, msg_data = mail.fetch(email_id, "(RFC822)")
        raw_email = msg_data[0][1]
        msg = email.message_from_bytes(raw_email)
        
        subject, encoding = decode_header(msg["Subject"])[0]
        if isinstance(subject, bytes):
            subject = subject.decode(encoding if encoding else "utf-8")
            
        print(f"From: {msg['From']}")
        print(f"Subject: {subject}")
        print("--- Body ---")
        
        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                if content_type == "text/plain":
                    body = part.get_payload(decode=True).decode()
                    print(body)
                    break
        else:
            print(msg.get_payload(decode=True).decode())
            
        mail.close()
        mail.logout()
    except Exception as e:
        print(f"Error: {e}")

def cmd_send(to, subject, body):
    user, password = get_creds()
    msg = MIMEMultipart()
    msg['From'] = user
    msg['To'] = to
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))
    
    try:
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(user, password)
        text = msg.as_string()
        server.sendmail(user, to, text)
        server.quit()
        print("Email sent successfully.")
    except Exception as e:
        print(f"Error sending email: {e}")

def main():
    parser = argparse.ArgumentParser(description="Simple Gmail Client")
    subparsers = parser.add_subparsers(dest="command", required=True)
    
    list_parser = subparsers.add_parser("list", help="List unread emails")
    list_parser.add_argument("--limit", type=int, default=5, help="Limit results")
    
    read_parser = subparsers.add_parser("read", help="Read email by ID")
    read_parser.add_argument("id", help="Email ID")
    
    send_parser = subparsers.add_parser("send", help="Send email")
    send_parser.add_argument("to", help="Recipient")
    send_parser.add_argument("subject", help="Subject")
    send_parser.add_argument("body", help="Body")

    args = parser.parse_args()
    
    if args.command == "list":
        cmd_list(args.limit)
    elif args.command == "read":
        cmd_read(args.id)
    elif args.command == "send":
        cmd_send(args.to, args.subject, args.body)

if __name__ == "__main__":
    main()
