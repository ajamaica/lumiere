#!/bin/bash
# Triple Memory Integration Script with Baidu Embedding
# Combines Baidu Embedding, Git-Notes, and File Search for comprehensive memory operations

set -e

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKSPACE="${WORKSPACE:-$SKILL_DIR}"

CMD="${1:-help}"
shift || true

case "$CMD" in
    init-session)
        echo "🔄 初始化会话记忆系统..."
        
        # 同步Git-Notes
        echo "📁 同步Git-Notes记忆..."
        if [ -f "$SKILL_DIR/skills/git-notes-memory/memory.py" ]; then
            python3 "$SKILL_DIR/skills/git-notes-memory/memory.py" -p "$WORKSPACE" sync --start
        else
            echo "⚠️  Git-Notes Memory未找到，跳过同步"
        fi
        
        # 检查Baidu Embedding系统状态
        echo "🌐 检查Baidu Embedding系统..."
        bash "$SKILL_DIR/skills/triple-memory-baidu-embedding/scripts/baidu-memory-tools.sh" status
        ;;
    remember)
        TEXT="$1"
        IMPORTANCE="${2:-n}"  # 默认normal重要性
        TAGS="${3:-triple-memory}"
        
        if [ -z "$TEXT" ]; then
            echo "❌ 请提供要记住的内容"
            echo "用法: $0 remember \"内容\" [重要性(c/h/n/l)] [标签]"
            exit 1
        fi
        
        echo "🧠 三重记忆系统 - 记住: $TEXT"
        
        # 1. 存储到Baidu Embedding DB (语义记忆)
        echo "   → 存储到Baidu Embedding (语义记忆)..."
        if [ -n "$BAIDU_API_STRING" ] && [ -n "$BAIDU_SECRET_KEY" ]; then
            python3 -c "
import sys
sys.path.append('$SKILL_DIR/skills/memory-baidu-embedding-db')
from memory_baidu_embedding_db import MemoryBaiduEmbeddingDB

try:
    db = MemoryBaiduEmbeddingDB()
    result = db.add_memory(
        content='$TEXT',
        tags=['$TAGS', 'semantic'],
        metadata={'importance': '$IMPORTANCE', 'source': 'triple-memory'}
    )
    print('   ✅ 语义记忆存储完成')
except Exception as e:
    print(f'   ⚠️  语义记忆存储失败: {str(e)}')
"
        else
            echo "   ⚠️  Baidu Embedding未配置 (缺少API凭据)，跳过语义存储"
        fi
        
        # 2. 存储到Git-Notes (结构化记忆)
        echo "   → 存储到Git-Notes (结构化记忆)..."
        if [ -f "$SKILL_DIR/skills/git-notes-memory/memory.py" ]; then
            python3 "$SKILL_DIR/skills/git-notes-memory/memory.py" -p "$WORKSPACE" remember \
                "{\"content\": \"$TEXT\", \"importance\": \"$IMPORTANCE\"}" \
                -t "$TAGS",triple-memory -i "$IMPORTANCE"
        else
            echo "   ⚠️  Git-Notes Memory不可用"
        fi
        
        # 3. 存储到今日记忆文件 (文件记忆)
        echo "   → 存储到今日记忆文件..."
        TODAY_MEMO="$WORKSPACE/memory/$(date +%Y-%m-%d).md"
        mkdir -p "$WORKSPACE/memory"
        if [ ! -f "$TODAY_MEMO" ]; then
            echo "# $(date +%Y-%m-%d) 记忆记录" > "$TODAY_MEMO"
            echo "" >> "$TODAY_MEMO"
            echo "## 活动摘要" >> "$TODAY_MEMO"
        fi
        echo "- $(date '+%H:%M:%S') [$IMPORTANCE] $TEXT" >> "$TODAY_MEMO"
        
        echo "✅ 三重记忆系统完成存储"
        ;;
    search-all)
        QUERY="$1"
        if [ -z "$QUERY" ]; then
            echo "❌ 请提供搜索查询"
            echo "用法: $0 search-all \"查询\""
            exit 1
        fi
        
        echo "🔍 三重记忆系统搜索: $QUERY"
        
        # 1. 搜索Baidu Embedding (语义搜索)
        echo ""
        echo "🌐 语义搜索 (Baidu Embedding):"
        if [ -n "$BAIDU_API_STRING" ] && [ -n "$BAIDU_SECRET_KEY" ]; then
            bash "$SKILL_DIR/skills/triple-memory-baidu-embedding/scripts/baidu-memory-tools.sh" search "$QUERY" 3
        else
            echo "⚠️  Baidu Embedding未配置 (缺少API凭据)，跳过语义搜索"
        fi
        
        # 2. 搜索Git-Notes (结构化搜索)
        echo ""
        echo "📁 结构化搜索 (Git-Notes):"
        if [ -f "$SKILL_DIR/skills/git-notes-memory/memory.py" ]; then
            python3 "$SKILL_DIR/skills/git-notes-memory/memory.py" -p "$WORKSPACE" search "$QUERY"
        else
            echo "⚠️  Git-Notes Memory不可用"
        fi
        
        # 3. 搜索文件系统 (分层搜索)
        echo ""
        echo "📄 文件系统搜索 (分层搜索):"
        bash "$SKILL_DIR/hierarchical_memory_search.sh" "$QUERY"
        ;;
    status)
        echo "🏥 三重记忆系统状态检查..."
        
        echo ""
        echo "🌐 Baidu Embedding状态:"
        if [ -n "$BAIDU_API_STRING" ] && [ -n "$BAIDU_SECRET_KEY" ]; then
            bash "$SKILL_DIR/create/triple-memory-baidu-embedding/scripts/baidu-memory-tools.sh" status
        else
            echo "⚠️  Baidu Embedding未配置 (缺少API凭据)"
        fi
        
        echo ""
        echo "📁 Git-Notes状态:"
        if [ -f "$SKILL_DIR/skills/git-notes-memory/memory.py" ]; then
            python3 "$SKILL_DIR/skills/git-notes-memory/memory.py" -p "$WORKSPACE" branches
        else
            echo "❌ Git-Notes Memory未安装"
        fi
        
        echo ""
        echo "📄 文件系统状态:"
        if [ -d "$WORKSPACE/memory/" ]; then
            COUNT=$(find "$WORKSPACE/memory/" -name "*.md" | wc -l)
            echo "✅ 记忆文件目录存在，包含 $COUNT 个文件"
        else
            echo "❌ 记忆文件目录不存在"
        fi
        ;;
    *)
        echo "🧠 Triple Memory System with Baidu Embedding - 集成脚本"
        echo ""
        echo "用法: $0 <command> [options]"
        echo ""
        echo "命令:"
        echo "  init-session     - 初始化会话 (同步所有记忆系统)"
        echo "  remember <text> [importance] [tags] - 记住住在所有系统中"
        echo "  search-all <query> - 在所有系统中搜索"
        echo "  status          - 检查所有系统状态"
        echo "  help            - 显示此帮助"
        echo ""
        echo "重要性等级:"
        echo "  c - Critical (关键)"
        echo "  h - High (高)"
        echo "  n - Normal (正常) - 默认"
        echo "  l - Low (低)"
        echo ""
        echo "示例:"
        echo "  $0 init-session"
        echo "  $0 remember \"用户喜欢简洁回复\" h preferences"
        echo "  $0 search-all \"用户偏好\""
        echo "  $0 status"
        ;;
esac
