# 微信本地数据结构参考

## 数据存储位置

### macOS

```
~/Library/Containers/com.tencent.xinWeChat/
└── Data/
    └── Library/
        └── Application Support/
            └── com.tencent.xinWeChat/
                └── {微信ID}/
                    ├── Contact.sqlite      # 联系人
                    ├── Session.sqlite      # 会话
                    ├── Chat.sqlite         # 聊天记录
                    └── Favorite.sqlite     # 收藏
```

### Windows

```
C:\Users\{用户名}\Documents\WeChat Files\{微信ID}\
├── Contact\Contact.db
├── Session\Session.db
└── Msg\Multi\MSG*.db
```

## 数据库表结构

### Contact.sqlite - 联系人

#### WCContact 表

| 字段       | 类型    | 说明       |
| ---------- | ------- | ---------- |
| UsrName    | TEXT    | 用户唯一ID |
| NickName   | TEXT    | 昵称       |
| Remark     | TEXT    | 备注名     |
| ConStrRes2 | TEXT    | 头像URL    |
| type       | INTEGER | 联系人类型 |

类型值：

- 1: 个人
- 2: 群聊
- 3: 公众号

### Session.sqlite - 会话

#### Session 表

| 字段        | 类型    | 说明                 |
| ----------- | ------- | -------------------- |
| UsrName     | TEXT    | 会话ID               |
| UnreadCount | INTEGER | 未读消息数           |
| lastTime    | INTEGER | 最后消息时间（毫秒） |
| digest      | TEXT    | 最后消息摘要         |
| flag        | INTEGER | 会话标志（置顶等）   |

### Chat.sqlite - 聊天记录

#### Chat_ftsMessage 表

| 字段          | 类型    | 说明             |
| ------------- | ------- | ---------------- |
| msgId         | INTEGER | 消息ID           |
| des           | TEXT    | 发送者ID         |
| msgContent    | TEXT    | 消息内容         |
| msgCreateTime | INTEGER | 创建时间（毫秒） |
| msgType       | INTEGER | 消息类型         |

消息类型：

- 1: 文本
- 3: 图片
- 34: 语音
- 43: 视频
- 47: 动画表情
- 49: 链接/文件

### Favorite.sqlite - 收藏

#### FavItem 表

| 字段       | 类型    | 说明     |
| ---------- | ------- | -------- |
| localId    | INTEGER | 收藏ID   |
| favType    | INTEGER | 收藏类型 |
| sourceId   | TEXT    | 来源ID   |
| updateTime | INTEGER | 更新时间 |
| xml        | TEXT    | 内容XML  |

收藏类型：

- 1: 文本
- 2: 图片
- 3: 语音
- 4: 视频
- 5: 网页
- 6: 位置
- 7: 文件
- 8: 笔记
- 14: 聊天记录

## 时间戳格式

微信使用**毫秒级 Unix 时间戳**（13位数字）。

```python
# 转换为可读时间
from datetime import datetime
timestamp_ms = 1705315800000  # 示例
dt = datetime.fromtimestamp(timestamp_ms / 1000)
print(dt.strftime("%Y-%m-%d %H:%M:%S"))
```

## SQLite 只读连接

```python
import sqlite3

# 只读模式（不会锁定数据库）
conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
```

## 安全注意事项

1. **只读访问**：始终使用 `mode=ro` 打开数据库
2. **备份数据**：操作前建议备份原始数据库
3. **隐私保护**：读取的数据包含个人隐私，不要分享
4. **权限控制**：确保只有授权用户能访问数据目录
