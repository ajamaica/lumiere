import { useSetAtom } from 'jotai'
import { useCallback } from 'react'

import { activeMissionIdAtom, missionMessagesAtom, missionsAtom } from '../store'
import type { Mission, MissionStatus, MissionSubtask, SubtaskSubagent } from '../store/missionTypes'
import { generateId } from '../utils/generateId'

/**
 * Write-only hook for mission mutations. Uses `useSetAtom` so consumers
 * do not re-render when mission data changes — only when their own local
 * state changes.
 */
export function useMissionActions() {
  const setMissions = useSetAtom(missionsAtom)
  const setActiveMissionId = useSetAtom(activeMissionIdAtom)
  const setMissionMessages = useSetAtom(missionMessagesAtom)

  // Shared helper: patch a single mission's fields + bump updatedAt
  const patchMission = useCallback(
    (missionId: string, patch: Partial<Mission>) => {
      setMissions((prev) => {
        const existing = prev[missionId]
        if (!existing) return prev
        return {
          ...prev,
          [missionId]: { ...existing, updatedAt: Date.now(), ...patch },
        }
      })
    },
    [setMissions],
  )

  const createMission = useCallback(
    (params: {
      title: string
      prompt: string
      systemMessage: string
      subtasks: Pick<MissionSubtask, 'title' | 'description'>[]
    }): Mission => {
      const id = generateId('mission')
      const sessionKey = `agent:main:mission-${id}`
      const now = Date.now()

      const mission: Mission = {
        id,
        title: params.title,
        prompt: params.prompt,
        systemMessage: params.systemMessage,
        sessionKey,
        status: 'pending',
        subtasks: params.subtasks.map((s, i) => ({
          id: `subtask-${i + 1}`,
          title: s.title,
          ...(s.description && { description: s.description }),
          status: 'pending' as const,
        })),
        skills: [],
        createdAt: now,
        updatedAt: now,
      }

      setMissions((prev) => ({ ...prev, [id]: mission }))
      setActiveMissionId(id)
      return mission
    },
    [setMissions, setActiveMissionId],
  )

  const updateMissionStatus = useCallback(
    (missionId: string, status: MissionStatus, extra?: Partial<Mission>) => {
      patchMission(missionId, { status, ...extra })
    },
    [patchMission],
  )

  const updateSubtaskStatus = useCallback(
    (missionId: string, subtaskId: string, status: MissionStatus, result?: string) => {
      setMissions((prev) => {
        const existing = prev[missionId]
        if (!existing) return prev
        return {
          ...prev,
          [missionId]: {
            ...existing,
            updatedAt: Date.now(),
            subtasks: existing.subtasks.map((s) =>
              s.id === subtaskId ? { ...s, status, ...(result !== undefined && { result }) } : s,
            ),
          },
        }
      })
    },
    [setMissions],
  )

  /** Track a newly spawned sub-agent against a specific subtask. */
  const addSubagentToSubtask = useCallback(
    (missionId: string, subtaskId: string, subagent: SubtaskSubagent) => {
      setMissions((prev) => {
        const existing = prev[missionId]
        if (!existing) return prev
        return {
          ...prev,
          [missionId]: {
            ...existing,
            updatedAt: Date.now(),
            subtasks: existing.subtasks.map((s) => {
              if (s.id !== subtaskId) return s
              const current = s.subagents ?? []
              // Don't add if already tracked
              if (current.some((sa) => sa.runId === subagent.runId)) return s
              return { ...s, subagents: [...current, subagent] }
            }),
          },
        }
      })
    },
    [setMissions],
  )

  /** Update the status/result of a sub-agent run. */
  const updateSubagentStatus = useCallback(
    (missionId: string, runId: string, status: SubtaskSubagent['status'], result?: string) => {
      setMissions((prev) => {
        const existing = prev[missionId]
        if (!existing) return prev
        return {
          ...prev,
          [missionId]: {
            ...existing,
            updatedAt: Date.now(),
            subtasks: existing.subtasks.map((s) => {
              if (!s.subagents?.some((sa) => sa.runId === runId)) return s
              return {
                ...s,
                subagents: s.subagents!.map((sa) => {
                  if (sa.runId !== runId) return sa
                  return {
                    ...sa,
                    status,
                    ...(result !== undefined && { result }),
                    ...(status !== 'running' && { completedAt: Date.now() }),
                  }
                }),
              }
            }),
          },
        }
      })
    },
    [setMissions],
  )

  const addMissionSkill = useCallback(
    (missionId: string, skillName: string) => {
      setMissions((prev) => {
        const existing = prev[missionId]
        if (!existing || existing.skills.includes(skillName)) return prev
        return {
          ...prev,
          [missionId]: {
            ...existing,
            updatedAt: Date.now(),
            skills: [...existing.skills, skillName],
          },
        }
      })
    },
    [setMissions],
  )

  const stopMission = useCallback(
    (missionId: string) => {
      patchMission(missionId, { status: 'stopped' })
    },
    [patchMission],
  )

  const archiveMission = useCallback(
    (missionId: string) => {
      patchMission(missionId, { status: 'archived' })
      // Functional updater avoids stale closure over activeMissionId
      setActiveMissionId((prev) => (prev === missionId ? null : prev))
    },
    [patchMission, setActiveMissionId],
  )

  const deleteMission = useCallback(
    (missionId: string) => {
      setMissions((prev) => {
        const next = { ...prev }
        delete next[missionId]
        return next
      })
      setMissionMessages((prev) => {
        if (!prev[missionId]) return prev
        const next = { ...prev }
        delete next[missionId]
        return next
      })
      // Functional updater avoids stale closure over activeMissionId
      setActiveMissionId((prev) => (prev === missionId ? null : prev))
    },
    [setMissions, setMissionMessages, setActiveMissionId],
  )

  return {
    createMission,
    updateMissionStatus,
    updateSubtaskStatus,
    addSubagentToSubtask,
    updateSubagentStatus,
    addMissionSkill,
    stopMission,
    archiveMission,
    deleteMission,
    setActiveMissionId,
  }
}
