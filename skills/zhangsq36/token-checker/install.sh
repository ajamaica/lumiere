#!/bin/bash

# 设置cron任务
(crontab -l ; echo "0 */2 * * * /path/to/check_token.sh") | crontab -