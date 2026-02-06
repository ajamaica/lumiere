---
name: volcengine-config
description: '引导用户在 OpenClaw 中配置火山引擎（方舟 Coding Plan）大模型。当用户请求设置火山引擎模型、询问如何配置模型提供商，或需要帮助获取火山引擎 API key 时使用。涵盖完整的入职流程：注册、订阅计划选择、API key 创建和自动配置。'
---

# 火山引擎配置

## 概述

引导用户完成在 OpenClaw 中配置火山引擎（方舟 Coding Plan）大模型的全流程，从注册到 API key 配置。本技能提供完整的入职引导，包含清晰的说明、定价信息和自动化配置命令。

## 工作流程

### 第一步：确定当前状态

首先检查用户是否已有火山引擎 API key：

- **如果用户已提供 API key：** 跳到第四步（配置）
- **如果用户没有 API key：** 继续完整注册流程（第二步-第三步）

### 第二步：注册并订阅（无 API key）

如果用户没有火山引擎账号或 API key，引导他们完成：

**注册链接：** https://volcengine.com/L/iVVhlP5SI_o/

**订阅步骤：**

1. 访问注册链接
2. 输入手机号并注册
3. 点击"立即订阅"
4. 选择 **lite 套餐**（ Lite Plan）- 约 ¥10/月
5. 完成实名认证
6. 完成支付

**关于 Lite 套餐：**

- **定价模式：** 月度订阅（非按量计费），用户可以放心使用
- **包含模型：**
  - glm-4.7（默认推荐）
  - kimi-k2.5
  - kimi-k2
  - deepseek-v3.2
  - doubao-seed-code
  - 以及更多模型
- **用量限制：**
  - 每 5 小时：约 1,200 次请求
  - 每周：约 9,000 次请求
  - 每订阅月：约 18,000 次请求
- **适用性：** 足够中等强度的开发任务使用，适合大多数用户

**更多详情：** https://www.volcengine.com/docs/82379/2165245?lang=zh#628bdbe3

### 第三步：创建 API Key

订阅完成后，引导用户创建 API key：

**控制台链接：** https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey

**步骤：**

1. 访问火山引擎方舟控制台
2. 进入 API Key 部分
3. 创建新的 API key
4. 将 API key 提供给 OpenClaw

### 第四步：配置并重启

当用户提供 API key 后，告知他们执行流程：

**执行前提醒：**
告诉用户你将执行配置命令并重启网关。提醒用户重启后如果没有响应，可以发送消息唤醒你。

**配置命令：**

其中，将 `<API_KEY>` 替换为用户提供的实际 API key；将`<existing alias>`替换为用户当前已经配置的别名（使用` openclaw config get agents.defaults.models`来查看已有的别名）。

```bash
openclaw config set models.providers.volcengine --json '{
    "baseUrl": "https://ark.cn-beijing.volces.com/api/coding/v3",
    "apiKey": "<API_KEY>",
    "api": "openai-completions",
    "models": [
        { "id": "doubao-seed-code", "name": "Doubao-Seed-Code", "contextWindow": 128000},
        { "id": "glm-4.7", "name": "GLM 4.7", "contextWindow": 128000},
        { "id": "deepseek-v3.2", "name": "Deepseek-V3.2", "contextWindow": 128000},
        { "id": "kimi-k2-thinking", "name": "Kimi-K2-Thinking", "contextWindow": 128000},
        { "id": "kimi-k2.5", "name": "Kimi-K2.5", "contextWindow": 128000}
    ]
}'
openclaw config set agents.defaults.model.primary 'volcengine/glm-4.7'
# 如果新的alias和现有的不冲突，新增别名
openclaw config set 'agents.defaults.models' --json '{
    <existing alias>
    "volcengine/doubao-seed-code": {"alias": "doubao"},
    "volcengine/glm-4.7": {"alias": "glm"},
    "volcengine/deepseek-v3.2": {"alias": "deepseek"},
    "volcengine/kimi-k2-thinking": {"alias": "kimi2"},
    "volcengine/kimi-k2.5": {"alias": "kimi2.5"}
}'
openclaw models set glm
openclaw gateway restart
```

**配置完成后：**
重启后，告知用户：

- 可以使用 `/model` 命令查看所有可用模型
- 可以使用`/model volcengine/<模型全名>` 切换模型，例如：`/model volcengine/glm-4.7`。
- 如果设置了别名，也可以使用更方便的方法： `/model <别名>` 切换模型，例如：
  - `/model glm` - 切换到 GLM-4.7
  - `/model kimi2` - 切换到 Kimi-K2
  - `/model kimi2.5` - 切换到 Kimi-K2.5
  - `/model deepseek` - 切换到 DeepSeek-V3.2
  - `/model doubao` - 切换到 Doubao-Seed-Code

### 第五步：验证（可选）

可选择让用户切换到火山引擎模型并测试，以验证配置是否正常工作。

## 模型别名

可向用户提及的常用模型别名：

| 别名       | 完整模型名称                  | 描述                  |
| ---------- | ----------------------------- | --------------------- |
| `glm`      | `volcengine/glm-4.7`          | 默认 GLM-4.7 模型     |
| `kimi2`    | `volcengine/kimi-k2-thinking` | Kimi K2 模型          |
| `kimi2.5`  | `volcengine/kimi-k2.5`        | Kimi K2.5 模型        |
| `deepseek` | `volcengine/deepseek-v3.2`    | DeepSeek V3.2 模型    |
| `doubao`   | `volcengine/doubao-seed-code` | Doubao Seed Code 模型 |

## 重要提示

- **需要重启：** 配置更改需要重启网关才能生效
- **模型可用性：** 所有列出的模型都在 Lite 套餐中可用
- **用量监控：** 用户可以在火山引擎控制台监控使用情况
- **计划升级：** 如果 Lite 套餐限制不足，用户可以在控制台中升级到更高层级的 Pro 套餐
