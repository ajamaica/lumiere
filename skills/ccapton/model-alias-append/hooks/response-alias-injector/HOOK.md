---
name: response-alias-injector
displayName: 'Response Alias Injector'
description: 'Intercepts responses before they are sent and appends the appropriate model alias to provide transparency about which model generated the response, with configuration change detection and notifications'
type: 'response:pre-send'
version: '1.0.2'
author: 'OpenClaw Community'
license: 'MIT'
category: 'response-processing'
tags:
  - 'model-alias'
  - 'response-enhancement'
  - 'transparency'
  - 'configuration-monitoring'
homepage: https://docs.openclaw.ai/hooks#response-alias-injector
repository: comming soon
capabilities:
  - 'response-interception'
  - 'configuration-monitoring'
  - 'dynamic-updates'
metadata:
  {
    'openclaw':
      {
        'emoji': '🏷️',
        'events': ['response:pre-send'],
        'requires': { 'config': ['models'] },
        'install':
          [
            {
              'id': 'skill-component',
              'kind': 'skill',
              'label': 'Part of model-alias-append skill',
            },
          ],
      },
  }
---

# Response Alias Injector Hook

> Intercepts responses and appends model alias with configuration change detection

## 🔧 What It Does

- Intercepts responses before sending
- Detects the model used for the response
- Appends the configured model alias
- Shows update notifications when config changes
