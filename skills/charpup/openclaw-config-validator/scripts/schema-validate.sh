#!/bin/bash
#
# Schema 一致性验证脚本
#
# 用途: 对比 SCHEMA.md 与实际配置，检测偏差
# 建议每周运行一次，或 OpenClaw 升级后运行
#
# 使用方法:
#   /root/.openclaw/workspace/scripts/schema-validate.sh
#   /root/.openclaw/workspace/scripts/schema-validate.sh --report
#

set -e

CONFIG_FILE="${HOME}/.openclaw/openclaw.json"
SCHEMA_FILE="/root/.openclaw/workspace/reference/SCHEMA.md"
REPORT_FILE="/tmp/schema-validation-$(date +%Y%m%d-%H%M%S).md"
VERBOSE=false
GENERATE_REPORT=false

# 解析参数
while [[ $# -gt 0 ]]; do
  case $1 in
    --report)
      GENERATE_REPORT=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    *)
      echo "未知参数: $1"
      echo "用法: $0 [--report] [--verbose]"
      exit 1
      ;;
  esac
done

# 检查依赖
if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "❌ 错误: 配置文件不存在: $CONFIG_FILE"
  exit 1
fi

if [[ ! -f "$SCHEMA_FILE" ]]; then
  echo "❌ 错误: SCHEMA.md 不存在: $SCHEMA_FILE"
  echo "   请先运行 Phase 1 创建 SCHEMA.md"
  exit 1
fi

if ! command -v jq &> /dev/null; then
  echo "❌ 错误: 需要安装 jq"
  exit 1
fi

echo "🔍 Schema 一致性验证"
echo "===================="
echo ""
echo "配置文件: $CONFIG_FILE"
echo "Schema 文件: $SCHEMA_FILE"
echo "验证时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 提取当前配置的顶级节点
echo "📊 步骤 1: 提取当前配置节点..."
CURRENT_NODES=$(jq -r 'keys[]' "$CONFIG_FILE" | sort)
if [[ "$VERBOSE" == true ]]; then
  echo "当前节点:"
  echo "$CURRENT_NODES" | sed 's/^/  - /'
fi

# 从 SCHEMA.md 提取有效节点（通过解析 markdown）
echo "📋 步骤 2: 解析 SCHEMA.md..."
SCHEMA_NODES=$(grep -E '^\| `[^`]+` \|' "$SCHEMA_FILE" | \
  grep -v "节点" | \
  sed 's/| `\([^`]*\)` |.*/\1/' | \
  sort | uniq)

if [[ "$VERBOSE" == true ]]; then
  echo "Schema 定义节点:"
  echo "$SCHEMA_NODES" | sed 's/^/  - /'
fi

# 对比检测
echo "🔎 步骤 3: 对比检测..."
echo ""

ISSUES_FOUND=0

# 检测 1: 配置中有但 SCHEMA.md 中没有的节点
echo "检测 1: 配置中额外节点（可能未记录的新字段）"
EXTRA_NODES=$(comm -23 <(echo "$CURRENT_NODES") <(echo "$SCHEMA_NODES"))
if [[ -n "$EXTRA_NODES" ]]; then
  echo "⚠️  发现以下节点在配置中存在，但 SCHEMA.md 未记录:"
  echo "$EXTRA_NODES" | sed 's/^/  - /'
  ISSUES_FOUND=$((ISSUES_FOUND + $(echo "$EXTRA_NODES" | wc -l)))
else
  echo "✅ 无额外节点"
fi
echo ""

# 检测 2: SCHEMA.md 中有但配置中没有的节点
echo "检测 2: Schema 定义但未使用的节点"
MISSING_NODES=$(comm -13 <(echo "$CURRENT_NODES") <(echo "$SCHEMA_NODES"))
if [[ -n "$MISSING_NODES" ]]; then
  echo "ℹ️  以下节点在 SCHEMA.md 中定义，但当前配置未使用:"
  echo "$MISSING_NODES" | sed 's/^/  - /'
  echo "  （这通常正常，表示这些字段尚未配置）"
