# SwitchBot OpenAPI Skill (for ClawHub)

控制与查询 SwitchBot 设备（OpenAPI v1.1）。支持列出设备、查询状态、发送命令（turnOn/turnOff/press/lock/unlock/setPosition 等），以及执行 Scenes（适用于部分未公开命令的设备，如某些扫地机）。

- 技能名：switchbot-openapi
- 目录：skills/public/switchbot-openapi
- 主要文件：
  - SKILL.md — 技能说明与操作要点（面向代理）
  - scripts/*.sh — 便捷的 curl 脚本
  - scripts/switchbot_cli.js — Node CLI，封装签名/重试/能力检测
  - references/*.md — 常用命令与示例

## 依赖与要求

- 需要在 OpenClaw Gateway/容器中设置以下环境变量：
  - SWITCHBOT_TOKEN — OpenAPI Token
  - SWITCHBOT_SECRET — OpenAPI Secret
  - SWITCHBOT_REGION（可选）— 默认 `global`（api.switch-bot.com），可选：`global`/`na`/`eu`/`jp`
- 运行环境：
  - Bash（用于 *.sh 脚本）
  - Node.js（已随 OpenClaw 提供；用于 scripts/switchbot_cli.js）

## 快速开始

1) 配置环境变量（建议在 Gateway 的环境或 .env 中安全注入）：

```
export SWITCHBOT_TOKEN=xxxxx
export SWITCHBOT_SECRET=yyyyy
export SWITCHBOT_REGION=global
```

2) 列出设备（任选其一）：

- Bash: `skills/public/switchbot-openapi/scripts/list_devices.sh`
- Node: `node skills/public/switchbot-openapi/scripts/switchbot_cli.js list`

3) 常见操作：

- 查询状态：`node skills/public/switchbot-openapi/scripts/switchbot_cli.js status <deviceId>`
- 开/关：`node .../switchbot_cli.js cmd <deviceId> turnOn|turnOff`
- 机械臂按压：`node .../switchbot_cli.js cmd <deviceId> press`
- 窗帘 50%：`node .../switchbot_cli.js cmd <deviceId> setPosition --pos 50`
- 门锁开/关：`node .../switchbot_cli.js cmd <deviceId> lock|unlock`

4) Scenes（当设备无公开命令时的兜底）：

- 列表：`skills/public/switchbot-openapi/scripts/list_scenes.sh`
- 执行：`skills/public/switchbot-openapi/scripts/execute_scene.sh <sceneId>`

## 给代理（Agent）的使用建议

- 优先调用附带的脚本/CLI；它们已经处理签名、时间戳、nonce、重试等细节。
- 预检：CLI 会基于设备能力和 hub 绑定情况做校验。对于 Bot/Lock/Curtain 等蓝牙类设备，若 `enableCloudService!=true` 或缺少 `hubDeviceId`，将中止并提示到 SwitchBot App 里绑定 Hub 并启用 Cloud Services。
- 敏感操作（如 unlock）建议二次确认，可选一次性验证码流程（若用户开启）。
- 常见错误排查：
  - 190/TokenInvalid 或 100/Unauthorized → 检查 token/secret、系统时间漂移、签名拼接。
  - 160/unknown command → 该型号未公开命令，可改用 Scenes。

## 参考（部分命令）

- Bot：press；turnOn/turnOff（toggle 模式）
- Plug/Plug Mini：turnOn/turnOff
- Curtain：setPosition（0-100）；open/close/pause
- Lock：lock/unlock
- AC（红外/Hub）：setAll 或 setTemperature；setMode；setFanSpeed
- Light（红外/Hub）：turnOn/turnOff；setBrightness
- RVC（示例模型）：startClean/pause/dock；setVolume；changeParam（详情见 references/commands.md）

更多参数格式与示例见 references/commands.md 与 references/examples.md。

## 目录结构

```
switchbot-openapi/
├─ SKILL.md
├─ README-CLAWHUB.md   ← 本文件
├─ scripts/
│  ├─ list_devices.sh
│  ├─ get_status.sh
│  ├─ send_command.sh
│  ├─ list_scenes.sh
│  ├─ execute_scene.sh
│  └─ switchbot_cli.js
└─ references/
   ├─ commands.md
   └─ examples.md
```

## 安全与隐私

- 不要在日志中输出 token/secret。
- 进行解锁等敏感动作前请再次向用户确认。
- 建议在服务器侧安全注入环境变量（而非硬编码配置）。

## 已知限制

- OpenAPI v1.1 对部分设备型号不开放直接命令，需要通过 Scenes 替代。
- 蓝牙类设备需绑定 Hub 且开启 Cloud Services 才能通过 OpenAPI 控制。

## 标签（ClawHub metadata 建议）

- iot, switchbot, smart-home, devices, appliances, locks, curtains

## 版本与许可

- 版本：0.1.0（初始提交）
- 许可：随仓库主许可（未附带单独 LICENSE 文件）
