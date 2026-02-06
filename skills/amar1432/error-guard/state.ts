// error-guard: minimal registry persistence
// Persists task metadata only (no payloads, no secrets).

import fs from 'fs'
import path from 'path'

const STATE_PATH = path.join(process.cwd(), 'skills/error-guard/state.json')

export interface PersistedTask {
  taskId: string
  state: string
  startedAt: number
  lastHeartbeat?: number | null
  note?: string
}

export function loadState(): PersistedTask[] {
  try {
    if (!fs.existsSync(STATE_PATH)) return []
    const raw = fs.readFileSync(STATE_PATH, 'utf8')
    return JSON.parse(raw) || []
  } catch {
    return []
  }
}

export function saveState(tasks: PersistedTask[]) {
  try {
    fs.writeFileSync(STATE_PATH, JSON.stringify(tasks, null, 2))
  } catch {
    // Persistence failure must never break control-plane
  }
}
