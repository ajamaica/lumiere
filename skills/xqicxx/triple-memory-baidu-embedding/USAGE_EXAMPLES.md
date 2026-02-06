# Triple Memory System with Baidu Embedding - 使用示例

## 环境配置

配置Baidu API凭据（可选，但推荐以获得完整功能）：

```bash
export BAIDU_API_STRING='your_bce_v3_api_string'
export BAIDU_SECRET_KEY='your_secret_key'
```

**注意**: 如果不配置API凭据，系统将在降级模式下运行，仅使用Git-Notes和文件系统搜索。

## 初始化会话

```bash
# 初始化会话，同步所有记忆系统
bash /root/clawd/skills/triple-memory-baidu-embedding/scripts/triple-integration.sh init-session
```

## 记忆操作示例

### 记住重要信息
```bash
# 记住用户偏好，重要性等级为高
bash /root/clawd/skills/triple-memory-baidu-embedding/scripts/triple-integration.sh remember "用户喜欢简洁的回复风格" h preferences

# 记住技术决策
bash /root/clawd/skills/triple-memory-baidu-embedding/scripts/triple-integration.sh remember "决定使用Python作为主要开发语言，因为团队熟悉度高" h technology

# 记住一般信息
bash /root/clawd/skills/triple-memory-baidu-embedding/scripts/triple-integration.sh remember "今天讨论了项目架构设计" n general
```

## 搜索示例

### 在所有记忆系统中搜索
```bash
# 搜索用户偏好
bash /root/clawd/skills/triple-memory-baidu-embedding/scripts/triple-integration.sh search-all "用户偏好"

# 搜索技术相关决策
bash /root/clawd/skills/triple-memory-baidu-embedding/scripts/triple-integration.sh search-all "技术决策"

# 搜索特定话题
bash /root/clawd/skills/triple-memory-baidu-embedding/scripts/triple-integration.sh search-all "Python开发"
```

**注意**: 如果没有配置API凭据，搜索将跳过Baidu Embedding语义搜索，仅使用Git-Notes和文件系统搜索。

## 状态检查

```bash
# 检查所有记忆系统状态
bash /root/clawd/skills/triple-memory-baidu-embedding/scripts/triple-integration.sh status
```

## 单独使用Baidu Embedding工具

### 存储到Baidu Embedding
```bash
# 存储信息到Baidu Embedding记忆库（需要API凭据）
bash /root/clawd/skills/triple-memory-baidu-embedding/scripts/baidu-memory-tools.sh store "这是一个重要的技术要点"
```

### 搜索Baidu Embedding记忆
```bash
# 搜索Baidu Embedding记忆库（需要API凭据）
bash /root/clawd/skills/triple-memory-baidu-embedding/scripts/baidu-memory-tools.sh search "技术要点" 5
```

**注意**: 如果没有配置API凭据，这些Baidu Embedding操作将无法执行，系统将仅使用Git-Notes和文件系统进行存储和搜索。

## 工作流程示例

### 典型的一天工作流程
```bash
# 1. 开始工作前初始化会话
bash /root/clawd/skills/triple-memory-baidu-embedding/scripts/triple-integration.sh init-session

# 2. 记住当天的重要决策
bash /root/clawd/skills/triple-memory-baidu-embedding/scripts/triple-integration.sh remember "今天决定重构API模块以提高性能" h refactoring

# 3. 需要回顾之前的信息时
bash /root/clawd/skills/triple-memory-baidu-embedding/scripts/triple-integration.sh search-all "API设计"

# 4. 结束工作时检查状态
bash /root/clawd/skills/triple-memory-baidu-embedding/scripts/triple-integration.sh status
```

## Hook集成示例

### 网关启动集成
为了确保在网关启动时自动初始化三重记忆系统，可以使用以下脚本：

```bash
# 网关启动时运行的初始化脚本
bash /root/clawd/session-init-triple-baidu.sh

# 或者通过集成脚本
bash /root/clawd/skills/triple-memory-baidu-embedding/scripts/triple-integration.sh init-session
```

### 与开机Hook集成
如果要与Clawdbot的开机Hook系统集成，可以配置hook运行以下命令：
```bash
# 开机Hook中运行
source /root/clawd/memory-helpers.sh
check_triple_baidu_status
```

## 故障排除

### API凭据问题
如果收到API凭据错误，确保设置了正确的环境变量：
```bash
echo $BAIDU_API_STRING
echo $BAIDU_SECRET_KEY
```

### Git-Notes问题
如果Git-Notes无法同步，检查Git是否正确安装：
```bash
git --version
```

### 文件系统问题
确保有适当的文件系统权限：
```bash
ls -la /root/clawd/memory/
```

## 性能优化建议

1. **定期清理**：不重要的记忆可以使用较低的重要性等级
2. **标签使用**：使用有意义的标签便于后续搜索
3. **分层搜索**：对于频繁查询的信息，可以结合使用分层搜索功能
4. **API配额管理**：注意Baidu API的使用配额

## 与其他系统的集成

此技能可以与我们之前创建的分层搜索系统集成：
```bash
# 使用分层搜索补充三重记忆搜索
bash /root/clawd/hierarchical_memory_search.sh "搜索内容"
```