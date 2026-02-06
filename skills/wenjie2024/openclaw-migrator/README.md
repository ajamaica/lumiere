# OpenClaw Migrator 📦

[English](#english) | [中文](#中文)

---

<a name="english"></a>
## English

Securely migrate your OpenClaw Agent (config, memory, skills) between machines.

### 🚀 Features
- 🔒 **High Security**: Uses AES-256-GCM encryption with integrity verification.
- 🛣️ **Path Normalization**: Automatically adjusts absolute paths (e.g., workspace root) during restoration.
- 📦 **Smart Packaging**: Built on top of `archiver` and `tar`, ensuring lightweight and portable `.oca` files.

### 🛠️ Installation
```bash
git clone https://github.com/anchor-jevons/openclaw-migrator
cd openclaw-migrator
npm install
npm link
```

### 📖 Usage
**Export (Old Machine):**
```bash
migrator export -o my-agent.oca --password "your-secret-password"
```

**Import (New Machine):**
```bash
migrator import -i my-agent.oca --password "your-secret-password"
```

---

<a name="中文"></a>
## 中文

安全地在不同机器之间迁移您的 OpenClaw 智能体（配置、记忆、技能）。

### 🚀 功能特性
- 🔒 **高安全性**：采用 AES-256-GCM 加密算法，并具备数据完整性校验。
- 🛣️ **路径自愈**：在恢复过程中自动修正绝对路径（如 workspace 根目录），确保无缝衔接。
- 📦 **智能打包**：基于 `archiver` 和 `tar` 构建，自动忽略非必要文件，生成轻量的 `.oca` 归档。

### 🛠️ 安装方法
```bash
git clone https://github.com/anchor-jevons/openclaw-migrator
cd openclaw-migrator
npm install
npm link
```

### 📖 使用指南
**导出 (旧机器):**
```bash
migrator export -o my-agent.oca --password "你的加密密码"
```

**导入 (新机器):**
```bash
migrator import -i my-agent.oca --password "你的加密密码"
```

## ⚖️ License
MIT
