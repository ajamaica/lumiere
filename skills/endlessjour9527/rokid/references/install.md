---
name: lingzhu
description: 灵珠平台接入 - 将 Moltbot 接入灵珠智能体平台
metadata:
  {
    'openclaw':
      {
        'emoji': '🔗',
        'requires':
          { 'plugins': ['lingzhu'], 'config': ['gateway.http.endpoints.chatCompletions.enabled'] },
      },
  }
---

# 灵珠平台接入

灵珠平台是一个第三方智能体平台，通过 lingzhu 插件可以将 Moltbot 接入灵珠平台。

## 安装步骤

### 1. 安装 lingzhu 插件

```bash
# 从技能目录安装（使用 --link 进行开发模式链接）
openclaw plugins install --link {baseDir}/extension
```

### 2. 启用 Chat Completions API

在 `moltbot.json` 中添加：

```json5
{
  gateway: {
    http: {
      endpoints: {
        chatCompletions: {
          enabled: true, // 必须启用
        },
      },
    },
  },
}
```

### 3. 重启 Gateway

```bash
openclaw gateway restart
```

## 查看状态

### 查看连接信息

```bash
openclaw lingzhu info
```

### 查看状态

```bash
openclaw lingzhu status
```

## 提交给灵珠平台

1. **智能体SSE接口地址**: `http://<公网IP>:18789/metis/agent/api/sse`
2. **智能体鉴权AK**: CLI 显示的 AK 值
