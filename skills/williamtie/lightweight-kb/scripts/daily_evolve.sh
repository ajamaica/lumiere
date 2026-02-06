#!/bin/bash
# Lightweight KB - 每日进化脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="${SCRIPT_DIR}/../data"
WORKSPACE_DIR="/root/.openclaw/workspace"
MEMORY_DIR="${WORKSPACE_DIR}/memory"

echo "=============================================="
echo "  Lightweight KB - 每日进化"
echo "  时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=============================================="
echo ""

# 检查依赖
check_dependencies() {
    echo -e "${BLUE}[1/5] 检查依赖...${NC}"
    
    if [ ! -f "${DATA_DIR}/user_profile.json" ]; then
        echo -e "${RED}  错误: user_profile.json 不存在${NC}"
        echo -e "${YELLOW}  请先运行 init.sh 初始化${NC}"
        exit 1
    fi
    
    if [ ! -f "${DATA_DIR}/task_rhythm.json" ]; then
        echo -e "${RED}  错误: task_rhythm.json 不存在${NC}"
        echo -e "${YELLOW}  请先运行 init.sh 初始化${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}  ✓ 依赖检查通过${NC}"
}

# 更新知识图谱
update_knowledge_graph() {
    echo -e "${BLUE}[2/5] 更新知识图谱...${NC}"
    
    # 更新索引文件的时间戳
    local index_file="${DATA_DIR}/kb_index.json"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    if [ -f "$index_file" ]; then
        # 使用 sed 更新时间戳（简单处理）
        sed -i "s/\"updated_at\": \"[^\"]*\"/\"updated_at\": \"${timestamp}\"/g" "$index_file"
        echo -e "${GREEN}  ✓ 知识索引已更新${NC}"
    else
        echo -e "${YELLOW}  ⚠ 索引文件不存在，跳过${NC}"
    fi
    
    # 统计记忆文件
    local md_count=$(find "$MEMORY_DIR" -name "*.md" 2>/dev/null | wc -l)
    echo -e "${GREEN}  ✓ 记忆文件数量: $md_count${NC}"
}

# 任务节奏检查
check_task_rhythm() {
    echo -e "${BLUE}[3/5] 任务节奏检查...${NC}"
    
    local task_file="${DATA_DIR}/task_rhythm.json"
    
    if [ -f "$task_file" ]; then
        echo -e "${GREEN}  ✓ 任务节奏表存在${NC}"
        
        # 检查自动化任务
        local auto_count=$(grep -c '"enabled": true' "$task_file" 2>/dev/null || echo "0")
        echo -e "${GREEN}  ✓ 启用的任务数: $auto_count${NC}"
    else
        echo -e "${YELLOW}  ⚠ 任务节奏表不存在${NC}"
    fi
}

# 方法论沉淀
沉淀_methodology() {
    echo -e "${BLUE}[4/5] 方法论沉淀...${NC}"
    
    # 检查是否有新的任务案例需要沉淀
    local nodes_dir="${WORKSPACE_DIR}/memory/kb/nodes"
    
    if [ -d "$nodes_dir" ]; then
        local node_count=$(find "$nodes_dir" -name "*.json" 2>/dev/null | wc -l)
        echo -e "${GREEN}  ✓ 知识节点数: $node_count${NC}"
    else
        echo -e "${YELLOW}  ⚠ 节点目录不存在，尝试创建...${NC}"
        mkdir -p "$nodes_dir"
        echo -e "${GREEN}  ✓ 已创建节点目录${NC}"
    fi
}

# 用户画像更新
update_user_profile() {
    echo -e "${BLUE}[5/5] 用户画像更新...${NC}"
    
    local profile_file="${DATA_DIR}/user_profile.json"
    
    if [ -f "$profile_file" ]; then
        # 更新时间戳
        local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
        sed -i "s/\"updated_at\": \"[^\"]*\"/\"updated_at\": \"${timestamp}\"/g" "$profile_file"
        echo -e "${GREEN}  ✓ 用户画像已更新${NC}"
    else
        echo -e "${YELLOW}  ⚠ 用户画像不存在${NC}"
    fi
}

# 生成报告
generate_report() {
    echo ""
    echo "=============================================="
    echo -e "${GREEN}  每日进化完成！${NC}"
    echo "=============================================="
    echo ""
    echo "下一步:"
    echo "  - 检查 outputs/ 目录查看生成的报告"
    echo "  - 查看 memory/kb/nodes/ 新增的节点"
    echo ""
    echo "可用命令:"
    echo "  bash skills/lightweight-kb/scripts/query.sh all   # 查看完整索引"
    echo "  bash skills/lightweight-kb/scripts/query.sh profile # 查询用户画像"
    echo ""
}

# 主流程
main() {
    check_dependencies
    update_knowledge_graph
    check_task_rhythm
    沉淀_methodology
    update_user_profile
    generate_report
}

main "$@"
