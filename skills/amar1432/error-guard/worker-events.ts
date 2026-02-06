// error-guard: worker-side helpers to emit task events
// These functions are intended to be used inside sub-agents.

import { event } from "./events";
import { sessions_send } from "@openclaw/sdk" as any;

interface EmitOpts {
  sessionKey?: string; // main session
  taskId: string;
  meta?: Record<string, any>;
}

async function emit(type: any, opts: EmitOpts) {
  const payload = event(opts.taskId, type, opts.meta);
  await sessions_send({
    sessionKey: opts.sessionKey,
    message: JSON.stringify(payload)
  });
}

export async function started(opts: EmitOpts) {
  return emit("task.started", opts);
}

export async function heartbeat(opts: EmitOpts) {
  return emit("task.heartbeat", opts);
}

export async function progress(opts: EmitOpts) {
  return emit("task.progress", opts);
}

export async function completed(opts: EmitOpts) {
  return emit("task.completed", opts);
}

export async function failed(opts: EmitOpts) {
  return emit("task.failed", opts);
}

export async function cancelled(opts: EmitOpts) {
  return emit("task.cancelled", opts);
}
