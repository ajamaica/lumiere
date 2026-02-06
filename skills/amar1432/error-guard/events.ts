// error-guard: event protocol definitions (Phase 3A)
// Pure data structures; no side effects.

export type TaskEventType =
  | 'task.started'
  | 'task.heartbeat'
  | 'task.progress'
  | 'task.completed'
  | 'task.failed'
  | 'task.cancelled'
  | 'task.timeout'

export interface TaskEvent {
  taskId: string
  type: TaskEventType
  ts: number
  meta?: Record<string, any>
}

export function now() {
  return Date.now()
}

export function event(taskId: string, type: TaskEventType, meta?: Record<string, any>): TaskEvent {
  return { taskId, type, ts: now(), meta }
}
