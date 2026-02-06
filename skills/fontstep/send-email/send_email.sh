#!/bin/bash
# 发送邮件脚本 - 供 OpenClaw Agent 使用
# 用法: send_email.sh <to> <subject> <body> [attachment] [account]
# account: 163 或 gmail（默认使用 msmtp 默认账户）

TO="$1"
SUBJECT="$2"
BODY="$3"
ATTACHMENT="$4"
ACCOUNT="${5:-default}"  # 默认使用 msmtp 配置的默认账户

if [ -z "$TO" ] || [ -z "$SUBJECT" ] || [ -z "$BODY" ]; then
    echo "用法: send_email.sh <收件人> <主题> <正文> [附件路径]"
    exit 1
fi

# 创建临时邮件文件
TMP_MAIL=$(mktemp)
{
    echo "To: $TO"
    echo "Subject: $SUBJECT"
    echo "Content-Type: text/plain; charset=UTF-8"
    echo ""
    echo "$BODY"
} > "$TMP_MAIL"

# 如果有附件，使用 mutt 发送（需要安装 mutt）
if [ -n "$ATTACHMENT" ] && [ -f "$ATTACHMENT" ]; then
    if command -v mutt >/dev/null 2>&1; then
        if [ "$ACCOUNT" != "default" ]; then
            mutt -s "$SUBJECT" -a "$ATTACHMENT" -- "$TO" < "$TMP_MAIL" -F ~/.msmtprc
        else
            mutt -s "$SUBJECT" -a "$ATTACHMENT" -- "$TO" < "$TMP_MAIL"
        fi
    else
        echo "警告: 附件功能需要安装 mutt，使用 msmtp 发送无附件版本"
        if [ "$ACCOUNT" != "default" ]; then
            msmtp -a "$ACCOUNT" "$TO" < "$TMP_MAIL"
        else
            msmtp "$TO" < "$TMP_MAIL"
        fi
    fi
else
    # 使用 msmtp 发送
    if [ "$ACCOUNT" != "default" ]; then
        msmtp -a "$ACCOUNT" "$TO" < "$TMP_MAIL"
    else
        msmtp "$TO" < "$TMP_MAIL"
    fi
fi

EXIT_CODE=$?
rm -f "$TMP_MAIL"

if [ $EXIT_CODE -eq 0 ]; then
    echo "邮件发送成功: $TO"
else
    echo "邮件发送失败 (退出码: $EXIT_CODE)"
    exit $EXIT_CODE
fi
