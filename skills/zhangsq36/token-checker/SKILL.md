# token_checker

## 描述
每2小时查询一次当前的token剩余情况，并将结果发送到主会话。

## 版本
1.0.0

## 配置
无需额外配置。

## 使用方法
1. 确保你已经安装了`cron`工具。
2. 使用`clawdhub` CLI安装此技能。
3. 该技能会自动设置一个每2小时运行一次的cron任务。

## 实现
1. 创建一个cron任务，每2小时运行一次。
2. 在每次运行时，使用`session_status`工具获取当前的token使用情况。
3. 将结果发送到主会话。

## 文件结构
- `SKILL.md` - 技能描述文件
- `install.sh` - 安装脚本
- `check_token.sh` - 检查token的脚本