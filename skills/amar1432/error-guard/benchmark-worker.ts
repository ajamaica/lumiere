// error-guard: example benchmark worker (Option A)
// Runs benchmarks in a sub-agent and emits events back to the main session.

import { completed, failed,heartbeat, progress, started } from "./worker-events";

interface Ctx {
  sessionKey?: string; // main session key (injected by runner)
  taskId: string;
}

async function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

export async function runBenchmark(ctx: Ctx) {
  try {
    await started({ sessionKey: ctx.sessionKey, taskId: ctx.taskId });

    // Phase 1: latency probe (simulated)
    await progress({ sessionKey: ctx.sessionKey, taskId: ctx.taskId, meta: { phase: "latency" } });
    await sleep(300);
    await heartbeat({ sessionKey: ctx.sessionKey, taskId: ctx.taskId });

    // Phase 2: reasoning probe (simulated)
    await progress({ sessionKey: ctx.sessionKey, taskId: ctx.taskId, meta: { phase: "reasoning" } });
    await sleep(600);
    await heartbeat({ sessionKey: ctx.sessionKey, taskId: ctx.taskId });

    // Phase 3: coding probe (simulated)
    await progress({ sessionKey: ctx.sessionKey, taskId: ctx.taskId, meta: { phase: "coding" } });
    await sleep(500);
    await heartbeat({ sessionKey: ctx.sessionKey, taskId: ctx.taskId });

    // Phase 4: long-context probe (simulated)
    await progress({ sessionKey: ctx.sessionKey, taskId: ctx.taskId, meta: { phase: "long-context" } });
    await sleep(800);

    await completed({ sessionKey: ctx.sessionKey, taskId: ctx.taskId, meta: { ok: true } });
  } catch (e: any) {
    await failed({ sessionKey: ctx.sessionKey, taskId: ctx.taskId, meta: { error: String(e) } });
    throw e;
  }
}
