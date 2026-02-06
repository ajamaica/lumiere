#!/bin/bash

# 获取当前会话的token使用情况
TOKEN_STATUS=$(openclaw session_status)

# 发送结果到主会话
echo "$TOKEN_STATUS" | openclaw message --action send --target main --message "$(cat -)"