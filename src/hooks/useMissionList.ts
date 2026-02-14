import { useAtom, useAtomValue } from 'jotai'
import { useMemo } from 'react'

import { activeMissionIdAtom, missionsAtom } from '../store'
import type { Mission, MissionsDict } from '../store/missionTypes'

/**
 * Read-only hook for mission data: sanitized dict, sorted list, active mission.
 * Also exposes `setActiveMissionId` since it's commonly needed alongside reads.
 */
export function useMissionList() {
  const rawMissions = useAtomValue(missionsAtom)
  const [activeMissionId, setActiveMissionId] = useAtom(activeMissionIdAtom)

  // Sanitize: strip any null/corrupt entries that may linger in storage
  const missions = useMemo(() => {
    const clean: MissionsDict = {}
    for (const [k, v] of Object.entries(rawMissions)) {
      if (v != null && typeof v.updatedAt === 'number') clean[k] = v
    }
    return clean
  }, [rawMissions])

  // Sorted list — missions dict is already sanitized, no redundant filter needed
  const missionList = useMemo(
    () => Object.values(missions).sort((a, b) => b.updatedAt - a.updatedAt),
    [missions],
  )

  const activeMission = useMemo<Mission | null>(
    () => (activeMissionId ? (missions[activeMissionId] ?? null) : null),
    [missions, activeMissionId],
  )

  return {
    missions,
    missionList,
    activeMission,
    activeMissionId,
    setActiveMissionId,
  }
}
