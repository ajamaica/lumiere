#!/bin/bash
# 火山引擎余额查询 Skill 安装脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "安装火山引擎余额查询 Skill..."
echo "=============================="

# 检查 Python3
if ! command -v python3 &> /dev/null; then
    echo "错误: 需要 Python3，请先安装 Python3"
    exit 1
fi

# 检查 pip
if ! command -v pip &> /dev/null; then
    echo "警告: pip 未安装，尝试安装 pip..."
    python3 -m ensurepip --upgrade || {
        echo "错误: 无法安装 pip，请手动安装"
        exit 1
    }
fi

# 创建虚拟环境
echo "创建 Python 虚拟环境..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "虚拟环境创建成功"
else
    echo "虚拟环境已存在，跳过创建"
fi

# 激活虚拟环境并安装依赖
echo "安装依赖..."
source venv/bin/activate
pip install --upgrade pip
pip install volcengine-python-sdk

# 检查安装是否成功
if python3 -c "import volcenginesdkbilling" &> /dev/null; then
    echo "✅ 火山引擎 SDK 安装成功"
else
    echo "❌ 火山引擎 SDK 安装失败"
    exit 1
fi

# 设置脚本权限
chmod +x volcengine_balance.sh
chmod +x setup.sh

echo ""
echo "✅ 安装完成！"
echo ""
echo "下一步：配置火山引擎 AK/SK"
echo "=============================="
echo "1. 获取 AK/SK: https://console.volcengine.com/iam/keymanage/"
echo "2. 配置方法（任选其一）："
echo ""
echo "   方法1 - 环境变量："
echo "   export VOLCENGINE_ACCESS_KEY='你的AccessKey ID'"
echo "   export VOLCENGINE_SECRET_KEY='你的AccessKey Secret'"
echo ""
echo "   方法2 - OpenClaw 配置："
echo "   在 ~/.openclaw/openclaw.json 的 'env' 部分添加："
echo '   "VOLCENGINE_ACCESS_KEY": "你的AccessKey ID",'
echo '   "VOLCENGINE_SECRET_KEY": "你的AccessKey Secret"'
echo ""
echo "3. 测试："
echo "   ./volcengine_balance.sh"
echo ""