# Self-Evolving Skill - OpenClaw集成

## 项目结构

```
self-evolving-skill/
├── core/                    # Python核心模块
│   ├── residual_pyramid.py   # 残差金字塔分解
│   ├── reflection_trigger.py  # 自适应触发器
│   ├── experience_replay.py  # 经验回放
│   ├── skill_engine.py       # 核心引擎
│   ├── storage.py           # 持久化
│   └── mcp_server.py        # MCP服务器
├── src/                     # TypeScript封装
│   ├── index.ts            # 主入口
│   ├── cli.ts              # CLI
│   └── mcp-tools.ts        # MCP工具定义
├── skills/                 # 供OpenClaw调用
│   └── self-evolving-skill/  # OpenClaw Skill
├── SKILL.md                # 技能文档
├── package.json
└── README.md
```

## 安装到OpenClaw

```bash
# 方式1: 链接到OpenClaw skills目录
cd skills/self-evolving-skill
npm install
npm run build

# 链接
ln -s $(pwd)/skills/self-evolving-skill ~/.openclaw/skills/self-evolving-skill

# 方式2: 通过ClawHub
clawhub install self-evolving-skill
```

## OpenClaw中调用

```typescript
// 直接调用MCP工具
const result = await useTool('skill_create', {
  name: 'ProblemSolver'
});

const analysis = await useTool('skill_analyze', {
  embedding: [0.1, 0.2, 0.3, ...]
});
```

## MCP工具列表

| 工具 | 描述 | 参数 |
|------|------|------|
| `skill_create` | 创建Skill | `name`, `description` |
| `skill_execute` | 执行并学习 | `skill_id`, `context`, `success` |
| `skill_analyze` | 分析嵌入 | `embedding` |
| `skill_list` | 列出Skills | - |
| `skill_stats` | 系统统计 | - |
| `skill_save` | 持久化保存 | `skill_id` |
| `skill_load` | 加载 | `skill_id` |

## 示例

```typescript
// 1. 创建Skill
const skill = await useTool('skill_create', {
  name: 'TextAnalyzer',
  description: '文本分析自学习Skill'
});

// 2. 执行并观察学习
const result = await useTool('skill_execute', {
  skill_id: skill.skill_id,
  context: { task: 'sentiment' },
  success: true,
  value: 1.0
});

console.log('反思触发:', result.reflection_triggered);

// 3. 分析新输入
const analysis = await useTool('skill_analyze', {
  embedding: generateEmbedding(text)
});
```

## 配置

在OpenClaw配置文件中：

```yaml
skills:
  self-evolving-skill:
    max_layers: 5
    energy_threshold: 0.1
    similarity_threshold: 0.85
    target_trigger_rate: 0.15
    storage_dir: ~/.openclaw/self-evolving
```
