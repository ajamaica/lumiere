#!/bin/bash
# 记忆系统技能文件同步脚本
# 将主目录中的记忆系统技能文件同步到create目录

echo "🔄 同步记忆系统技能文件到create目录..."

# 定义要同步的目录列表
TARGET_DIRS=(
    "/root/clawd/create/memory-baidu-embedding-db"
    "/root/clawd/create/triple-memory-baidu-embedding/scripts"
    "/root/clawd/create/secure-memory-stack/scripts"
    "/root/clawd/create/git-notes-memory"
    "/root/clawd/create/memory-hygiene"
    "/root/clawd/create/memory-setup"
)

# 定义要同步的文件列表
SYNC_FILES=(
    "memory_skill_full_verification.sh"
    "memory_skill_startup_check.sh"
)

# 同步文件
for dir in "${TARGET_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "  同步到 $dir"
        for file in "${SYNC_FILES[@]}"; do
            src_file="/root/clawd/scripts/$file"
            dst_file="$dir/$file"
            if [ -f "$src_file" ]; then
                cp "$src_file" "$dst_file"
                chmod +x "$dst_file"
                echo "    ✅ $file"
            else
                echo "    ⚠️ 源文件不存在: $src_file"
            fi
        done
    else
        echo "  ⚠️ 目标目录不存在: $dir"
    fi
done

# 同步相关文档
DOC_FILES=(
    "MEMORY_SYSTEM_GUIDE.md"
    "QUICK_START.md"
    "README.md"
    "SKILL.md"
)

echo "  同步文档文件..."
for doc in "${DOC_FILES[@]}"; do
    src_doc="/root/clawd/skills/memory-baidu-embedding-db/$doc"
    if [ -f "$src_doc" ]; then
        cp "$src_doc" "/root/clawd/create/memory-baidu-embedding-db/$doc" 2>/dev/null || true
        cp "$src_doc" "/root/clawd/create/secure-memory-stack/$doc" 2>/dev/null || true
        echo "    ✅ $doc"
    fi
done

echo ""
echo "🎯 记忆系统技能文件同步完成!"
echo "   • 验证脚本已同步到所有相关目录"
echo "   • 权限已设置为可执行"
echo "   • 文档文件已更新"