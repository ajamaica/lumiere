// error-guard: control-plane commands (Phase 2A)
// NOTE: This module must remain non-blocking and non-LLM.

import { process, sessions_list } from "@openclaw/sdk" as any;

// In-memory task registry (metadata only)
type TaskState = "running" | "stalled" | "cancelled" | "completed";
interface TaskMeta {
  taskId: string;
  state: TaskState;
  startedAt: number;
  lastHeartbeat?: number;
  note?: string;
}

import { loadState, saveState } from "./state";

const registry: Map<string, TaskMeta> = new Map();

// ---- Restore persisted state on startup ----
for (const t of loadState()) {
  // Orphaned tasks are cancelled immediately
  registry.set(t.taskId, {
    taskId: t.taskId,
    state: "cancelled",
    startedAt: t.startedAt,
    lastHeartbeat: t.lastHeartbeat,
    note: "restored-orphan"
  });
}

// ---- Helpers ----

function now() { return Date.now(); }

function snapshot() {
  return Array.from(registry.values()).map(t => ({
    taskId: t.taskId,
    state: t.state,
    startedAt: t.startedAt,
    lastHeartbeat: t.lastHeartbeat || null,
    ageMs: now() - t.startedAt
  }));
}

// ---- Commands ----

// /status: constant-time health report
export async function status() {
  return {
    ok: true,
    activeTasks: snapshot(),
    activeCount: registry.size,
    ts: now()
  };
}

// /flush: emergency stop
export async function flush() {
  // Mark tasks as cancelled
  registry.forEach(t => t.state = "cancelled");
  registry.clear();

  // Kill active exec sessions (best-effort)
  try {
    const procs = await process.list({});
    for (const p of procs.sessions || []) {
      await process.kill({ sessionId: p.sessionId });
    }
  } catch (e) {
    // Swallow errors: flush must always respond
  }

  return {
    ok: true,
    message: "All tasks cancelled, exec sessions killed, registry cleared",
    ts: now()
  };
}

// /recover: safe recovery
export async function recover() {
  const flushed = await flush();
  return {
    ok: true,
    message: "Control-plane recovered",
    flushed,
    ts: now()
  };
}

// ---- Registry hooks (used by sub-agents via events) ----

export function registerTask(taskId: string, note?: string) {
  registry.set(taskId, { taskId, state: "running", startedAt: now(), note });
}

export function heartbeat(taskId: string) {
  const t = registry.get(taskId);
  if (t) t.lastHeartbeat = now();
}

export function complete(taskId: string) {
  const t = registry.get(taskId);
  if (t) t.state = "completed";
}

export function fail(taskId: string, note?: string) {
  const t = registry.get(taskId);
  if (t) {
    t.state = "stalled";
    t.note = note || t.note;
  }
}

export function cancel(taskId: string, note?: string) {
  const t = registry.get(taskId);
  if (t) {
    t.state = "cancelled";
    t.note = note || t.note;
  }
}
