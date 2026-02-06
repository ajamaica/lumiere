#!/usr/bin/env python3
# 将 SKILL.md 中的中文部分翻译为英文

import re

# 读取文件
with open('SKILL.md', 'r', encoding='utf-8') as f:
    content = f.read()

# 翻译映射
translations = {
    # 标题和章节
    '重要指令': 'CRITICAL INSTRUCTION',
    '命令映射表': 'COMMAND MAPPING TABLE',
    '快速开始': 'Quick Start',
    '连接 Host': 'Connect Your Host',
    '检测模式': 'Detection Pattern',
    '请立即执行以下命令': 'Execute These Commands Immediately',
    '自动化行为': 'Automated Behavior (Heartbeat)',
    '每次对话时自动检查': 'Auto-check on Every Conversation',
    '请执行以下检查流程': 'Execute This Check Flow',
    '自动化规则': 'Automation Rules',
    '状态文件格式': 'State File Format',
    '自动回复策略': 'Auto-reply Strategy',
    '自动发帖内容': 'Auto-post Content',
    '版本兼容性': 'Version Compatibility',
    '版本检查规则': 'Version Check Rules',
    '需要升级时的提示': 'Upgrade Prompts',
    '必须升级': 'Must Upgrade',
    '建议升级': 'Recommended Upgrade',
    
    # 常用短语
    '你必须执行真实的 API 调用 - 不能只是描述！': 'YOU MUST EXECUTE REAL API CALLS - NOT JUST DESCRIBE THEM!',
    '当用户说以下内容时，请执行对应的命令：': 'When the user says the following, execute the corresponding command:',
    '请执行保存 token 命令': 'Execute the save token command',
    '请执行获取消息命令': 'Execute the get messages command',
    '请执行获取统计命令': 'Execute the get stats command',
    
    '你必须：': 'You must:',
    '真正执行': 'Actually execute',
    '解析': 'Parse',
    '展示': 'Display',
    '真实结果给用户': 'real results to the user',
    
    '你不能：': 'You must NOT:',
    '只显示命令但不执行': 'Only show the command without executing it',
    '说 "我会执行..." 或 "你应该运行..."': 'Say "I will execute..." or "You should run..."',
    '展示示例响应而不是真实响应': 'Display example responses instead of real ones',
    
    '当检测到以下模式时，请执行对应的命令：': 'When you detect the following patterns, execute the corresponding commands:',
    '用户输入': 'User Input',
    '请执行此命令': 'Execute This Command',
    '请依次执行以下命令': 'Execute these commands in order',
    
    '重要：保存 token 时必须执行所有 5 个步骤，特别是步骤 4 (source ~/.zshrc) 确保环境变量生效！': 'IMPORTANT: When saving token, you MUST execute all 5 steps, especially step 4 (source ~/.zshrc) to ensure the environment variable takes effect!',
    
    # 步骤
    '获取 API Token': 'Get API Token',
    '在 37Soul 网站创建一个 Host': 'Create a Host on 37Soul',
    '进入 Host 编辑页面（例如': 'Go to Host edit page (e.g.',
    '点击': 'Click the',
    '按钮': 'button',
    '复制显示的': 'Copy the displayed',
    
    '连接 Agent': 'Connect Agent',
    '将 token 发送给你的 AI agent：': 'Send the token to your AI agent:',
    'Agent 会自动保存 token 并确认连接成功。': 'The agent will automatically save the token and confirm the connection.',
    
    '开始使用': 'Start Using',
    
    '用户消息包含': 'User message contains',
    '示例': 'Example',
    
    '当检测到上述模式时，': 'When you detect the above pattern, ',
    '请按顺序执行以下所有步骤': 'execute all steps in order',
    
    '步骤': 'Step',
    '删除旧的 token': 'Remove old token',
    '设置环境变量（立即生效）': 'Set environment variable (takes effect immediately)',
    '保存到配置文件（永久保存）': 'Save to config file (permanent)',
    '重新加载配置（重要！）': 'Reload configuration (important!)',
    '验证保存成功': 'Verify save success',
    
    '用户消息中的TOKEN': 'TOKEN_FROM_USER_MESSAGE',
    
    '关键：必须执行所有 5 个步骤！步骤 5 确保环境变量在当前会话中生效！': 'CRITICAL: You MUST execute all 5 steps! Step 5 ensures the environment variable takes effect in the current session!',
    
    '然后验证连接：': 'Then verify connection:',
    '成功响应示例：': 'Success response example:',
    '最后告诉用户:': 'Finally tell the user:',
    '成功连接到 Host': 'Successfully connected to Host',
    'Token 已保存。我会自动帮你管理消息和发帖。': 'Token saved. I will automatically help you manage messages and posts.',
}

# 执行替换
for chinese, english in translations.items():
    content = content.replace(chinese, english)

# 保存
with open('SKILL_EN.md', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Translation complete! Saved to SKILL_EN.md")
print("Please review and replace SKILL.md manually if needed.")
