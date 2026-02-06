# 调度算法说明

## 调度器架构

### 核心组件

```
┌─────────────────────────────────────────┐
│         任务接收器                       │
├─────────────────────────────────────────┤
│  1. 解析用户指令                          │
│  2. 识别任务类型                          │
│  3. 生成任务ID                            │
│  4. 设置默认优先级                        │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│         任务调度器                        │
├─────────────────────────────────────────┤
│  1. 优先级排序                            │
│  2. 依赖关系检查                          │
│  3. 资源分配                              │
│  4. 执行槽分配                            │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│         并发执行池                        │
├─────────────────────────────────────────┤
│  1. 任务执行                              │
│  2. 进度跟踪                              │
│  3. 错误处理                              │
│  4. 结果收集                              │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│         结果收集器                        │
├─────────────────────────────────────────┤
│  1. 合并结果                              │
│  2. 生成报告                              │
│  3. 错误通知                              │
└─────────────────────────────────────────┘
```

## 调度算法

### 1. 优先级排序算法

```python
def sort_by_priority(tasks):
    """
    按优先级排序任务
    P0 > P1 > P2 > P3
    同优先级按时间戳 FIFO
    """
    priority_order = {"P0": 0, "P1": 1, "P2": 2, "P3": 3}
    return sorted(
        tasks,
        key=lambda t: (
            priority_order.get(t.priority, 3),
            t.timestamp
        )
    )
```

### 2. 资源分配算法

```python
def allocate_resources(tasks, max_concurrent):
    """
    分配执行槽
    按优先级顺序分配
    """
    allocated = []
    for task in tasks:
        if len(allocated) >= max_concurrent:
            allocated.append(task)
        else:
            allocated.append(task)
    return allocated
```

### 3. 依赖关系处理算法

```python
def resolve_dependencies(tasks):
    """
    解析任务依赖关系
    """
    task_graph = {}
    for task in tasks:
        task_graph[task.id] = task

    def can_execute(task_id):
        task = task_graph[task_id]
        if not task.dependencies:
            return True
        return all(dep.status == "completed" for dep in task.dependencies)

    return {t.id: can_execute(t.id) for t in tasks}
```

### 4. 错误重试算法

```python
def retry_with_backoff(task, max_retries=3):
    """
    带指数退避的重试策略
    """
    import time
    base_delay = 1  # 秒
    for attempt in range(max_retries):
        try:
            result = execute_task(task)
            return result
        except Exception as e:
            if attempt == max_retries - 1:
                raise e
            delay = base_delay * (2 ** attempt)
            time.sleep(delay)
```

## 执行策略

### 策略1：优先级驱动

**适用场景：** 多任务并行，优先级差异明显

```json
{
  "策略": "优先级驱动",
  "规则": {
    "P0任务": "立即执行",
    "P1任务": "等待P0完成",
    "P2任务": "等待P1完成",
    "P3任务": "后台执行"
  },
  "并发控制": {
    "max_concurrent": 4,
    "P0": 2,
    "P1": 1,
    "P2": 1,
    "P3": 0
  }
}
```

### 策略2：时间驱动

**适用场景：** 任务时间固定，优先级差异小

```json
{
  "策略": "时间驱动",
  "规则": {
    "按任务开始时间排序",
    "先开始的任务先执行"
  },
  "并发控制": {
    "max_concurrent": 4,
    "FIFO队列"
  }
}
```

### 策略3：依赖驱动

**适用场景：** 任务有依赖关系

```json
{
  "策略": "依赖驱动",
  "规则": {
    "检查依赖任务状态",
    "只有依赖完成才能执行"
  },
  "执行顺序": {
    "无依赖": "并发执行",
    "有依赖": "串行执行"
  }
}
```

### 策略4：混合策略

**适用场景：** 通用场景

```json
{
  "策略": "混合策略",
  "规则": {
    "优先级：P0 > P1 > P2 > P3",
    "同优先级：按时间戳",
    "有依赖：优先级 + 依赖检查"
  },
  "并发控制": {
    "max_concurrent": 4,
    "优先级权重": {
      "P0": 10,
      "P1": 7,
      "P2": 4,
      "P3": 1
    }
  }
}
```

## 执行流程

### 阶段1：任务接收

```python
def receive_tasks(user_commands):
    """
    接收并解析用户指令
    """
    tasks = []
    for cmd in user_commands:
        task = Task(
            id=generate_id(),
            command=cmd,
            priority=auto_detect_priority(cmd),
            timestamp=datetime.now()
        )
        tasks.append(task)
    return tasks
```

### 阶段2：任务调度

```python
def schedule_tasks(tasks):
    """
    调度任务执行
    """
    # 1. 排序
    sorted_tasks = sort_by_priority(tasks)

    # 2. 依赖检查
    dependency_map = resolve_dependencies(sorted_tasks)

    # 3. 分配执行槽
    allocated_tasks = allocate_resources(
        [t for t in sorted_tasks if dependency_map[t.id]],
        max_concurrent=4
    )

    return allocated_tasks
```

### 阶段3：并发执行

```python
def execute_tasks(tasks):
    """
    并发执行任务
    """
    results = []
    for task in tasks:
        result = execute_with_retry(task)
        results.append({
            "task_id": task.id,
            "result": result,
            "status": result.status if result else "failed"
        })
    return results
```

### 阶段4：结果收集

```python
def collect_results(tasks, results):
    """
    收集并整理结果
    """
    report = {
        "execution_id": generate_id(),
        "total_tasks": len(tasks),
        "completed": sum(1 for r in results if r.status == "completed"),
        "failed": sum(1 for r in results if r.status == "failed"),
        "success_rate": f"{sum(1 for r in results if r.status == 'completed') / len(results) * 100:.1f}%",
        "tasks": results
    }
    return report
```

## 调度监控

### 实时监控

```python
def monitor_scheduler():
    """
    监控调度器状态
    """
    return {
        "total_tasks": scheduler.total_tasks,
        "pending_tasks": scheduler.pending_tasks,
        "running_tasks": scheduler.running_tasks,
        "completed_tasks": scheduler.completed_tasks,
        "failed_tasks": scheduler.failed_tasks,
        "queue_size": len(scheduler.task_queue),
        "current_execution": scheduler.current_execution
    }
```

### 性能指标

```json
{
  "metrics": {
    "avg_execution_time": "25.3秒",
    "total_execution_time": "2分30秒",
    "throughput": "2.0 任务/分钟",
    "success_rate": "95%",
    "avg_concurrent": "3.2"
  }
}
```
