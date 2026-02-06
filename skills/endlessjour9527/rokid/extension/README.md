# Lingzhu Bridge Plugin

灵珠平台接入 OpenClaw 的协议转换插件。

## 安装

```bash
# 从本地目录安装
openclaw plugins install ./extensions/lingzhu

# 或链接开发模式
openclaw plugins install -l ./extensions/lingzhu
```

## 配置

在 `moltbot.json` 中添加以下配置：

### 1. 启用 HTTP Chat Completions 端点（必需）

```json5
{
  gateway: {
    http: {
      endpoints: {
        chatCompletions: {
          enabled: true, // 必须启用，插件依赖此 API
        },
      },
    },
  },
}
```

> ⚠️ **重要**: 此配置是必需的，插件通过 `/v1/chat/completions` API 调用 Agent。

### 2. 插件配置

```json5
{
  plugins: {
    entries: {
      lingzhu: {
        enabled: true,
        config: {
          authAk: 'your-secret-ak', // 可选，留空自动生成
          agentId: 'main', // 可选，默认 main
        },
      },
    },
  },
}
```

## 使用

### Gateway 启动时

启动 Gateway 后会自动显示连接信息：

```
╔═══════════════════════════════════════════════════════════════════════╗
║                    Lingzhu Bridge 已启动                              ║
╠═══════════════════════════════════════════════════════════════════════╣
║  SSE 接口:  http://127.0.0.1:18789/metis/agent/api/sse                ║
║  鉴权 AK:   xxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx                          ║
╚═══════════════════════════════════════════════════════════════════════╝
```

### CLI 命令

```bash
# 查看连接信息
openclaw lingzhu info

# 查看状态
openclaw lingzhu status
```

### 提交给灵珠平台

1. **智能体SSE接口地址**: `http://<公网IP>/metis/agent/api/sse`
2. **智能体鉴权AK**: CLI 显示的 AK 值

## 4. 测试示例

### 本地测试

```bash
curl --location 'http://127.0.0.1:18789/metis/agent/api/sse' \
--header 'Authorization: Bearer {your AK}' \
--header 'Content-Type: application/json' \
--data '{
  "message_id": "test_local_01",
  "agent_id": "main",
  "message": [
    {"role": "user", "type": "text", "text": "你好"}
  ]
}'
```

### 公网域名测试

```bash
curl --location 'https://<您的域名>/metis/agent/api/sse' \
--header 'Authorization: Bearer <your AK>' \
--header 'Content-Type: application/json' \
--data '{
  "message_id": "test_ngrok_01",
  "agent_id": "main",
  "message": [
    {"role": "user", "type": "text", "text": "你好"}
  ]
}'

```

## API 端点

### POST /metis/agent/api/sse

灵珠平台调用的 SSE 接口。

**请求头**:

```
Authorization: Bearer <AK>
Content-Type: application/json
```

**请求体**:

```json
{
  "message_id": "消息ID",
  "agent_id": "智能体ID",
  "message": [{ "role": "user", "type": "text", "text": "你好" }]
}
```

**响应** (SSE):

```
event:message
data:{"role":"agent","type":"answer","answer_stream":"你好","message_id":"...","is_finish":false}

event:done
data:[DONE]
```

## License

MIT
