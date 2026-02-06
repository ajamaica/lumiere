#!/bin/bash
# Lightweight KB - 初始化脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="${SCRIPT_DIR}/../data"
WORKSPACE_DIR="/root/.openclaw/workspace"

echo "=============================================="
echo "  Lightweight KB - 初始化"
echo "=============================================="
echo ""

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查工作目录
check_workspace() {
    echo -e "${BLUE}[1/4] 检查工作目录...${NC}"
    
    if [ ! -d "$WORKSPACE_DIR" ]; then
        echo -e "${RED}  错误: 工作目录不存在: $WORKSPACE_DIR${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}  ✓ 工作目录: $WORKSPACE_DIR${NC}"
}

# 创建目录结构
create_directories() {
    echo -e "${BLUE}[2/4] 创建目录结构...${NC}"
    
    mkdir -p "${WORKSPACE_DIR}/memory/kb/nodes"
    mkdir -p "${WORKSPACE_DIR}/outputs"
    mkdir -p "${WORKSPACE_DIR}/temp"
    
    echo -e "${GREEN}  ✓ 已创建目录:${NC}"
    echo -e "${GREEN}      - memory/kb/nodes/${NC}"
    echo -e "${GREEN}      - outputs/${NC}"
    echo -e "${GREEN}      - temp/${NC}"
}

# 初始化数据文件
init_data_files() {
    echo -e "${BLUE}[3/4] 初始化数据文件...${NC}"
    
    # user_profile.json
    if [ ! -f "${DATA_DIR}/user_profile.json" ]; then
        cat > "${DATA_DIR}/user_profile.json" << 'EOF'
{
  "version": "1.0",
  "updated_at": "2026-02-05T01:00:00Z",
  "user": {
    "name": "老铁",
    "timezone": "UTC+8",
    "location": "中国",
    "family": {
      "name": "沙雕之家",
      "members": ["老铁", "老婆"]
    }
  },
  "assistant": {
    "name": "狍子",
    "role": "AI 萌妹子助理",
    "identity_file": "IDENTITY.md"
  },
  "traits": {
    "efficiency_oriented": { "weight": 0.9, "description": "效率导向" },
    "architecture_sensitive": { "weight": 0.8, "description": "架构敏感型" },
    "collaborative_review": { "weight": 0.85, "description": "协同复盘偏好" },
    "gradual_expansion": { "weight": 0.75, "description": "渐进扩展倾向" },
    "humor_loving": { "weight": 0.9, "description": "喜欢轻松幽默" }
  },
  "preferences": {
    "communication_style": "direct_data_driven_warm",
    "weekly_review_day": "sunday",
    "deep_talk_time": "21:00"
  },
  "collecting": {
    "interests": [],
    "hobbies": [],
    "breakthroughes": [],
    "value_paths": []
  }
}
EOF
        echo -e "${GREEN}  ✓ user_profile.json${NC}"
    else
        echo -e "${YELLOW}  ⊘ user_profile.json 已存在${NC}"
    fi
    
    # task_rhythm.json
    if [ ! -f "${DATA_DIR}/task_rhythm.json" ]; then
        cat > "${DATA_DIR}/task_rhythm.json" << 'EOF'
{
  "version": "1.0",
  "updated_at": "2026-02-05T01:00:00Z",
  "daily": [
    { "id": 1, "name": "晨间检查", "time": "08:00", "action": "check_rhythm", "enabled": true }
  ],
  "weekly": [
    { "id": 35, "name": "综合复盘", "day": "sunday", "time": "20:00", "action": "weekly_review", "enabled": true },
    { "id": 36, "name": "深度了解对话", "day": "sunday", "time": "21:00", "action": "deep_dialogue", "enabled": true }
  ],
  "automated": [
    { "id": 92, "name": "凌晨优化任务", "cron": "0 1 * * *", "action": "daily_evolve", "enabled": true }
  ]
}
EOF
        echo -e "${GREEN}  ✓ task_rhythm.json${NC}"
    else
        echo -e "${YELLOW}  ⊘ task_rhythm.json 已存在${NC}"
    fi
    
    # kb_index.json
    if [ ! -f "${DATA_DIR}/kb_index.json" ]; then
        cat > "${DATA_DIR}/kb_index.json" << 'EOF'
{
  "version": "1.0",
  "updated_at": "2026-02-05T01:00:00Z",
  "categories": {
    "semantic": { "path": "memory/semantic/", "description": "知识库：已知事实" },
    "procedural": { "path": "memory/procedural/", "description": "流程库：如何执行" },
    "episodic": { "path": "memory/episodic/", "description": "事件库：发生了什么" }
  },
  "knowledge_graph_nodes": { "path": "memory/kb/nodes/", "nodes": [] }
}
EOF
        echo -e "${GREEN}  ✓ kb_index.json${NC}"
    else
        echo -e "${YELLOW}  ⊘ kb_index.json 已存在${NC}"
    fi
}

# 验证安装
verify_installation() {
    echo -e "${BLUE}[4/4] 验证安装...${NC}"
    
    local success=true
    
    # 检查必要文件
    for file in "${DATA_DIR}/user_profile.json" \
               "${DATA_DIR}/task_rhythm.json" \
               "${DATA_DIR}/kb_index.json" \
               "${SCRIPT_DIR}/query.sh" \
               "${SCRIPT_DIR}/daily_evolve.sh"; do
        if [ -f "$file" ]; then
            echo -e "${GREEN}  ✓ $(basename $file)${NC}"
        else
            echo -e "${RED}  ✗ $(basename $file) 缺失${NC}"
            success=false
        fi
    done
    
    # 检查目录
    for dir in "${WORKSPACE_DIR}/memory/kb/nodes" \
              "${WORKSPACE_DIR}/outputs" \
              "${WORKSPACE_DIR}/temp"; do
        if [ -d "$dir" ]; then
            echo -e "${GREEN}  ✓ $(basename $dir)/${NC}"
        else
            echo -e "${RED}  ✗ $(basename $dir)/ 缺失${NC}"
            success=false
        fi
    done
    
    echo ""
    if [ "$success" = true ]; then
        echo -e "${GREEN}==============================================${NC}"
        echo -e "${GREEN}  初始化完成！${NC}"
        echo -e "${GREEN}==============================================${NC}"
        echo ""
        echo "快速开始:"
        echo "  bash skills/lightweight-kb/scripts/query.sh all   # 查看知识库"
        echo "  bash skills/lightweight-kb/scripts/query.sh profile # 查询用户"
        echo "  bash skills/lightweight-kb/scripts/daily_evolve.sh # 每日进化"
        echo ""
    else
        echo -e "${RED}==============================================${NC}"
        echo -e "${RED}  初始化失败！${NC}"
        echo -e "${RED}==============================================${NC}"
        exit 1
    fi
}

# 主流程
main() {
    check_workspace
    create_directories
    init_data_files
    verify_installation
}

main "$@"
