#!/bin/bash
# SafeExec 推送脚本

REPO_NAME="safe-exec"
GITHUB_USER="${1:-yourusername}"

echo "📤 推送 SafeExec 到 GitHub"
echo "=========================="
echo ""
echo "仓库: git@github.com:$GITHUB_USER/$REPO_NAME.git"
echo ""

# 添加远程仓库
if git remote get-url origin &>/dev/null; then
    echo "⚠️  远程仓库已存在"
    git remote -v | grep origin
    echo ""
    read -p "是否更新远程仓库 URL？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git remote set-url origin "git@github.com:$GITHUB_USER/$REPO_NAME.git"
        echo "✅ 远程仓库已更新"
    fi
else
    git remote add origin "git@github.com:$GITHUB_USER/$REPO_NAME.git"
    echo "✅ 远程仓库已添加"
fi

echo ""
echo "推送 master 分支..."
git branch -M master
git push -u origin master

echo ""
echo "推送所有标签..."
git push origin --tags

echo ""
echo "✅ 推送完成！"
echo ""
echo "查看仓库: https://github.com/$GITHUB_USER/$REPO_NAME"
