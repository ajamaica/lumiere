import { useCallback, useRef } from 'react'

import type { Mission, MissionStatus } from '../store/missionTypes'

export interface MissionUpdate {
  type:
    | 'subtask_complete'
    | 'waiting_input'
    | 'suggest_skill'
    | 'mission_complete'
    | 'mission_error'
  subtaskId?: string
  skillName?: string
  reason?: string
}

const MARKERS = {
  subtaskComplete: /\[SUBTASK_COMPLETE:([\w-]+)\]/g,
  waitingInput: /\[WAITING_INPUT\]/g,
  suggestSkill: /\[SUGGEST_SKILL:([\w\s-]+)\]/g,
  missionComplete: /\[MISSION_COMPLETE\]/g,
  missionError: /\[MISSION_ERROR:([^\]]+)\]/g,
}

export function useMissionEventParser() {
  const bufferRef = useRef('')

  const parseChunk = useCallback((chunk: string): MissionUpdate[] => {
    bufferRef.current += chunk
    const updates: MissionUpdate[] = []
    const text = bufferRef.current

    let match: RegExpExecArray | null

    // Reset lastIndex before each scan
    MARKERS.subtaskComplete.lastIndex = 0
    while ((match = MARKERS.subtaskComplete.exec(text)) !== null) {
      updates.push({ type: 'subtask_complete', subtaskId: match[1] })
    }

    MARKERS.waitingInput.lastIndex = 0
    if (MARKERS.waitingInput.test(text)) {
      updates.push({ type: 'waiting_input' })
    }

    MARKERS.suggestSkill.lastIndex = 0
    while ((match = MARKERS.suggestSkill.exec(text)) !== null) {
      updates.push({ type: 'suggest_skill', skillName: match[1].trim() })
    }

    MARKERS.missionComplete.lastIndex = 0
    if (MARKERS.missionComplete.test(text)) {
      updates.push({ type: 'mission_complete' })
    }

    MARKERS.missionError.lastIndex = 0
    match = MARKERS.missionError.exec(text)
    if (match) {
      updates.push({ type: 'mission_error', reason: match[1] })
    }

    // Only clear buffer when we found markers (they've been consumed)
    if (updates.length > 0) {
      bufferRef.current = ''
    }

    // Keep buffer from growing unbounded
    if (bufferRef.current.length > 2000) {
      bufferRef.current = bufferRef.current.slice(-500)
    }

    return updates
  }, [])

  const resetBuffer = useCallback(() => {
    bufferRef.current = ''
  }, [])

  return { parseChunk, resetBuffer }
}

/**
 * Strip mission protocol markers from text before displaying to the user.
 */
export function stripMissionMarkers(text: string): string {
  return text
    .replace(/\[SUBTASK_COMPLETE:[\w-]+\]/g, '')
    .replace(/\[WAITING_INPUT\]/g, '')
    .replace(/\[SUGGEST_SKILL:[\w\s-]+\]/g, '')
    .replace(/\[MISSION_COMPLETE\]/g, '')
    .replace(/\[MISSION_ERROR:[^\]]+\]/g, '')
    .trim()
}

/**
 * Derive the overall mission status from its subtasks.
 */
export function deriveMissionStatus(mission: Mission): MissionStatus {
  if (mission.status === 'error') return 'error'
  if (mission.status === 'idle') return 'idle'

  const allDone = mission.subtasks.every((s) => s.status === 'completed')
  if (allDone && mission.subtasks.length > 0) return 'completed'

  const anyInProgress = mission.subtasks.some((s) => s.status === 'in_progress')
  if (anyInProgress) return 'in_progress'

  return mission.status
}
