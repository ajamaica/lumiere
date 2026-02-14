import { useAtom } from 'jotai'
import { useCallback, useEffect, useRef } from 'react'

import { missionMessagesAtom } from '../store'
import type { MissionMessagesDict, SerializedMessage } from '../store/missionTypes'

const DEBOUNCE_MS = 300

/**
 * Hook for reading and persisting mission chat messages.
 *
 * - `getMissionMessages` has a stable identity (uses a ref internally)
 *   so it won't cause downstream effects to re-run on every message change.
 * - `saveMissionMessages` is debounced (300 ms) to reduce storage writes
 *   during rapid streaming. Pending writes are flushed on unmount.
 */
export function useMissionMessages(_missionId: string | null) {
  const [rawMissionMessages, setMissionMessages] = useAtom(missionMessagesAtom)

  // Ref keeps getMissionMessages identity stable across message changes
  const messagesRef = useRef<MissionMessagesDict>(rawMissionMessages)
  useEffect(() => {
    messagesRef.current = rawMissionMessages
  }, [rawMissionMessages])

  const getMissionMessages = useCallback((id: string): SerializedMessage[] => {
    return messagesRef.current[id] ?? []
  }, [])

  // Debounced persistence
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<{ id: string; messages: SerializedMessage[] } | null>(null)

  const flushPending = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    const pending = pendingRef.current
    if (pending) {
      setMissionMessages((prev) => ({ ...prev, [pending.id]: pending.messages }))
      pendingRef.current = null
    }
  }, [setMissionMessages])

  const saveMissionMessages = useCallback(
    (id: string, messages: SerializedMessage[]) => {
      pendingRef.current = { id, messages }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      debounceTimerRef.current = setTimeout(() => {
        flushPending()
      }, DEBOUNCE_MS)
    },
    [flushPending],
  )

  // Flush pending writes on unmount so no messages are lost
  useEffect(() => {
    return () => {
      flushPending()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    getMissionMessages,
    saveMissionMessages,
  }
}
