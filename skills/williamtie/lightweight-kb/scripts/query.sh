#!/bin/bash
# Lightweight KB - 查询脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="${SCRIPT_DIR}/../data"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_usage() {
    echo "用法: bash query.sh <类型> [查询词]"
    echo ""
    echo "类型:"
    echo "  profile [关键词]    - 查询用户画像"
    echo "  task [关键词]        - 查询任务节奏"
    echo "  index               - 查看知识库索引"
    echo "  all                 - 显示完整索引"
    echo ""
    echo "示例:"
    echo "  bash query.sh profile 效率"
    echo "  bash query.sh task 复盘"
    echo "  bash query.sh index"
}

query_profile() {
    local keyword="$1"
    local profile_file="${DATA_DIR}/user_profile.json"
    
    if [ ! -f "$profile_file" ]; then
        echo -e "${RED}错误: user_profile.json 不存在${NC}"
        return 1
    fi
    
    echo -e "${BLUE}=== 用户画像查询: $keyword${NC}"
    echo ""
    
    if [ -z "$keyword" ]; then
        # 显示完整画像
        cat "$profile_file"
    else
        # 模糊查询
        grep -i "$keyword" "$profile_file" || echo "未找到匹配项"
    fi
}

query_task() {
    local keyword="$1"
    local task_file="${DATA_DIR}/task_rhythm.json"
    
    if [ ! -f "$task_file" ]; then
        echo -e "${RED}错误: task_rhythm.json 不存在${NC}"
        return 1
    fi
    
    echo -e "${BLUE}=== 任务节奏查询: $keyword${NC}"
    echo ""
    
    if [ -z "$keyword" ]; then
        # 显示完整节奏表
        cat "$task_file"
    else
        # 模糊查询
        grep -i "$keyword" "$task_file" || echo "未找到匹配项"
    fi
}

show_index() {
    local index_file="${DATA_DIR}/kb_index.json"
    
    if [ ! -f "$index_file" ]; then
        echo -e "${RED}错误: kb_index.json 不存在${NC}"
        return 1
    fi
    
    echo -e "${BLUE}=== 知识库索引${NC}"
    echo ""
    
    # 使用 jq 格式化输出（如果可用）
    if command -v jq &> /dev/null; then
        cat "$index_file" | jq '.categories'
    else
        cat "$index_file"
    fi
}

show_all() {
    local index_file="${DATA_DIR}/kb_index.json"
    
    if [ ! -f "$index_file" ]; then
        echo -e "${RED}错误: kb_index.json 不存在${NC}"
        return 1
    fi
    
    echo -e "${GREEN}=== 完整知识库索引${NC}"
    echo ""
    
    if command -v jq &> /dev/null; then
        cat "$index_file" | jq '.'
    else
        cat "$index_file"
    fi
}

# 主逻辑
case "$1" in
    profile)
        query_profile "$2"
        ;;
    task)
        query_task "$2"
        ;;
    index)
        show_index
        ;;
    all)
        show_all
        ;;
    *)
        print_usage
        exit 1
        ;;
esac
