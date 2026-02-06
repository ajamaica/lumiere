#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
邮件发送脚本 - OpenClaw Skill
支持命令行参数和环境变量配置
"""

import smtplib
import os
import sys
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr

# ========== 配置区域 - 仅从环境变量读取，无默认值 ==========
SMTP_SERVER = os.getenv("EMAIL_SMTP_SERVER")
_port = os.getenv("EMAIL_SMTP_PORT")
SMTP_PORT = int(_port) if _port else None
SENDER_EMAIL = os.getenv("EMAIL_SENDER")
AUTHORIZATION_CODE = os.getenv("EMAIL_SMTP_PASSWORD")
USE_TLS = (os.getenv("EMAIL_USE_TLS") or "false").lower() == "true"
# ===============================================

def send_email(to_email, subject, content, attachment_path=None):
    """发送邮件
    
    Args:
        to_email: 收件人邮箱
        subject: 邮件主题
        content: 邮件正文
        attachment_path: 可选附件路径
    
    Returns:
        bool: 发送是否成功
    """
    if not all([SMTP_SERVER, SMTP_PORT, SENDER_EMAIL, AUTHORIZATION_CODE]):
        print("❌ 错误：请配置环境变量 EMAIL_SMTP_SERVER, EMAIL_SMTP_PORT, EMAIL_SENDER, EMAIL_SMTP_PASSWORD（在 ~/.openclaw/openclaw.json skills.entries.send-email.env）")
        return False

    try:
        # 创建邮件
        if attachment_path and os.path.exists(attachment_path):
            msg = MIMEMultipart()
            msg.attach(MIMEText(content, 'plain', 'utf-8'))
            # 添加附件
            from email.mime.base import MIMEBase
            from email import encoders
            with open(attachment_path, 'rb') as f:
                part = MIMEBase('application', 'octet-stream')
                part.set_payload(f.read())
                encoders.encode_base64(part)
                part.add_header(
                    'Content-Disposition',
                    f'attachment; filename= {os.path.basename(attachment_path)}'
                )
                msg.attach(part)
        else:
            msg = MIMEMultipart()
            msg.attach(MIMEText(content, 'plain', 'utf-8'))

        msg['From'] = formataddr(["OpenClaw", SENDER_EMAIL])
        msg['To'] = to_email
        msg['Subject'] = subject

        # 连接SMTP服务器并发送
        if USE_TLS:
            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
            server.starttls()
        else:
            server = smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT)
        
        server.login(SENDER_EMAIL, AUTHORIZATION_CODE)
        server.sendmail(SENDER_EMAIL, [to_email], msg.as_string())
        server.quit()

        print(f"✅ 邮件已成功发送到: {to_email}")
        if attachment_path:
            print(f"   附件: {os.path.basename(attachment_path)}")
        return True

    except Exception as e:
        print(f"❌ 发送失败: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("用法: send_email.py <收件人> <主题> <正文> [附件路径]")
        print("\n环境变量:")
        print("  EMAIL_SMTP_SERVER     SMTP 服务器（必填）")
        print("  EMAIL_SMTP_PORT       SMTP 端口（必填）")
        print("  EMAIL_SENDER          发件人邮箱（必填）")
        print("  EMAIL_SMTP_PASSWORD   授权码/密码（必填）")
        print("  EMAIL_USE_TLS          true 使用 TLS，否则 SSL（可选）")
        sys.exit(1)
    
    to_email = sys.argv[1]
    subject = sys.argv[2]
    content = sys.argv[3]
    attachment = sys.argv[4] if len(sys.argv) > 4 else None
    
    success = send_email(to_email, subject, content, attachment)
    sys.exit(0 if success else 1)
