#!/bin/bash

# NAS电影下载 - 配置测试脚本

set -e

echo "=== NAS电影下载配置测试 ==="
echo ""

# 默认配置
JACKETT_URL="${JACKETT_URL:-http://192.168.1.246:9117}"
JACKETT_API_KEY="${JACKETT_API_KEY:-o5gp976vq8cm084cqkcv30av9v3e5jpy}"
QB_URL="${QB_URL:-http://192.168.1.246:8888}"
QB_USERNAME="${QB_USERNAME:-admin}"
QB_PASSWORD="${QB_PASSWORD:-adminadmin}"

# 检查依赖工具
echo "🔧 检查依赖工具..."
if ! command -v curl &> /dev/null; then
    echo "❌ curl 未安装"
    exit 1
fi
echo "✅ curl 已安装"

if ! command -v jq &> /dev/null; then
    echo "❌ jq 未安装 (运行: apt-get install jq)"
    exit 1
fi
echo "✅ jq 已安装"

echo ""
echo "🌐 检查服务连接..."
echo ""

# 测试Jackett连接
echo "测试 Jackett 连接..."
echo "URL: $JACKETT_URL"

JACKETT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$JACKETT_URL" 2>&1)

if [[ "$JACKETT_STATUS" -eq 200 || "$JACKETT_STATUS" -eq 301 || "$JACKETT_STATUS" -eq 302 ]]; then
    echo "✅ Jackett 可访问"

    # 检查API密钥
    TEST_URL="$JACKETT_URL/api/v2.0/indexers/all/results?apikey=$JACKETT_API_KEY&Query=test"
    API_TEST=$(curl -s "$TEST_URL" 2>&1)

    if echo "$API_TEST" | jq -e .Results > /dev/null 2>&1; then
        echo "✅ API密钥有效"

        # 检查索引器
        INDEXER_COUNT=$(echo "$API_TEST" | jq '.Indexers | length')
        RESULT_COUNT=$(echo "$API_TEST" | jq '.Results | length')

        echo "   已配置索引器数量: $INDEXER_COUNT"
        if [[ "$INDEXER_COUNT" -eq 0 ]]; then
            echo "⚠️  警告：没有配置索引器，需要在Jackett中添加"
        fi
    else
        echo "❌ API密钥无效或API返回错误"
        echo "   响应: $API_TEST"
    fi
else
    echo "❌ Jackett 无法访问 (HTTP $JACKETT_STATUS)"
fi

echo ""

# 测试qBittorrent连接
echo "测试 qBittorrent 连接..."
echo "URL: $QB_URL"

QB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$QB_URL" 2>&1)

if [[ "$QB_STATUS" -eq 200 || "$QB_STATUS" -eq 403 || "$QB_STATUS" -eq 404 ]]; then
    echo "✅ qBittorrent 可访问"

    # 测试登录
    LOGIN_RESPONSE=$(curl -s -i -X POST \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "username=$QB_USERNAME&password=$QB_PASSWORD" \
        "$QB_URL/api/v2/auth/login" 2>&1)

    if echo "$LOGIN_RESPONSE" | grep -q "200 OK"; then
        echo "✅ qBittorrent 登录成功"
    else
        echo "❌ qBittorrent 登录失败"
        echo "   检查用户名和密码是否正确"
    fi
else
    echo "❌ qBittorrent 无法访问 (HTTP $QB_STATUS)"
fi

echo ""
echo "=== 测试完成 ==="
echo ""
echo "配置信息："
echo "Jackett URL: $JACKETT_URL"
echo "qBittorrent URL: $QB_URL"
echo ""
echo "如果服务无法访问，请检查："
echo "1. 服务是否正在运行"
echo "2. 网络连接是否正常"
echo "3. URL和端口是否正确"
echo "4. 防火墙是否阻止连接"
