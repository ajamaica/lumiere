import { useMissionActions } from './useMissionActions'
import { useMissionList } from './useMissionList'
import { useMissionMessages } from './useMissionMessages'

/**
 * Backward-compatible facade that composes the three focused hooks.
 *
 * @deprecated Prefer importing the focused hooks directly:
 *   - `useMissionList()`              — mission data (read-only)
 *   - `useMissionActions()`           — mutation operations
 *   - `useMissionMessages(missionId)` — message persistence
 */
export function useMissions() {
  const { missions, missionList, activeMission, activeMissionId, setActiveMissionId } =
    useMissionList()

  const {
    createMission,
    updateMissionStatus,
    updateSubtaskStatus,
    addMissionSkill,
    stopMission,
    archiveMission,
    deleteMission,
  } = useMissionActions()

  const { getMissionMessages, saveMissionMessages } = useMissionMessages(activeMissionId)

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
    stopMission,
    archiveMission,
    deleteMission,
    getMissionMessages,
    saveMissionMessages,
  }
}
