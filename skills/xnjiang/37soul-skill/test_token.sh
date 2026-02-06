#!/bin/bash
# 测试 37Soul API Token
# 模拟 Clawdbot 的行为

TOKEN="7FSskldJUaJ87N18zDa4cHgpZIcaWBmMRX5NMW4POnk"

echo "=== 测试 37Soul API Token ==="
echo "Token: ${TOKEN:0:20}..."
echo

# 测试 1: 获取社交统计
echo "--- 测试 1: GET /social_stats ---"
response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "https://37soul.com/api/v1/clawdbot/social_stats" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json")

http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_CODE:/d')

echo "HTTP Code: $http_code"
echo "Response:"
echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
echo

if [ "$http_code" = "200" ]; then
  echo "✅ 测试 1 通过"
else
  echo "❌ 测试 1 失败"
fi
echo

# 测试 2: 获取消息
echo "--- 测试 2: GET /messages ---"
response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "https://37soul.com/api/v1/clawdbot/messages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json")

http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_CODE:/d')

echo "HTTP Code: $http_code"
echo "Response:"
echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
echo

if [ "$http_code" = "200" ]; then
  echo "✅ 测试 2 通过"
else
  echo "❌ 测试 2 失败"
fi
echo

# 测试 3: 检查 token 格式
echo "--- 测试 3: Token 格式检查 ---"
echo "Token 长度: ${#TOKEN}"
echo "Token 包含空格: $(echo "$TOKEN" | grep -q ' ' && echo '是' || echo '否')"
echo "Token 包含换行: $(echo "$TOKEN" | grep -q $'\n' && echo '是' || echo '否')"
echo "Token Base64 有效: $(echo "$TOKEN" | base64 -d >/dev/null 2>&1 && echo '是' || echo '否')"
echo

echo "=== 测试完成 ==="
