// error-guard: watchdogs for TTL + silence detection
// Runs in control-plane context. Must be cheap and non-blocking.

import { cancel } from './control'

interface WatchdogOpts {
  ttlMs: number // hard max runtime
  silenceMs: number // max time without heartbeat
}

interface TaskView {
  taskId: string
  state: string
  startedAt: number
  lastHeartbeat?: number | null
}

export function evaluate(tasks: TaskView[], opts: WatchdogOpts) {
  const now = Date.now()
  const actions: Array<{ taskId: string; reason: string }> = []

  for (const t of tasks) {
    if (t.state !== 'running') continue

    // TTL breach
    if (now - t.startedAt > opts.ttlMs) {
      actions.push({ taskId: t.taskId, reason: 'ttl_exceeded' })
      continue
    }

    // Silence breach
    if (t.lastHeartbeat && now - t.lastHeartbeat > opts.silenceMs) {
      actions.push({ taskId: t.taskId, reason: 'silence_exceeded' })
    }
  }

  return actions
}

// Apply actions (soft-cancel first)
export async function apply(actions: Array<{ taskId: string; reason: string }>) {
  for (const a of actions) {
    cancel(a.taskId, a.reason)
  }
}
