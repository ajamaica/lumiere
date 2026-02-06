# 执行报告格式

## 报告结构

每次并行任务执行完成后，生成标准格式的执行报告。

### 报告模板

```json
{
  "execution_id": "exec_456",
  "timestamp": "2026-02-05T22:30:00Z",
  "total_tasks": 5,
  "completed": 4,
  "failed": 1,
  "success_rate": "80%",
  "duration": "45.2秒",
  "mode": "parallel",
  "config": {
    "max_concurrent": 4,
    "timeout": 30,
    "retries": 3
  },
  "tasks": [
    {
      "task_id": 1,
      "task_name": "创建文件",
      "command": "创建文件A",
      "status": "completed",
      "result": "成功",
      "duration": 2.1,
      "start_time": "2026-02-05T22:30:01Z",
      "end_time": "2026-02-05T22:30:03Z"
    },
    {
      "task_id": 2,
      "task_name": "下载文件",
      "command": "下载文件C",
      "status": "failed",
      "error": "网络超时",
      "error_code": "TIMEOUT",
      "retry_count": 3,
      "duration": 30.5,
      "start_time": "2026-02-05T22:30:01Z",
      "end_time": "2026-02-05T22:30:31Z"
    }
  ],
  "summary": {
    "avg_duration": "11.0秒",
    "max_duration": "30.5秒",
    "min_duration": "2.1秒",
    "failed_tasks": [
      {
        "task_id": 2,
        "task_name": "下载文件",
        "error": "网络超时"
      }
    ]
  }
}
```

### 任务状态代码

- `completed` - 成功完成
- `failed` - 执行失败
- `cancelled` - 被取消
- `timeout` - 超时
- `skipped` - 跳过

### 错误代码

- `TIMEOUT` - 执行超时
- `NETWORK_ERROR` - 网络错误
- `PERMISSION_DENIED` - 权限不足
- `FILE_NOT_FOUND` - 文件不存在
- `INVALID_INPUT` - 输入无效
- `UNKNOWN_ERROR` - 未知错误

## 详细任务报告

### 成功任务详情

```json
{
  "task_id": 1,
  "task_name": "创建文件",
  "command": "创建文件A",
  "status": "completed",
  "result": {
    "success": true,
    "output": "/Users/eric/fileA.txt",
    "metadata": {
      "size": 1024,
      "created_at": "2026-02-05T22:30:03Z"
    }
  },
  "duration": 2.1,
  "start_time": "2026-02-05T22:30:01Z",
  "end_time": "2026-02-05T22:30:03Z"
}
```

### 失败任务详情

```json
{
  "task_id": 2,
  "task_name": "下载文件",
  "command": "下载文件C",
  "status": "failed",
  "error": {
    "type": "network_error",
    "code": "TIMEOUT",
    "message": "网络连接超时，超过 30 秒",
    "retry_count": 3,
    "last_error": "Could not connect to server"
  },
  "duration": 30.5,
  "start_time": "2026-02-05T22:30:01Z",
  "end_time": "2026-02-05T22:30:31Z"
}
```

## 进度报告

### 实时进度

```json
{
  "execution_id": "exec_456",
  "total_tasks": 5,
  "completed": 2,
  "running": 2,
  "pending": 1,
  "progress": "40%",
  "eta": "预计剩余 30 秒"
}
```

### 任务队列状态

```json
{
  "total_tasks": 5,
  "pending_tasks": [
    { "task_id": 3, "command": "删除文件", "priority": "P2" },
    { "task_id": 4, "command": "移动文件", "priority": "P2" }
  ],
  "running_tasks": [
    { "task_id": 1, "command": "创建文件", "status": "completed" },
    { "task_id": 2, "command": "下载文件", "status": "running" }
  ]
}
```
