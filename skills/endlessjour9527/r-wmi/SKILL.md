---
name: lingzhu
description: 灵珠平台接入 - 将 openclaw 接入灵珠智能体平台，并且可以使用lingzhu的设备命令
metadata:
  {
    'openclaw':
      {
        'emoji': '🔗',
        'requires':
          { 'plugins': ['lingzhu'], 'config': ['gateway.http.endpoints.chatCompletions.enabled'] },
        'install': [{ 'kind': 'node', 'package': '@r.wmi/openclaw-lingzhu' }],
      },
  }
---

## 支持的设备命令

| 灵珠命令           | OpenClaw 工具名              | 说明       |
| :----------------- | :--------------------------- | :--------- |
| `take_photo`       | take_photo, camera, photo    | 拍照       |
| `take_navigation`  | navigate, navigation, maps   | 导航       |
| `control_calendar` | calendar, schedule, reminder | 日程       |
| `notify_agent_off` | exit, quit                   | 退出智能体 |

## 插件的集成引导

当用户需要接入灵珠平台时，请阅读 `references/install.md` 并按照其中的步骤执行。