else
  echo "✅ 所有定义的节点都在配置中使用"
fi
echo ""

# 检测 3: 检查禁止字段
echo "检测 3: 禁止字段检查"
FORBIDDEN_FIELDS=("web" "server" "database" "cache" "logging")
FORBIDDEN_FOUND=0

for field in "${FORBIDDEN_FIELDS[@]}"; do
  if jq -e ".${field}" "$CONFIG_FILE" > /dev/null 2>&1; then
    echo "❌ 发现禁止字段: $field"
    FORBIDDEN_FOUND=$((FORBIDDEN_FOUND + 1))
  fi
done

if [[ $FORBIDDEN_FOUND -eq 0 ]]; then
  echo "✅ 未发现禁止字段"
else
  ISSUES_FOUND=$((ISSUES_FOUND + FORBIDDEN_FOUND))
fi
echo ""

# 检测 4: 配置有效性验证
echo "检测 4: OpenClaw 配置验证"
if command -v openclaw &> /dev/null; then
  if openclaw doctor > /tmp/doctor-output.txt 2>&1; then
    echo "✅ openclaw doctor: 配置有效"
  else
    echo "❌ openclaw doctor: 配置无效"
    echo "错误信息:"
    cat /tmp/doctor-output.txt | sed 's/^/  /'
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
  fi
else
  echo "⚠️  openclaw 命令未找到，跳过验证"
fi
echo ""

# 生成报告
if [[ "$GENERATE_REPORT" == true ]]; then
  cat > "$REPORT_FILE" << EOF
# Schema 一致性验证报告

**验证时间**: $(date '+%Y-%m-%d %H:%M:%S')  
**配置文件**: $CONFIG_FILE  
**Schema 文件**: $SCHEMA_FILE  
**OpenClaw 版本**: $(jq -r '.meta.lastTouchedVersion' "$CONFIG_FILE" 2>/dev/null || echo "未知")

---

## 验证结果

**发现问题数**: $ISSUES_FOUND

### 详细发现

#### 1. 配置中的额外节点
$(if [[ -n "$EXTRA_NODES" ]]; then echo "$EXTRA_NODES" | sed 's/^/- /'; else echo "无"; fi)

#### 2. Schema 定义但未使用的节点
$(if [[ -n "$MISSING_NODES" ]]; then echo "$MISSING_NODES" | sed 's/^/- /'; else echo "无"; fi)

#### 3. 禁止字段检查
$(if [[ $FORBIDDEN_FOUND -eq 0 ]]; then echo "✅ 未发现禁止字段"; else echo "❌ 发现 $FORBIDDEN_FOUND 个禁止字段"; fi)

#### 4. OpenClaw 配置验证
$(if command -v openclaw &> /dev/null; then cat /tmp/doctor-output.txt | head -20; else echo "openclaw 命令未找到"; fi)

---

## 建议操作

$(if [[ $ISSUES_FOUND -gt 0 ]]; then
  echo "⚠️ 发现 $ISSUES_FOUND 个问题，建议:"
  echo "1. 审查额外节点是否需要更新 SCHEMA.md"
  echo "2. 如有禁止字段，立即删除"
  echo "3. 修复 openclaw doctor 报告的错误"
else
  echo "✅ 验证通过，配置一致性良好"
fi)

---

*报告生成: schema-validate.sh*
EOF

  echo "📄 报告已生成: $REPORT_FILE"
fi

# 总结
echo "===================="
echo "验证完成"
echo "===================="
echo ""

if [[ $ISSUES_FOUND -eq 0 ]]; then
  echo "✅ 所有检查通过！配置一致性良好。"
  exit 0
else
  echo "⚠️  发现 $ISSUES_FOUND 个问题，请查看上方详情。"
  if [[ "$GENERATE_REPORT" == true ]]; then
    echo "📄 详细报告: $REPORT_FILE"
  fi
  exit 1
fi
