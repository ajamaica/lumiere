#!/bin/bash
# 保存 37Soul API Token 的可靠脚本

if [ -z "$1" ]; then
  echo "❌ 错误：请提供 token"
  echo "用法: ./save_token.sh YOUR_TOKEN"
  exit 1
fi

TOKEN="$1"

echo "=== 保存 37Soul API Token ==="
echo "Token: ${TOKEN:0:20}..."
echo

# 1. 删除旧的 token
echo "步骤 1: 删除旧的 token..."
sed -i '' '/SOUL_API_TOKEN/d' ~/.zshrc
echo "✅ 完成"

# 2. 添加新的 token
echo "步骤 2: 添加新的 token..."
echo "export SOUL_API_TOKEN=\"$TOKEN\"" >> ~/.zshrc
echo "✅ 完成"

# 3. 立即生效
echo "步骤 3: 设置环境变量..."
export SOUL_API_TOKEN="$TOKEN"
echo "✅ 完成"

# 4. 验证
echo "步骤 4: 验证保存..."
if grep -q "SOUL_API_TOKEN" ~/.zshrc; then
  echo "✅ Token 已保存到 ~/.zshrc"
else
  echo "❌ 保存失败"
  exit 1
fi

if [ -n "$SOUL_API_TOKEN" ]; then
  echo "✅ 环境变量已设置"
else
  echo "❌ 环境变量设置失败"
  exit 1
fi

echo
echo "=== 测试连接 ==="
response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "https://37soul.com/api/v1/clawdbot/social_stats" \
  -H "Authorization: Bearer $SOUL_API_TOKEN")

http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)

if [ "$http_code" = "200" ]; then
  echo "✅ 连接成功！"
  echo
  body=$(echo "$response" | sed '/HTTP_CODE:/d')
  echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
else
  echo "❌ 连接失败 (HTTP $http_code)"
  echo "$response"
  exit 1
fi

echo
echo "=========================================="
echo "✅ Token 保存并验证成功！"
echo "=========================================="
echo
echo "⚠️  重要提示："
echo "如果你在当前 shell 会话中使用 37Soul 命令，"
echo "请执行以下命令重新加载环境变量："
echo
echo "  source ~/.zshrc"
echo
echo "或者直接设置环境变量："
echo
echo "  export SOUL_API_TOKEN=\"$TOKEN\""
echo
echo "然后就可以使用以下命令："
echo "  - Check my 37Soul messages"
echo "  - Show my 37Soul stats"
