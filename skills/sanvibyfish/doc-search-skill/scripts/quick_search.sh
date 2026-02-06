#!/bin/bash
# 快速文档搜索（使用 ripgrep）
# 用法: ./quick_search.sh "关键词" [目录] [选项]

set -e

QUERY="${1:?Usage: $0 <query> [path] [options]}"
SEARCH_PATH="${2:-.}"
CONTEXT="${CONTEXT:-2}"
TYPES="${TYPES:-md,txt,py,js,ts}"

# 检查 ripgrep 是否可用
if command -v rg &> /dev/null; then
    # 使用 ripgrep（更快）
    TYPE_ARGS=""
    IFS=',' read -ra TYPE_ARRAY <<< "$TYPES"
    for t in "${TYPE_ARRAY[@]}"; do
        TYPE_ARGS="$TYPE_ARGS --type-add '$t:*.$t' -t $t"
    done
    
    echo "=== 文件名匹配 ==="
    find "$SEARCH_PATH" -type f -iname "*$QUERY*" 2>/dev/null | head -20
    
    echo ""
    echo "=== 内容匹配 ==="
    eval "rg '$QUERY' '$SEARCH_PATH' \
        --context $CONTEXT \
        --line-number \
        --color always \
        --heading \
        --smart-case \
        $TYPE_ARGS" 2>/dev/null | head -100
    
else
    # 回退到 grep
    echo "=== 文件名匹配 ==="
    find "$SEARCH_PATH" -type f -iname "*$QUERY*" 2>/dev/null | head -20
    
    echo ""
    echo "=== 内容匹配 ==="
    grep -rn --include="*.md" --include="*.txt" --include="*.py" \
        -C "$CONTEXT" "$QUERY" "$SEARCH_PATH" 2>/dev/null | head -100
fi
