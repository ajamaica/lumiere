#!/bin/bash

# NAS电影下载脚本
# 用途：一键搜索并下载最高清版本的电影

set -e

# 配置
JACKETT_URL="${JACKETT_URL:-http://192.168.1.246:9117}"
JACKETT_API_KEY="${JACKETT_API_KEY:-o5gp976vq8cm084cqkcv30av9v3e5jpy}"
QB_URL="${QB_URL:-http://192.168.1.246:8080}"
QB_USERNAME="${QB_USERNAME:-admin}"
QB_PASSWORD="${QB_PASSWORD:-adminadmin}"

# 帮助信息
usage() {
    echo "用法: $0 -q <电影名称> [-u <Jackett URL>] [-k <API密钥>] [-b <qB URL>]"
    echo ""
    echo "参数："
    echo "  -q, --query      电影名称（必需）"
    echo "  -u, --url        Jackett URL（默认：$JACKETT_URL）"
    echo "  -k, --api-key    Jackett API密钥"
    echo "  -b, --qb-url     qBittorrent URL（默认：$QB_URL）"
    echo "  -n, --qb-user    qBittorrent用户名（默认：$QB_USERNAME）"
    echo "  -p, --qb-pass    qBittorrent密码（默认：$QB_PASSWORD）"
    echo "  -h, --help       显示帮助信息"
    echo ""
    echo "示例："
    echo "  $0 -q \"死期将至\""
    echo "  $0 -q \"Inception\" -u http://jackett:9117"
    exit 1
}

# 解析参数
MOVIE_NAME=""
while [[ $# -gt 0 ]]; do
    case $1 in
        -q|--query)
            MOVIE_NAME="$2"
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
        -b|--qb-url)
            QB_URL="$2"
            shift 2
            ;;
        -n|--qb-user)
            QB_USERNAME="$2"
            shift 2
            ;;
        -p|--qb-pass)
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
if [[ -z "$MOVIE_NAME" ]]; then
    echo "错误：缺少电影名称"
    usage
fi

echo "=== NAS电影下载助手 ==="
echo "电影: $MOVIE_NAME"
echo "Jackett: $JACKETT_URL"
echo "qBittorrent: $QB_URL"
echo ""

# 第一步：搜索种子
echo "🔍 正在搜索种子..."

# 构建搜索URL
JACKETT_URL="${JACKETT_URL%/}"
SEARCH_URL="$JACKETT_URL/api/v2.0/indexers/all/results?apikey=$JACKETT_API_KEY&Query=$(echo "$MOVIE_NAME" | jq -sRr @uri)"

echo "搜索URL: $SEARCH_URL"

# 发送搜索请求
SEARCH_RESPONSE=$(curl -s "$SEARCH_URL")

# 检查响应
if [[ -z "$SEARCH_RESPONSE" ]]; then
    echo "❌ 搜索失败：未收到响应"
    exit 1
fi

# 检查结果数量
RESULTS_COUNT=$(echo "$SEARCH_RESPONSE" | jq -r '.Results | length')

if [[ "$RESULTS_COUNT" -eq 0 ]]; then
    echo "❌ 未找到任何结果"
    echo "提示：尝试使用英文电影名称搜索"
    exit 1
fi

echo "✅ 找到 $RESULTS_COUNT 个结果"
echo ""

JSON_PART="$SEARCH_RESPONSE"

if [[ -z "$JSON_PART" ]]; then
    echo "❌ 未找到任何种子"
    exit 1
fi

# 解析JSON并选择最高质量种子
echo ""
echo "📊 正在分析种子质量..."

# 使用jq选择最高质量的种子
BEST_TORRENT=$(echo "$JSON_PART" | jq -r '
    # 定义质量排序函数
    def quality_sort:
        if (.Title | ascii_downcase | contains("4k") or .Title | ascii_downcase | contains("2160p")) then 4
        elif (.Title | ascii_downcase | contains("1080p") or .Title | ascii_downcase | contains("fullhd")) then 3
        elif (.Title | ascii_downcase | contains("720p") or .Title | ascii_downcase | contains("hd")) then 2
        else 1 end;

    # 选择最佳种子
    sort_by(
        # 主要排序：质量
        quality_sort,
        # 次要排序：种子数
        (.Seeders // 0),
        # 最后排序：文件大小
        (.Size | split(" ")[0] | tonumber // 0)
    )
    | reverse | .[0]
')

# 检查是否找到有效种子
if [[ "$BEST_TORRENT" == "null" ]]; then
    echo "❌ 无法解析搜索结果"
    exit 1
fi

# 提取信息
TITLE=$(echo "$BEST_TORRENT" | jq -r '.Title')
MAGNET=$(echo "$BEST_TORRENT" | jq -r '.MagnetUri')
SIZE=$(echo "$BEST_TORRENT" | jq -r '.Size')
SEEDERS=$(echo "$BEST_TORRENT" | jq -r '.Seeders')

echo "✅ 找到最佳种子："
echo "   📽️  标题: $TITLE"
echo "   📏 大小: $SIZE"
echo "   🌱 种子数: $SEEDERS"

if [[ -z "$MAGNET" || "$MAGNET" == "null" ]]; then
    echo "❌ 无法获取磁力链接"
    exit 1
fi

echo ""
echo "🎬 正在添加到下载队列..."

# 第二步：添加到qBittorrent
QB_SCRIPT="$(dirname "$0")/qbittorrent-add.sh"
TEMP_QB_SCRIPT=$(mktemp)
sed -e "s|QB_URL=.*|QB_URL=\"$QB_URL\"|" \
    -e "s|QB_USERNAME=.*|QB_USERNAME=\"$QB_USERNAME\"|" \
    -e "s|QB_PASSWORD=.*|QB_PASSWORD=\"$QB_PASSWORD\"|" \
    "$QB_SCRIPT" > "$TEMP_QB_SCRIPT"
chmod +x "$TEMP_QB_SCRIPT"

if ! "$TEMP_QB_SCRIPT" -m "$MAGNET"; then
    echo "❌ 添加到qBittorrent失败"
    rm -f "$TEMP_QB_SCRIPT"
    exit 1
fi

rm -f "$TEMP_QB_SCRIPT"

echo ""
echo "🎉 下载任务已成功添加！"
echo "📁 文件将自动下载到qBittorrent指定的目录"
echo "🔄 你可以在qBittorrent中监控下载进度"

# 清理临时文件
rm -f /tmp/qb-cookies.txt /temp-script.sh

exit 0
