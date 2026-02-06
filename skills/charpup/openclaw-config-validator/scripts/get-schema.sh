#!/bin/bash
#
# OpenClaw 2026.2.1 运行时 Schema 提取脚本
# 
# 用途: 从当前运行配置提取有效的 schema 结构
# 作为 SCHEMA.md 的实时验证补充
#
# 使用方法:
#   /root/.openclaw/workspace/scripts/get-schema.sh
#   /root/.openclaw/workspace/scripts/get-schema.sh > /tmp/runtime-schema.md
#

set -e

CONFIG_FILE="${HOME}/.openclaw/openclaw.json"
OUTPUT_FILE="/tmp/runtime-schema-$(date +%Y%m%d-%H%M%S).md"

# 检查配置文件是否存在
if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "❌ 错误: 配置文件不存在: $CONFIG_FILE"
    exit 1
fi

# 检查 jq 是否安装
if ! command -v jq &> /dev/null; then
    echo "❌ 错误: 需要安装 jq"
    echo "   安装命令: apt-get install jq 或 yum install jq"
    exit 1
fi

# 开始生成报告
cat > "$OUTPUT_FILE" << 'HEADER'
# OpenClaw 2026.2.1 运行时 Schema 报告

**生成时间**: GENERATE_TIME
**配置文件**: CONFIG_PATH
**OpenClaw 版本**: $(jq -r '.meta.lastTouchedVersion' "$CONFIG_FILE" 2>/dev/null || echo "未知")

---

## 执行摘要

本报告从当前运行的 OpenClaw 配置中提取实际的 schema 结构。
**注意**: 这反映了当前配置中实际存在的字段，而非理论上支持的所有字段。

HEADER

# 替换变量
sed -i "s/GENERATE_TIME/$(date '+%Y-%m-%d %H:%M:%S')/" "$OUTPUT_FILE"
sed -i "s|CONFIG_PATH|$CONFIG_FILE|" "$OUTPUT_FILE"

# 提取 OpenClaw 版本
OPENCLAW_VERSION=$(jq -r '.meta.lastTouchedVersion' "$CONFIG_FILE" 2>/dev/null || echo "未知")
echo "" >> "$OUTPUT_FILE"
echo "**检测到的版本**: $OPENCLAW_VERSION" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Section 1: 顶级节点
cat >> "$OUTPUT_FILE" << 'SECTION1'

## 1. 顶级配置节点

当前配置中包含以下顶级节点：

SECTION1

echo "" >> "$OUTPUT_FILE"
echo "| 节点 | 类型 | 状态 |" >> "$OUTPUT_FILE"
echo "|------|------|------|" >> "$OUTPUT_FILE"

# 提取并列出所有顶级节点
jq -r 'keys[]' "$CONFIG_FILE" | while read -r key; do
    node_type=$(jq --arg k "$key" '.[$k] | type' "$CONFIG_FILE")
    echo "| \`$key\` | $node_type | ✅ 存在 |" >> "$OUTPUT_FILE"
done

# Section 2: 详细结构
cat >> "$OUTPUT_FILE" << 'SECTION2'

## 2. 各节点详细结构

SECTION2

# 为每个顶级节点生成详细结构
jq -r 'keys[]' "$CONFIG_FILE" | while read -r key; do
    echo "" >> "$OUTPUT_FILE"
    echo "### $key" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo "\`\`\`json" >> "$OUTPUT_FILE"
    jq --arg k "$key" '.[$k]' "$CONFIG_FILE" | head -50 >> "$OUTPUT_FILE"
    echo "\`\`\`" >> "$OUTPUT_FILE"
done

# Section 3: 配置验证
cat >> "$OUTPUT_FILE" << 'SECTION3'

## 3. 配置验证状态

SECTION3

echo "" >> "$OUTPUT_FILE"
echo "运行 \`openclaw doctor\` 验证配置..." >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# 运行 openclaw doctor 并捕获输出
if command -v openclaw &> /dev/null; then
    echo "\`\`\`" >> "$OUTPUT_FILE"
    openclaw doctor 2>&1 | head -100 >> "$OUTPUT_FILE" || echo "验证命令执行失败" >> "$OUTPUT_FILE"
    echo "\`\`\`" >> "$OUTPUT_FILE"
else
    echo "⚠️ \`openclaw\` 命令未找到，跳过验证" >> "$OUTPUT_FILE"
fi

# Section 4: 与 SCHEMA.md 对比
cat >> "$OUTPUT_FILE" << 'SECTION4'

## 4. 与 SCHEMA.md 对比

SCHEMA.md 路径: `/root/.openclaw/workspace/reference/SCHEMA.md`

对比说明:
- 如果本报告中存在 SCHEMA.md 中未列出的节点 → SCHEMA.md 可能过时，需要更新
- 如果 SCHEMA.md 中存在本报告中未列出的节点 → 这些字段可能尚未在当前配置中使用，但理论上有效

SECTION4

# Section 5: 系统信息
cat >> "$OUTPUT_FILE" << 'SECTION5'

## 5. 系统信息

SECTION5

echo "" >> "$OUTPUT_FILE"
echo "- **主机名**: $(hostname)" >> "$OUTPUT_FILE"
echo "- **操作系统**: $(uname -s) $(uname -r)" >> "$OUTPUT_FILE"
echo "- **配置文件大小**: $(du -h "$CONFIG_FILE" | cut -f1)" >> "$OUTPUT_FILE"
echo "- **配置文件修改时间**: $(stat -c '%y' "$CONFIG_FILE" 2>/dev/null || stat -f '%Sm' "$CONFIG_FILE" 2>/dev/null || echo '未知')" >> "$OUTPUT_FILE"

# Footer
cat >> "$OUTPUT_FILE" << 'FOOTER'

---

## 使用建议

1. **对比 SCHEMA.md**: 将此报告与 `/root/.openclaw/workspace/reference/SCHEMA.md` 对比
2. **发现差异**: 如有字段不一致，更新 SCHEMA.md
3. **验证配置**: 运行 `openclaw doctor` 确保配置有效

## 文件位置

- **本报告**: OUTPUT_FILE
- **配置文件**: CONFIG_FILE
- **Schema 文档**: /root/.openclaw/workspace/reference/SCHEMA.md

FOOTER

# 替换变量
sed -i "s|OUTPUT_FILE|$OUTPUT_FILE|" "$OUTPUT_FILE"
sed -i "s|CONFIG_FILE|$CONFIG_FILE|" "$OUTPUT_FILE"

# 输出结果
echo "✅ 运行时 Schema 报告已生成"
echo ""
echo "📄 报告位置: $OUTPUT_FILE"
echo ""
echo "📝 报告内容预览:"
echo "=================================================="
head -30 "$OUTPUT_FILE"
echo "=================================================="
echo ""
echo "💡 使用建议:"
echo "   cat $OUTPUT_FILE"
echo "   # 或"
echo "   cat $OUTPUT_FILE | less"

# 同时输出到 stdout 方便管道使用
cat "$OUTPUT_FILE"
