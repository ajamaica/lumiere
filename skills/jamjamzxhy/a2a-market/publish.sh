#!/bin/bash
#
# A2A Market Skill - ClawHub 发布脚本
# 在你自己的电脑上运行此脚本
#

set -e

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║       A2A Market Skill - ClawHub 发布工具                 ║"
echo "║       Where agents earn                                    ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 配置
SKILL_NAME="a2a-market"
SKILL_DISPLAY_NAME="A2A Market"
VERSION="1.2.0"
CHANGELOG="v1.2: Add Credits system - agent registration, credits balance, daily rewards, credits payment, and referral program."

# 检查是否在 skill 目录
if [ ! -f "SKILL.md" ]; then
    echo -e "${RED}Error: SKILL.md not found. Please run this script from the skill directory.${NC}"
    echo "Expected structure:"
    echo "  a2a-market-skill/"
    echo "  ├── SKILL.md"
    echo "  ├── scripts/"
    echo "  └── references/"
    exit 1
fi

echo -e "${GREEN}✓ Found SKILL.md${NC}"

# Step 1: 检查/安装 clawhub CLI
echo ""
echo -e "${YELLOW}Step 1: Checking clawhub CLI...${NC}"

if command -v clawhub &> /dev/null; then
    echo -e "${GREEN}✓ clawhub CLI is installed${NC}"
    clawhub --version 2>/dev/null || true
else
    echo -e "${YELLOW}Installing clawhub CLI...${NC}"
    npm install -g clawhub
    echo -e "${GREEN}✓ clawhub CLI installed${NC}"
fi

# Step 2: 登录检查
echo ""
echo -e "${YELLOW}Step 2: Checking authentication...${NC}"

if clawhub whoami &> /dev/null; then
    LOGGED_USER=$(clawhub whoami 2>/dev/null | grep -oP '(?<=Logged in as: ).*' || echo "unknown")
    echo -e "${GREEN}✓ Already logged in as: $LOGGED_USER${NC}"
else
    echo -e "${YELLOW}Not logged in. Starting login...${NC}"
    echo ""
    echo "This will open your browser for GitHub authentication."
    echo -e "Press ${GREEN}Enter${NC} to continue..."
    read
    clawhub login
    echo -e "${GREEN}✓ Login successful${NC}"
fi

# Step 3: 验证 skill 格式
echo ""
echo -e "${YELLOW}Step 3: Validating skill format...${NC}"

# 检查必要文件
ERRORS=0

if ! grep -q "^name:" SKILL.md; then
    echo -e "${RED}✗ Missing 'name' in SKILL.md frontmatter${NC}"
    ERRORS=$((ERRORS + 1))
fi

if ! grep -q "^description:" SKILL.md; then
    echo -e "${RED}✗ Missing 'description' in SKILL.md frontmatter${NC}"
    ERRORS=$((ERRORS + 1))
fi

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}Validation failed with $ERRORS error(s)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Skill format is valid${NC}"

# 显示将要发布的内容
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Will publish:${NC}"
echo "  Slug:      $SKILL_NAME"
echo "  Name:      $SKILL_DISPLAY_NAME"
echo "  Version:   $VERSION"
echo "  Changelog: $CHANGELOG"
echo ""
echo "Files to include:"
find . -type f -name "*.md" -o -name "*.py" -o -name "*.sh" | head -20
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Step 4: 确认发布
echo -e "${YELLOW}Step 4: Confirm publish${NC}"
echo ""
read -p "Publish to ClawHub? (y/N): " confirm

if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Publish cancelled.${NC}"
    exit 0
fi

# Step 5: 发布
echo ""
echo -e "${YELLOW}Step 5: Publishing to ClawHub...${NC}"

clawhub publish . \
    --slug "$SKILL_NAME" \
    --name "$SKILL_DISPLAY_NAME" \
    --version "$VERSION" \
    --changelog "$CHANGELOG"

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    🎉 发布成功！                          ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "查看你的 skill: ${BLUE}https://clawhub.ai/skills/$SKILL_NAME${NC}"
echo ""
echo "用户安装命令:"
echo -e "  ${GREEN}clawhub install $SKILL_NAME${NC}"
echo ""
echo "更新命令 (发布新版本后):"
echo -e "  ${GREEN}clawhub update $SKILL_NAME${NC}"
