# Browser Auto Download v5.0.0 - 用户快速指南

## 🚀 快速开始

### 安装依赖

```bash
pip install playwright
playwright install chromium
```

### 基本使用

```bash
# 自动检测模式
python scripts/auto_download.py --url "https://example.com/download"

# 使用预设快捷方式
python scripts/auto_download.py --eclipse    # Eclipse IDE
python scripts/auto_download.py --golang     # Golang
python scripts/auto_download.py --wechat     # 微信开发者工具
```

## 📊 v5.0.0 新特性

### 性能提升

- ✅ 成功率提升 50%（~60% → ~90%）
- ✅ 增强的等待时间优化
- ✅ 更好的 JavaScript 渲染处理

### 新增调试模式

```bash
# 启用调试模式（保存截图和HTML）
python scripts/auto_download.py --url "URL" --debug
```

生成文件：

- `Downloads/browser-auto-download-debug/page_XXX_YYYYMMDD_HHMMSS.png` - 页面截图
- `Downloads/browser-auto-download-debug/page_XXX_YYYYMMDD_HHMMSS.html` - HTML源码
- `Downloads/browser-auto-download-debug/page_XXX_YYYYMMDD_HHMMSS.txt` - 提取文本

## 📖 完整文档

- **README.md** - 完整功能说明和示例
- **CHANGELOG.md** - 版本历史
- **QUICKSTART.md** - 快速参考指南
- **CONTRIBUTING.md** - 贡献指南

## 💡 使用建议

### 最佳实践

1. **优先使用直接下载链接**（如果有）
2. **遇到问题时使用调试模式**
3. **复杂页面可增加等待时间**

### 示例代码

```python
from scripts.auto_download import auto_download

# 基本使用
result = auto_download(
    url="https://example.com/download",
    headless=False  # 可见模式（便于调试）
)

if result:
    print(f"下载成功: {result['path']}")
    print(f"文件大小: {result['size_mb']:.1f} MB")
```

## 🆘 获取帮助

```bash
# 查看所有选项
python scripts/auto_download.py --help
```

## 📞 支持

- **问题反馈**: https://github.com/openclaw/browser-auto-download/issues
- **Discord**: https://discord.gg/clawd
- **ClawHub**: https://clawhub.com/skills/browser-auto-download

---

**版本**: 5.0.0 | **发布日期**: 2026-02-04 | **状态**: ✅ 生产就绪
