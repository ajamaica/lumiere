# Self-Evolving Skill - OpenClaw集成指南

## 安装完成 ✅

### 文件位置

| 位置 | 说明 |
|------|------|
| `~/.openclaw/skills/self-evolving-skill/` | 技能根目录 |
| `~/.openclaw/agents/main/agent/mcp_servers.json` | MCP服务器配置 |
| `~/.openclaw/skills/self-evolving-skill/storage/` | 数据存储 |

### 项目结构

```
~/.openclaw/skills/self-evolving-skill/
├── core/                      # Python核心
│   ├── residual_pyramid.py     # SVD分解
│   ├── reflection_trigger.py   # 自适应触发
│   ├── experience_replay.py    # 经验回放
│   ├── skill_engine.py        # 核心引擎
│   ├── storage.py            # 持久化
│   └── mcp_server.py        # MCP服务器
├── src/                       # TypeScript SDK
├── SKILL.md                  # 技能文档
├── package.json              # npm配置
├── mcporter_adapter.py       # mcporter适配器
└── venv/                     # Python虚拟环境
```

## 使用方式

### 1. 直接调用（推荐）

```bash
# 激活虚拟环境
source ~/.openclaw/skills/self-evolving-skill/venv/bin/activate

# 列出所有Skill
python3 ~/.openclaw/skills/self-evolving-skill/mcporter_adapter.py skill_list '{}'

# 创建新Skill
python3 ~/.openclaw/skills/self-evolving-skill/mcporter_adapter.py skill_create '{"name":"MySkill"}'

# 分析嵌入
python3 ~/.openclaw/skills/self-evolving-skill/mcporter_adapter.py skill_analyze '{"embedding":[0.1,0.2,0.3]}'

# 系统统计
python3 ~/.openclaw/skills/self-evolving-skill/mcporter_adapter.py skill_stats '{}'
```

### 2. OpenClaw MCP调用

在OpenClaw中可直接调用MCP工具：

```json
{
  "tool": "skill_create",
  "arguments": {
    "name": "ProblemSolver",
    "description": "问题解决技能"
  }
}
```

### 3. 启动MCP服务器

```bash
# 前台运行
source ~/.openclaw/skills/self-evolving-skill/venv/bin/activate
python3 ~/.openclaw/skills/self-evolving-skill/mcp_server.py --storage ~/.openclaw/skills/self-evolving-skill/storage

# 或通过配置自动启动（已在mcp_servers.json中配置）
```

## MCP工具

| 工具 | 描述 | 参数 |
|------|------|------|
| `skill_create` | 创建新的自演化Skill | `name`, `description` |
| `skill_execute` | 执行Skill并触发学习 | `skill_id`, `context`, `success`, `value` |
| `skill_analyze` | 分析嵌入向量（不触发学习） | `embedding` |
| `skill_list` | 列出所有已保存的Skill | - |
| `skill_stats` | 获取系统统计信息 | - |
| `skill_save` | 持久化保存Skill | `skill_id` |
| `skill_load` | 加载已保存的Skill | `skill_id` |
| `skill_clear` | 清空所有数据和缓存 | - |

## 测试结果

```
=== skill_list ===
Skills: 20

=== skill_create ===
{"skill_id":"1ac4a2cb3f79347f","name":"TestOpenClaw"}

=== skill_analyze ===
{
  "total_energy": 0.55,
  "residual_ratio": 0.086,
  "suggested_abstraction": "POLICY",
  "novelty_score": 0.657
}
```

## 核心算法

### 1. 残差金字塔分解

```python
pyramid = ResidualPyramid(max_layers=5, use_pca=True)
decomposition = pyramid.decompose(embedding)

# 输出:
# - residual_ratio: 残差能量比率
# - suggested_abstraction: POLICY / SUB_SKILL / PREDICATE
# - novelty_score: 综合新颖性
```

### 2. 三层跃迁规则

| 覆盖率 | 抽象层级 | 操作 |
|--------|---------|------|
| >80% | POLICY | 调整策略权重 |
| 40-80% | SUB_SKILL | 生成子Skill |
| <40% | PREDICATE | 归纳新谓词 |

### 3. 自适应阈值

```python
trigger = ReflectionTrigger(
  min_energy_ratio=0.10,     # 初始阈值
  value_gain_threshold=0.20, # 触发阈值
  target_trigger_rate=0.15   # 目标15%触发率
)
```

## OpenClaw配置

MCP服务器已配置在：

```json
// ~/.openclaw/agents/main/agent/mcp_servers.json
{
  "servers": {
    "self-evolving-skill": {
      "name": "self-evolving-skill",
      "type": "stdio",
      "command": "/bin/bash",
      "args": [
        "-c",
        "source ~/.openclaw/skills/self-evolving-skill/venv/bin/activate && python3 ~/.openclaw/skills/self-evolving-skill/mcp_server.py --storage ~/.openclaw/skills/self-evolving-skill/storage"
      ]
    }
  }
}
```

## 下一步

- [ ] 在OpenClaw中测试MCP工具调用
- [ ] 集成到Agent执行流程
- [ ] 添加强化学习策略优化

## 相关文档

- [SKILL.md](SKILL.md) - 完整技能文档
- [MEMORY.md](../../workspace/MEMORY.md) - 研究笔记
