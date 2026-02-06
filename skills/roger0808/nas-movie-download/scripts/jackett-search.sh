#!/bin/bash

# Jackett种子搜索脚本
# 用途：通过Jackett API搜索电影种子

set -e

# 默认配置
JACKETT_URL="${JACKETT_URL:-http://192.168.1.246:9117}"
JACKETT_API_KEY="${JACKETT_API_KEY:-o5gp976vq8cm084cqkcv30av9v3e5jpy}"

# 帮助信息
usage() {
    echo "用法: $0 -q <搜索关键词> [-u <Jackett URL>] [-k <API密钥>]"
    echo ""
    echo "参数："
    echo "  -q, --query      搜索关键词（必需）"
    echo "  -u, --url        Jackett URL（默认：$JACKETT_URL）"
    echo "  -k, --api-key    Jackett API密钥"
    echo "  -h, --help       显示帮助信息"
    echo ""
    echo "示例："
    echo "  $0 -q \"死期将至\""
    echo "  $0 -q \"Inception\" -u http://jackett:9117"
    exit 1
}

# 解析参数
QUERY=""
while [[ $# -gt 0 ]]; do
    case $1 in
        -q|--query)
            QUERY="$2"
            shift 2
            ;;
        -u|--url)
            JACKETT_URL="$2"
            shift 2
            ;;
        -k|--api-key)
            JACKETT_API_KEY="$2"
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
if [[ -z "$QUERY" ]]; then
    echo "错误：缺少搜索关键词"
    usage
fi

# 清理URL（移除末尾的斜杠）
JACKETT_URL="${JACKETT_URL%/}"

echo "正在搜索: $QUERY"
echo "Jackett URL: $JACKETT_URL"

# 构建API请求URL
SEARCH_URL="$JACKETT_URL/api/v2.0/indexers/all/results?apikey=$JACKETT_API_KEY&Query=$(echo "$QUERY" | jq -sRr @uri)"

echo "搜索URL: $SEARCH_URL"

# 发送搜索请求
RESPONSE=$(curl -s "$SEARCH_URL")

# 检查响应
if [[ -z "$RESPONSE" ]]; then
    echo "错误：未收到响应"
    exit 1
fi

# 检查是否是JSON错误
if echo "$RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    ERROR_MSG=$(echo "$RESPONSE" | jq -r '.error')
    echo "API错误: $ERROR_MSG"
    exit 1
fi

# 解析结果
RESULTS=$(echo "$RESPONSE" | jq -r '.Results | length')

if [[ "$RESULTS" -eq 0 ]]; then
    echo "没有找到任何结果"
    exit 0
fi

echo "找到 $RESULTS 个结果"
echo ""

# 显示结果并按质量排序
echo "=== 搜索结果（按质量排序）==="
echo ""

# 输出原始JSON供进一步处理
echo "$RESPONSE" | jq -r '.Results | sort_by(.Size) | reverse | .[] | "\(.Title) | 大小: \(.Size // "N/A") | 种子数: \(.Seeders // 0) | 磁力: \(.MagnetUri // "N/A")"' | head -20

# 也可以输出完整的JSON供其他脚本使用
echo ""
echo "=== 完整结果（JSON格式）==="
echo "$RESPONSE"

exit 0
