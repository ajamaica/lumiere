---
name: screen-vision
description: macOS Local OCR & Automation Tool using Vision Framework. Zero token cost for screen understanding.
metadata: { 'openclaw': { 'requires': { 'bins': ['swift'] } } }
---

# screen-vision Skill

利用 Mac 本地 Vision 框架实现的极速 OCR 识别工具，为 AI 提供“本地之眼”。

## 功能

- **零 Token 截屏识别**：在本地完成屏幕文字提取，仅向 AI 传输关键文本和坐标。
- **精确坐标定位**：识别屏幕上任何文字的 [X, Y] 坐标。
- **多语言支持**：支持中英文混合识别。
- **通用操作基础**：配合内置脚本，可实现对任何应用的自动化点击和输入。

## 权限要求 (重要)

由于 macOS 的安全性限制，使用此技能前，用户必须手动在以下路径开启权限：

1. **系统设置 -> 隐私与安全性 -> 屏幕录制**：勾选你运行 OpenClaw 的终端或应用（如 Terminal, iTerm2）。
2. **系统设置 -> 隐私与安全性 -> 辅助功能**：同上（用于点击操作）。

## 使用场景

- 当用户说：“帮我操作 [某应用]”时，先运行此 Skill 扫描界面。
- 自动监控屏幕上的状态变化（如：余额、通知、进度条）。
- 识别非标准 UI（如 Telegram 桌面版、专业工具软件）。

## 内部代码

- `scripts/vision_ocr.swift`: 执行本地 Swift 识别逻辑。
- `scripts/click.swift`: 执行物理鼠标点击。
