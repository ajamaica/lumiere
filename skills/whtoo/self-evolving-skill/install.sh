#!/bin/bash
# Self-Evolving Skill - 技能安装脚本

set -e

echo "=========================================="
echo "Self-Evolving Skill - 技能安装"
echo "=========================================="

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPENCLAW_SKILLS="$HOME/.openclaw/skills"

# 创建OpenClaw skills目录
mkdir -p "$OPENCLAW_SKILLS"

# 创建链接
ln -sf "$SKILL_DIR" "$OPENCLAW_SKILLS/self-evolving-skill"

# 复制Python适配器
cp "$SKILL_DIR/mcporter_adapter.py" "$OPENCLAW_SKILLS/self-evolving-skill/"

# 创建存储目录
mkdir -p "$SKILL_DIR/storage"
mkdir -p "$HOME/.openclaw/self-evolving-skill"

echo ""
echo "✅ 技能已安装!"
echo ""
echo "文件位置:"
echo "  技能目录: $OPENCLAW_SKILLS/self-evolving-skill"
echo "  数据存储: $SKILL_DIR/storage"
echo ""
echo "使用方式:"
echo "  # 列出Skills"
echo "  python3 mcporter_adapter.py skill_list '{}'"
echo ""
echo "  # 创建Skill"
echo "  python3 mcporter_adapter.py skill_create '{\"name\":\"Test\"}'"
echo ""
echo "  # 分析嵌入"
echo "  python3 mcporter_adapter.py skill_analyze '{\"embedding\":[0.1,0.2]}'"
