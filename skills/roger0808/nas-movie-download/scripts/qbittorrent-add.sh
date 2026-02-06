#!/bin/bash

# qBittorrent添加种子脚本
# 用途：将磁力链接添加到qBittorrent下载队列

set -e

# 默认配置
QB_URL="${QB_URL:-http://192.168.1.246:8888}"
QB_USERNAME="${QB_USERNAME:-admin}"
QB_PASSWORD="${QB_PASSWORD:-adminadmin}"

# 帮助信息
usage() {
    echo "用法: $0 -m <磁力链接> [-u <qBittorrent URL>] [-n <用户名>] [-p <密码>]"
    echo ""
    echo "参数："
    echo "  -m, --magnet     磁力链接（必需）"
    echo "  -u, --url        qBittorrent URL（默认：$QB_URL）"
    echo "  -n, --username   用户名（默认：$QB_USERNAME）"
    echo "  -p, --password   密码（默认：$QB_PASSWORD）"
    echo "  -h, --help       显示帮助信息"
    echo ""
    echo "示例："
    echo "  $0 -m \"magnet:?xt=urn:btih:...\""
    echo "  $0 -m \"magnet:?xt=urn:btih:...\" -u http://qb:8888 -n admin -p password"
    exit 1
}

# 解析参数
MAGNET_LINK=""
while [[ $# -gt 0 ]]; do
    case $1 in
        -m|--magnet)
            MAGNET_LINK="$2"
            shift 2
            ;;
        -u|--url)
            QB_URL="$2"
            shift 2
            ;;
        -n|--username)
            QB_USERNAME="$2"
            shift 2
            ;;
        -p|--password)
            QB_PASSWORD="$2"
            shift 2
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo "未知参数: $1"
            usage
            ;;
    esac
done

# 检查必需参数
if [[ -z "$MAGNET_LINK" ]]; then
    echo "错误：缺少磁力链接"
    usage
fi

# 清理URL（移除末尾的斜杠）
QB_URL="${QB_URL%/}"

echo "正在添加磁力链接到qBittorrent"
echo "qBittorrent URL: $QB_URL"
echo "用户名: $QB_USERNAME"

# 1. 登录获取会话
echo "正在登录..."
LOGIN_RESPONSE=$(curl -s -i --cookie-jar /tmp/qb-cookies.txt \
    --data "username=$QB_USERNAME&password=$QB_PASSWORD" \
    "$QB_URL/api/v2/auth/login")

# 检查登录是否成功
if ! echo "$LOGIN_RESPONSE" | grep -q "200 OK"; then
    echo "错误：登录失败"
    echo "响应：$LOGIN_RESPONSE"
    rm -f /tmp/qb-cookies.txt
    exit 1
fi

echo "登录成功"

# 2. 添加种子
echo "正在添加种子..."
ADD_RESPONSE=$(curl -s -i --cookie /tmp/qb-cookies.txt \
    --data-urlencode "urls=$MAGNET_LINK" \
    "$QB_URL/api/v2/torrents/add")

# 检查添加是否成功
if echo "$ADD_RESPONSE" | grep -q "200 OK"; then
    echo "✅ 种子添加成功"
else
    echo "❌ 种子添加失败"
    echo "响应：$ADD_RESPONSE"
    rm -f /tmp/qb-cookies.txt
    exit 1
fi

# 3. 清理
rm -f /tmp/qb-cookies.txt

# 4. 显示当前下载队列（可选）
echo ""
echo "当前下载队列："
QUEUE_RESPONSE=$(curl -s -c /tmp/qb-cookies.txt \
    --data "username=$QB_USERNAME&password=$QB_PASSWORD" \
    "$QB_URL/api/v2/auth/login" > /dev/null && \
    curl -s -b /tmp/qb-cookies.txt \
    "$QB_URL/api/v2/torrents/info" | \
    jq -r '.[] | "\(.name) | 进度: \((.progress * 100) | floor)% | 状态: \(.state)"' | head -5)

rm -f /tmp/qb-cookies.txt

echo "$QUEUE_RESPONSE"

exit 0
