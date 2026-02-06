#!/bin/bash
# Baidu Embedding Memory Tools for Triple Memory System
# Provides integration with Baidu Embedding DB for semantic memory operations

set -e

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKSPACE="${WORKSPACE:-$SKILL_DIR}"

# Load Baidu API configuration if available
if [ -f "$WORKSPACE/.env" ]; then
    source "$WORKSPACE/.env"
fi

CMD="${1:-help}"
shift || true

case "$CMD" in
    store|add)
        TEXT="$1"
        if [ -z "$TEXT" ]; then
            echo "❌ 请提供要存储的文本"
            echo "用法: $0 store \"要存储的文本内容\""
            exit 1
        fi
        
        # Check if API credentials are available
        if [ -z "$BAIDU_API_STRING" ] || [ -z "$BAIDU_SECRET_KEY" ]; then
            echo "❌ 错误: 缺少必要的API凭据!"
            echo "   请设置以下环境变量:"
            echo "   export BAIDU_API_STRING='your_bce_v3_api_string'"
            echo "   export BAIDU_SECRET_KEY='your_secret_key'"
            echo "   您可以从 https://console.bce.baidu.com/qianfan/ 获取API凭据"
            exit 1
        fi
        
        echo "📦 存储到Baidu Embedding记忆库: $TEXT"
        python3 -c "
import sys
sys.path.append('$SKILL_DIR/skills/memory-baidu-embedding-db')
from memory_baidu_embedding_db import MemoryBaiduEmbeddingDB

try:
    db = MemoryBaiduEmbeddingDB()
    result = db.add_memory(content='$TEXT', tags=['conversation'], metadata={'source': 'triple-memory'})
    print('✅ 成功存储记忆')
    print(f'ID: {result.get(\"id\", \"unknown\")}')
except Exception as e:
    print(f'❌ 存储失败: {str(e)}')
"
        ;;
    recall|search|find)
        QUERY="$1"
        if [ -z "$QUERY" ]; then
            echo "❌ 请提供搜索查询"
            echo "用法: $0 search \"搜索查询\" [数量限制]"
            exit 1
        fi
        
        LIMIT="${2:-5}"  # 默认返回5个结果
        
        # Check if API credentials are available
        if [ -z "$BAIDU_API_STRING" ] || [ -z "$BAIDU_SECRET_KEY" ]; then
            echo "❌ 错误: 缺少必要的API凭据!"
            echo "   请设置以下环境变量:"
            echo "   export BAIDU_API_STRING='your_bce_v3_api_string'"
            echo "   export BAIDU_SECRET_KEY='your_secret_key'"
            echo "   您可以从 https://console.bce.baidu.com/qianfan/ 获取API凭据"
            exit 1
        fi
        
        echo "🔍 使用Baidu Embedding搜索: $QUERY (最多$LIMIT个结果)"
        python3 -c "
import sys
import os
# 使用固定的workspace路径
workspace = '/root/clawd'
sys.path.insert(0, os.path.join(workspace, 'skills', 'memory-baidu-embedding-db'))

from memory_baidu_embedding_db import MemoryBaiduEmbeddingDB

try:
    db = MemoryBaiduEmbeddingDB()
    results = db.search_memories('$QUERY', limit=$LIMIT)
    if results:
        print(f'找到 {len(results)} 条相关记忆:')
        for i, res in enumerate(results, 1):
            similarity = res.get('similarity', 0)
            content_preview = res['content'][:80] + '...' if len(res['content']) > 80 else res['content']
            print(f'  {i}. 相似度: {similarity:.3f} - {content_preview}')
    else:
        print('未找到相关记忆')
except Exception as e:
    print(f'搜索失败: {str(e)}')
"
        ;;
    list|show)
        echo "📚 列出最近的记忆..."
        python3 -c "
import sys
sys.path.append('$SKILL_DIR/skills/memory-baidu-embedding-db')
from memory_baidu_embedding_db import MemoryBaiduEmbeddingDB

try:
    db = MemoryBaiduEmbeddingDB()
    # Note: This assumes the DB has a method to list recent memories
    # Implementation may vary based on actual DB structure
    print('💡 Baidu Embedding DB主要通过语义搜索工作，暂不支持直接列出所有记忆')
    print('🔍 请使用 search 命令查找特定内容')
except Exception as e:
    print(f'操作失败: {str(e)}')
"
        ;;
    status|health)
        # Check if API credentials are available
        if [ -z "$BAIDU_API_STRING" ] || [ -z "$BAIDU_SECRET_KEY" ]; then
            echo "🏥 检查Baidu Embedding记忆系统状态..."
            echo "❌ 错误: 缺少必要的API凭据!"
            echo "   请设置以下环境变量:"
            echo "   export BAIDU_API_STRING='your_bce_v3_api_string'"
            echo "   export BAIDU_SECRET_KEY='your_secret_key'"
            echo "   您可以从 https://console.bce.baidu.com/qianfan/ 获取API凭据"
            echo "⚠️  系统将在降级模式下运行，仅使用Git-Notes和文件系统"
            exit 1
        fi
        
        echo "🏥 检查Baidu Embedding记忆系统状态..."
        python3 -c "
import sys
import os
# 使用固定的workspace路径
workspace = '/root/clawd'
sys.path.insert(0, os.path.join(workspace, 'skills', 'memory-baidu-embedding-db'))
try:
    from memory_baidu_embedding_db import MemoryBaiduEmbeddingDB
    db = MemoryBaiduEmbeddingDB()
    print('✅ Baidu Embedding记忆系统连接正常')
    print('💡 系统已准备好进行语义搜索和存储')
    print('🔑 API凭证已配置')
except ImportError as e:
    print(f'❌ 导入错误: {str(e)}')
    print('💡 请确认 memory-baidu-embedding-db 技能已正确安装')
except Exception as e:
    print(f'❌ 连接失败: {str(e)}')
"
        ;;
    *)
        echo "🧠 Triple Memory System with Baidu Embedding"
        echo ""
        echo "用法: $0 <command> [options]"
        echo ""
        echo "命令:"
        echo "  store <text>     - 存储文本到Baidu Embedding记忆库"
        echo "  search <query> [limit] - 使用Baidu Embedding搜索记忆"
        echo "  status          - 检查系统状态"
        echo "  help            - 显示此帮助"
        echo ""
        echo "环境变量:"
        echo "  BAIDU_API_STRING - 百度API字符串"
        echo "  BAIDU_SECRET_KEY - 百度密钥"
        echo ""
        echo "示例:"
        echo "  $0 store \"用户喜欢简洁的回复风格\""
        echo "  $0 search \"用户偏好\" 3"
        echo "  $0 status"
        ;;
esac