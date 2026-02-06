// error-guard: Moltbook worker
// Runs Moltbook checks in an isolated sub-agent and emits events to control-plane.
// NOTE: No direct registry access. Events only.

import { completed, failed,heartbeat, progress, started } from "./worker-events";

interface Ctx {
  sessionKey?: string; // main session key
  taskId: string;
}

async function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

// Placeholder fetch – replace with real Moltbook client later
async function fetchMoltbookActivity() {
  // Simulate variable network latency
  await sleep(400);
  // Simulate response
  return {
    newPosts: Math.random() < 0.3 ? 1 + Math.floor(Math.random() * 3) : 0,
    rateLimited: false
  };
}

export async function runMoltbook(ctx: Ctx) {
  try {
    await started({ sessionKey: ctx.sessionKey, taskId: ctx.taskId });

    // Phase: fetch activity
    await progress({ sessionKey: ctx.sessionKey, taskId: ctx.taskId, meta: { phase: "fetch" } });
    await heartbeat({ sessionKey: ctx.sessionKey, taskId: ctx.taskId });

    const res = await fetchMoltbookActivity();

    if (res.rateLimited) {
      await progress({
        sessionKey: ctx.sessionKey,
        taskId: ctx.taskId,
        meta: { phase: "rate-limited" }
      });
      // Backoff simulation
      await sleep(1000);
    }

    if (res.newPosts > 0) {
      await progress({
        sessionKey: ctx.sessionKey,
        taskId: ctx.taskId,
        meta: { phase: "updates", count: res.newPosts }
      });
    }

    await completed({
      sessionKey: ctx.sessionKey,
      taskId: ctx.taskId,
      meta: { newPosts: res.newPosts }
    });
  } catch (e: any) {
    await failed({
      sessionKey: ctx.sessionKey,
      taskId: ctx.taskId,
      meta: { error: String(e) }
    });
    throw e;
  }
}
