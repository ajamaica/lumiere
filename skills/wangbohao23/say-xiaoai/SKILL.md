---
name: say-xiaoai
description: 当用户以“小爱同学”开头进行对话时，调用此工具执行本地语音脚本。
---

## Parameters

| Name | Type | Description | Required |
|------|------|-------------|----------|
| query | string | 除去“小爱同学”触发词后的剩余文本内容 | Yes |

## Scripts

```bash
bash ./say_xiaoai.sh "$query"
```
