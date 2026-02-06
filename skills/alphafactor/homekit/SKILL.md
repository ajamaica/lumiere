---
name: homekit
description: Control Apple HomeKit smart home devices. Supports listing, discovering, pairing devices, and controlling lights, switches, outlets, thermostats. Use when the user needs to manage HomeKit accessories programmatically. Requires homekit library and paired devices.
---

# HomeKit 智能家居控制器

通过 Python 脚本控制苹果 HomeKit 智能家居设备。

## 功能特性

- 🔍 发现未配对设备
- 🔗 配对/取消配对设备
- 📱 列出所有已配对设备
- 💡 控制灯光开关和亮度
- 🔌 控制插座和开关
- 🌡️ 查看设备状态

## 前提条件

### 1. 安装依赖

```bash
pip3 install HAP-python homekit --user
```

### 2. 配对设备

首次使用前需要配对设备：

```bash
# 发现设备
python3 scripts/homekit.py discover

# 配对设备
python3 scripts/homekit.py pair "设备名称" "XXX-XX-XXX" "别名"
```

配对码通常在设备说明书或设备本体上（格式：XXX-XX-XXX）。

## 使用方法

### 列出所有设备

```bash
python3 scripts/homekit.py list
```

输出示例：

```
📱 找到 3 个设备:

Alias           Name                      Type            Status
----------------------------------------------------------------------
💡 living-light  客厅主灯                  Lightbulb       on (80%)
🔌 desk-outlet   桌面插座                  Outlet          off
💡 bedroom-lamp  床头灯                    Lightbulb       off
```

### 控制设备

**打开设备：**

```bash
python3 scripts/homekit.py on living-light
```

**关闭设备：**

```bash
python3 scripts/homekit.py off living-light
```

**调节亮度（0-100）：**

```bash
python3 scripts/homekit.py brightness living-light 50
```

### 查看设备状态

```bash
python3 scripts/homekit.py status living-light
```

### 设备管理

**发现新设备：**

```bash
python3 scripts/homekit.py discover --timeout 10
```

**取消配对：**

```bash
python3 scripts/homekit.py unpair living-light
```

## 支持的设备类型

| 类型          | 支持操作               |
| ------------- | ---------------------- |
| 💡 Lightbulb  | 开关、亮度调节         |
| 🔌 Outlet     | 开关                   |
| 🔲 Switch     | 开关                   |
| 🌡️ Thermostat | 查看温度、设置目标温度 |
| 🌀 Fan        | 开关、风速调节         |

## 常见问题

**错误：homekit 库未安装**
→ 运行: `pip3 install HAP-python homekit --user`

**错误：未找到设备**
→ 确保设备和电脑在同一 WiFi 网络

**错误：配对失败**
→ 检查配对码是否正确，设备是否处于配对模式

**设备显示离线**
→ 尝试重新配对或检查设备电源

## 高级用法

### 批量控制

```bash
# 关闭所有灯
for device in living-light bedroom-lamp kitchen-light; do
    python3 scripts/homekit.py off $device
done
```

### 场景脚本示例

创建 `~/scripts/goodnight.sh`：

```bash
#!/bin/bash
# 晚安场景：关闭所有灯，保留床头灯微光

python3 ~/.openclaw/workspace/homekit/scripts/homekit.py off living-light
python3 ~/.openclaw/workspace/homekit/scripts/homekit.py off kitchen-light
python3 ~/.openclaw/workspace/homekit/scripts/homekit.py brightness bedroom-lamp 10

echo "晚安 😴"
```

## 参考

- HomeKit 官方文档: https://developer.apple.com/homekit/
- 库文档: https://github.com/jlusiardi/homekit_python
