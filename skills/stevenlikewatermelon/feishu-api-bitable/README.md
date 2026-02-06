# 飞书多维表格技能

这是一个用于操作飞书多维表格(Bitable)的Clawdbot技能。

## 快速开始

### 1. 安装依赖
```bash
cd skills/feishu-bitable
npm install
```

### 2. 配置环境变量
创建 `.env` 文件：
```bash
FEISHU_APP_ID=cli_xxxxxx
FEISHU_APP_SECRET=your_app_secret
```

或者使用密钥文件：
```bash
FEISHU_APP_ID=cli_xxxxxx
FEISHU_APP_SECRET_PATH=~/.clawdbot/secrets/feishu_app_secret
```

### 3. 测试连接
```bash
node bin/cli.js test
```

## 基本用法

### 列出数据表
```bash
node bin/cli.js list-tables --app-token basxxxxxx
```

### 创建数据表
```bash
node bin/cli.js create-table \
  --app-token basxxxxxx \
  --name "任务管理" \
  --fields @examples/create-table.json
```

### 创建记录
```bash
node bin/cli.js create-record \
  --app-token basxxxxxx \
  --table-id tblxxxxxx \
  --data '{"任务名称": "测试任务", "状态": "待办"}'
```

### 批量创建记录
```bash
node bin/cli.js batch-create \
  --app-token basxxxxxx \
  --table-id tblxxxxxx \
  --data @examples/create-records.json
```

### 列出记录
```bash
node bin/cli.js list-records \
  --app-token basxxxxxx \
  --table-id tblxxxxxx \
  --page-size 50
```

### 更新记录
```bash
node bin/cli.js update-record \
  --app-token basxxxxxx \
  --table-id tblxxxxxx \
  --record-id recxxxxxx \
  --data '{"状态": "已完成", "完成百分比": 100}'
```

### 删除记录
```bash
node bin/cli.js delete-record \
  --app-token basxxxxxx \
  --table-id tblxxxxxx \
  --record-id recxxxxxx
```

## 在Clawdbot中使用

### 1. 确保技能已安装
技能应该位于 `skills/feishu-bitable` 目录。

### 2. 设置环境变量
在Clawdbot配置中设置：
```json
{
  "env": {
    "FEISHU_APP_ID": "cli_xxxxxx",
    "FEISHU_APP_SECRET": "your_app_secret"
  }
}
```

### 3. 在对话中使用
Clawdbot可以调用此技能来操作飞书多维表格。

## API参考

### 数据表操作
- `list-tables` - 列出数据表
- `create-table` - 创建数据表
- `get-table` - 获取数据表详情（待实现）
- `delete-table` - 删除数据表（待实现）

### 记录操作
- `list-records` - 列出记录
- `create-record` - 创建记录
- `batch-create` - 批量创建记录
- `update-record` - 更新记录
- `delete-record` - 删除记录

### 字段操作
- `list-fields` - 列出字段

### 视图操作
- `list-views` - 列出视图

## 字段类型映射

| 字段类型 | API类型 | 示例值 |
|---------|---------|--------|
| 文本 | text | "Hello World" |
| 数字 | number | 123.45 |
| 单选 | single_select | {"name": "选项1"} |
| 多选 | multi_select | [{"name": "选项1"}, {"name": "选项2"}] |
| 日期 | date | {"start": "2024-01-01"} |
| 人员 | user | {"id": "user_id"} |
| 复选框 | checkbox | true |
| 附件 | attachment | {"file_token": "token"} |

## 错误处理

技能包含完整的错误处理：
- 网络错误重试
- Token自动刷新
- 参数验证
- 友好的错误消息

## 注意事项

1. **权限**：确保飞书应用有 `bitable:record:readonly` 和 `bitable:record:write` 权限
2. **速率限制**：飞书API有速率限制，建议添加适当的延迟
3. **数据大小**：单次请求不要超过100条记录
4. **字段名称**：字段名称在表中必须唯一

## 开发

### 项目结构
```
feishu-bitable/
├── src/
│   ├── api.js          # API客户端
│   └── utils.js        # 工具函数
├── bin/
│   └── cli.js          # 命令行接口
├── examples/           # 示例文件
├── package.json        # 依赖配置
├── SKILL.md           # 技能文档
└── README.md          # 使用说明
```

### 添加新功能
1. 在 `src/api.js` 中添加新的API方法
2. 在 `bin/cli.js` 中添加对应的命令
3. 更新文档

## 许可证

MIT