// error-guard: sub-agent runner helper (Phase 3A)
// Spawns long-running work in an isolated session.

import { sessions_spawn } from "@openclaw/sdk" as any;
import { registerTask } from "./control";

interface SpawnOpts {
  taskId: string;
  label?: string;
  message: string;
  timeoutSeconds?: number;
}

export async function spawnWorker(opts: SpawnOpts) {
  const { taskId, label, message, timeoutSeconds = 900 } = opts;

  // Register task immediately (control-plane)
  registerTask(taskId, label);

  // Spawn isolated sub-agent
  return sessions_spawn({
    task: message,
    label: label || taskId,
    runTimeoutSeconds: timeoutSeconds,
    cleanup: "delete"
  });
}
