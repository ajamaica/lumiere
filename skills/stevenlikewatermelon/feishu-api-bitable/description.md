# 飞书多维表格技能 (Feishu Bitable)

一个功能完整的飞书多维表格(Bitable)API技能，为Clawdbot提供强大的飞书多维表格操作能力。

## 功能亮点

### 📊 完整的数据表管理
- **列出数据表**：获取应用中的所有数据表
- **创建数据表**：支持自定义字段和属性
- **数据表详情**：获取表结构和元数据
- **删除数据表**：安全删除不需要的表

### 📝 强大的记录操作
- **CRUD操作**：完整的创建、读取、更新、删除功能
- **批量操作**：支持批量创建、更新、删除记录
- **高级查询**：支持过滤、排序、分页
- **字段映射**：自动处理不同字段类型的值转换

### 🔧 专业功能
- **字段管理**：查看和操作表字段
- **视图管理**：获取多维表格视图信息
- **自动Token刷新**：无需手动处理认证过期
- **错误处理**：完善的错误处理和重试机制

## 技术特性

### 🚀 高性能
- **异步操作**：所有API调用都是异步的
- **连接池**：复用HTTP连接提高性能
- **批量处理**：优化批量操作减少API调用次数

### 🛡️ 可靠性
- **自动重试**：网络错误时自动重试
- **Token刷新**：自动处理飞书token过期
- **参数验证**：严格的输入参数验证
- **错误处理**：友好的错误消息和诊断信息

### 🔌 易用性
- **命令行工具**：完整的CLI接口
- **JSON支持**：支持直接JSON或文件输入
- **环境变量**：灵活的配置方式
- **详细文档**：完整的示例和使用说明

## 使用场景

### 🏢 企业自动化
- **任务管理**：自动同步任务状态到飞书
- **数据同步**：从其他系统导入数据到飞书
- **报表生成**：自动生成业务报表
- **审批流程**：集成飞书审批和工作流

### 👥 团队协作
- **项目管理**：团队任务跟踪和分配
- **客户管理**：CRM数据管理和分析
- **库存管理**：商品库存跟踪和预警
- **日程安排**：团队日程和会议管理

### 🔄 系统集成
- **API集成**：与其他系统API集成
- **数据管道**：构建数据ETL管道
- **实时同步**：实时数据同步和更新
- **监控告警**：系统监控和自动告警

## 安装和使用

### 快速开始
```bash
# 通过ClawdHub安装
clawdhub install feishu-bitable

# 进入技能目录
cd skills/feishu-bitable

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑.env文件，填入你的飞书应用凭证

# 测试连接
node bin/cli.js test
```

### 基本示例
```bash
# 列出所有数据表
node bin/cli.js list-tables --app-token basxxxxxx

# 创建新表
node bin/cli.js create-table --app-token basxxxxxx --name "项目任务"

# 添加任务
node bin/cli.js create-record --app-token basxxxxxx --table-id tblxxxxxx \
  --data '{"任务名称": "开发API", "状态": "进行中", "优先级": "高"}'

# 批量导入数据
node bin/cli.js batch-create --app-token basxxxxxx --table-id tblxxxxxx \
  --data @examples/create-records.json
```

## 与其他技能集成

### 🤝 飞书生态
- **feishu-bridge**：通过飞书机器人接收指令
- **feishu-docx-powerwrite**：将表格数据生成精美文档
- **feishu-card**：发送表格更新通知卡片
- **feishu-calendar**：同步日程和截止日期

### 🔗 数据工具
- **google-sheet-api**：与Google Sheets数据同步
- **notion**：与Notion数据库双向同步
- **database**：与传统数据库集成
- **csv-export**：导出数据为CSV格式

## 开发指南

### 扩展功能
技能采用模块化设计，易于扩展：
- `src/api.js` - 核心API客户端
- `src/utils.js` - 工具函数库
- `bin/cli.js` - 命令行接口

### 贡献
欢迎贡献代码和功能：
1. Fork项目
2. 创建功能分支
3. 提交更改
4. 创建Pull Request

## 许可证

MIT License - 免费用于商业和个人项目。

## 支持

- 文档：查看SKILL.md获取详细API文档
- 问题：在GitHub Issues报告问题
- 社区：加入Clawdbot Discord社区获取帮助

---

**让飞书多维表格成为你的数据中枢，释放自动化潜能！**