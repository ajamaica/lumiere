// error-guard: lightweight control-plane heartbeat
// Cheap, non-blocking, no I/O. Intended to be called periodically.

import { status } from "./control";
import { apply,evaluate } from "./watchdog";

const DEFAULTS = {
  ttlMs: 30 * 60 * 1000,      // 30 minutes hard TTL
  silenceMs: 5 * 60 * 1000    // 5 minutes without heartbeat
};

export async function heartbeatTick(opts = DEFAULTS) {
  const snap = await status();
  const tasks = (snap.activeTasks || []).map((t: any) => ({
    taskId: t.taskId,
    state: t.state,
    startedAt: t.startedAt,
    lastHeartbeat: t.lastHeartbeat
  }));

  const actions = evaluate(tasks, opts);
  if (actions.length) {
    await apply(actions);
  }

  return { ok: true, actions, ts: Date.now() };
}
