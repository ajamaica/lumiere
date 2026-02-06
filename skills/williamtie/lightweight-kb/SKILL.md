---
name: lightweight-kb
description: 轻量级知识库与任务管理体系。结构化 JSON + MD 混合存储，支持用户画像、任务节奏、知识索引、每日自动进化。适用于中小规模记忆管理。
---

# Lightweight Knowledge Base (轻量级知识库)

**轻量级知识库 + 任务管理体系**

基于 V4 架构简化，采用 JSON + MD 混合存储，兼顾结构化查询与人类可读性。

## 核心特性

- **用户画像** - 结构化记录用户偏好、特质权重
- **任务节奏** - 每日/每周任务自动化管理
- **知识索引** - JSON 索引管理 MD 文件
- **每日进化** - 凌晨自动优化知识库
- **三层架构** - 宪法层 → 法规层 → 案例库

## 目录结构

```
lightweight-kb/
├── SKILL.md                    # 本文件
├── data/
│   ├── user_profile.json        # 用户画像
│   ├── task_rhythm.json        # 任务节奏表
│   └── kb_index.json           # 知识库索引
├── scripts/
│   ├── daily_evolve.sh         # 每日进化
│   └── query.sh                # 查询工具
└── references/
    ├── communication.md        # 沟通模式
    └── task_guidelines.md      # 任务执行指南
```

## 快速开始

### 1. 初始化知识库

```bash
bash skills/lightweight-kb/scripts/init.sh
```

创建初始结构：
- `data/user_profile.json` - 用户画像模板
- `data/task_rhythm.json` - 任务节奏表
- `data/kb_index.json` - 知识库索引
- `memory/kb/` - 知识库目录

### 2. 查询用户画像

```bash
bash skills/lightweight-kb/scripts/query.sh profile "效率导向"
```

### 3. 执行每日进化

```bash
bash skills/lightweight-kb/scripts/daily_evolve.sh
```

## 三层任务体系

### 宪法层 (Spec)

定义共同目标、核心原则、架构基础。

**位置:** `lightweight-kb/SKILL.md` (本文档)

### 法规层 (Methodology)

细分领域的执行指导。

**位置:** `lightweight-kb/references/`

**核心文件:**
- `communication.md` - 沟通模式指南
- `task_guidelines.md` - 任务执行指南

### 案例库 (Knowledge)

具体实例的知识库节点。

**位置:** `memory/kb/nodes/`

**示例:**
```
memory/kb/nodes/
├── persona_xxx.json           # 用户特质节点
├── task_xxx_execution.json    # 任务执行案例
└── method_xxx.json            # 方法论沉淀
```

## 任务分类

### 定时性例行任务

按固定频率执行的标准化任务。

**判断特征:**
- 频率固定（每日/每周）
- 产出格式稳定
- 执行逻辑可标准化

**示例:** 每日晨间简报、每周复盘

### 日常突发任务

用户临时提出的有一定规模的需求。

**判断特征:**
- 触发时机不固定
- 需要跨知识库节点协同
- 有一定复杂度

**处理:** 查用户画像 → 查历史案例 → 制定方案

### 日常沟通应答

即时交互、信息确认、状态查询。

**判断特征:**
- 响应即时性要求高
- 不产生长期文件产出
- 需遵循沟通风格

## 用户画像结构

```json
{
  "user": {
    "name": "老铁",
    "timezone": "UTC+8",
    "family": "沙雕之家"
  },
  "traits": {
    "efficiency_oriented": 0.9,
    "architecture_sensitive": 0.8,
    "collaborative_review": 0.85,
    "gradual_expansion": 0.75
  },
  "preferences": {
    "communication_style": "direct_data_driven_warm",
    "weekly_review_day": "sunday",
    "deep_talk_time": "21:00"
  },
  "knowledge_weights": {
    "personal_growth": 0.8,
    "career_development": 0.75
  },
  "collecting": {
    "interests": [],
    "breakthroughes": [],
    "value_paths": []
  }
}
```

## 任务节奏表结构

```json
{
  "daily": [
    {
      "id": 1,
      "name": "晨间检查",
      "time": "08:00",
      "action": "check_rhythm"
    }
  ],
  "weekly": [
    {
      "id": 35,
      "name": "综合复盘",
      "day": "sunday",
      "time": "20:00",
      "action": "weekly_review"
    },
    {
      "id": 36,
      "name": "深度了解对话",
      "day": "sunday",
      "time": "21:00",
      "action": "deep_dialogue"
    }
  ]
}
```

## 每日进化流程

### 凌晨 1:00 自动执行

1. **更新知识图谱** - 合并新记忆
2. **任务节奏检查** - 验证一致性
3. **方法论沉淀** - 从案例提取模式
4. **用户画像更新** - 更新特质权重

### 执行脚本

```bash
bash skills/lightweight-kb/scripts/daily_evolve.sh
```

## 沟通风格

### 基础原则

- **直接、理性、数据驱动**
- **增加人性化表达和温暖语气**
- **不展示内部思考过程**
- **聚焦结论与建议**

### 文件沟通

当需要展示结构化信息时：
- 使用清晰的标题层级
- 提供选项需灵活（1-5条不等）
- 信息引导自然融入对话流

## 文件目录规则

| 目录 | 用途 |
|------|------|
| `outputs/` | 晨间简报、健康报告等核心交付资产 |
| `temp/` | 过程数据与缓存 |
| `src/` | 逻辑脚本与工具 |
| `data/` | 结构化数据（JSON） |
| `memory/kb/` | 知识库与锚点 |

## 注意事项

1. **Spec 维护纪律** - 日常沟通禁改 SKILL.md，仅在明确要求时修改
2. **紧急记录** - 需先报备，经认可后安排即时任务
3. **信息采集** - 遵循自然对话流，优先在固定场景嵌入

## 相关技能

- `memory-manager` - 基础记忆管理（MD 文件）
- `kokoro-tts` - 语音合成
- `feishu-message` - 飞书消息
