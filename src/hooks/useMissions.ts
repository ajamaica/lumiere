import { useAtom } from 'jotai'
import { useCallback, useMemo } from 'react'

import { activeMissionIdAtom, missionsAtom } from '../store/missionAtoms'
import type { Mission, MissionsDict, MissionStatus, MissionSubtask } from '../store/missionTypes'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

/**
 * Helper to safely resolve the prev value from atomWithStorage.
 * At runtime the value is always resolved, but the type includes Promise<T>.
 */
function resolvePrev(prev: MissionsDict | Promise<MissionsDict>): MissionsDict {
  return prev as MissionsDict
}

export function useMissions() {
  const [missions, setMissions] = useAtom(missionsAtom)
  const [activeMissionId, setActiveMissionId] = useAtom(activeMissionIdAtom)

  const missionList = useMemo(
    () => Object.values(missions).sort((a, b) => b.updatedAt - a.updatedAt),
    [missions],
  )

  const activeMission = useMemo(
    () => (activeMissionId ? (missions[activeMissionId] ?? null) : null),
    [missions, activeMissionId],
  )

  const createMission = useCallback(
    (params: {
      title: string
      prompt: string
      systemMessage: string
      subtasks: Pick<MissionSubtask, 'title'>[]
    }): Mission => {
      const id = generateId()
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
          status: 'pending' as const,
        })),
        skills: [],
        createdAt: now,
        updatedAt: now,
      }

      setMissions((raw) => {
        const prev = resolvePrev(raw)
        return { ...prev, [id]: mission }
      })
      setActiveMissionId(id)
      return mission
    },
    [setMissions, setActiveMissionId],
  )

  const updateMissionStatus = useCallback(
    (missionId: string, status: MissionStatus, extra?: Partial<Mission>) => {
      setMissions((raw) => {
        const prev = resolvePrev(raw)
        const existing = prev[missionId]
        if (!existing) return prev
        return {
          ...prev,
          [missionId]: {
            ...existing,
            status,
            updatedAt: Date.now(),
            ...extra,
          },
        }
      })
    },
    [setMissions],
  )

  const updateSubtaskStatus = useCallback(
    (missionId: string, subtaskId: string, status: MissionStatus, result?: string) => {
      setMissions((raw) => {
        const prev = resolvePrev(raw)
        const existing = prev[missionId]
        if (!existing) return prev
        return {
          ...prev,
          [missionId]: {
            ...existing,
            updatedAt: Date.now(),
            subtasks: existing.subtasks.map((s: MissionSubtask) =>
              s.id === subtaskId ? { ...s, status, ...(result !== undefined && { result }) } : s,
            ),
          },
        }
      })
    },
    [setMissions],
  )

  const addMissionSkill = useCallback(
    (missionId: string, skillName: string) => {
      setMissions((raw) => {
        const prev = resolvePrev(raw)
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

  const deleteMission = useCallback(
    (missionId: string) => {
      setMissions((raw) => {
        const prev = resolvePrev(raw)
        const next = { ...prev }
        delete next[missionId]
        return next
      })
      if (activeMissionId === missionId) {
        setActiveMissionId(null)
      }
    },
    [setMissions, activeMissionId, setActiveMissionId],
  )

  return {
    missions,
    missionList,
    activeMission,
    activeMissionId,
    setActiveMissionId,
    createMission,
    updateMissionStatus,
    updateSubtaskStatus,
    addMissionSkill,
    deleteMission,
  }
}
