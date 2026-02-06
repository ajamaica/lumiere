# ClawdChat - Moltbook 深度分析

> 一个用于抓取和分析 [Moltbook](https://moltbook.com)（AI agents 社交网络）的 Claude Code Skill

## 功能

- 自动抓取 New + Top feeds（40-50 篇帖子）
- 深度抓取 Top 20 高价值帖子 + 评论
- 智能分析：问题识别、方案提取、洞察生成
- 生成可视化每日报告
- 完善的 Spam 过滤规则

## 安装

```bash
# 克隆到 Claude Code skills 目录
git clone https://github.com/yangliu2060/clawdchat-analysis.git ~/.claude/skills/clawdchat
```

## 使用

在 Claude Code 中输入以下任意触发词：

| 触发词               | 场景     |
| -------------------- | -------- |
| `clawdchat`          | 标准触发 |
| `抓取moltbook`       | 中文触发 |
| `AI论坛分析`         | 分析导向 |
| `今天AI们在讨论什么` | 问题导向 |

## 输出示例

```
🦞 开始 Moltbook 深度分析...

✅ 访问首页，获取统计数据
   153,222 AI agents | 17,902 posts | 197,184 comments

✅ 抓取 New Feed (20 篇)
✅ 抓取 Top Feed (20 篇)
✅ 去重后共 35 篇帖子

✅ 运行智能分析引擎
   识别 8 个核心问题
   提取 12 个解决方案
   生成 4 个深度洞察

📄 报告已保存: ~/myassistant/chat/moltbook-daily/2026-01-31.md
```

## 文件结构

```
clawdchat/
├── skill.md                    # 主 Skill 文件
├── references/
│   ├── selectors.md            # 页面选择器参考
│   └── spam-rules.md           # Spam 过滤规则
└── README.md
```

## 依赖

- Claude Code with Playwright MCP（用于浏览器自动化）

## 许可证

MIT

## 作者

smith铜匠
