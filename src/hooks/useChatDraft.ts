import { useAtom, useAtomValue } from 'jotai'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { chatDraftsAtom, currentSessionKeyAtom } from '../store'

const DEBOUNCE_MS = 500

/** Type guard – during hydration Jotai may hand us a Promise instead of the value. */
function isResolved(
  v: Record<string, string> | Promise<Record<string, string>>,
): v is Record<string, string> {
  return !(v instanceof Promise)
}

/**
 * Manages a per-session chat input draft that persists across navigation
 * and app restarts. Debounces writes to AsyncStorage to avoid excessive I/O.
 */
export function useChatDraft() {
  const sessionKey = useAtomValue(currentSessionKeyAtom)
  const [drafts, setDrafts] = useAtom(chatDraftsAtom)
  const resolvedDrafts = useMemo(() => (isResolved(drafts) ? drafts : {}), [drafts])
  const [text, setTextLocal] = useState(() => resolvedDrafts[sessionKey] ?? '')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevSessionRef = useRef(sessionKey)

  // When the session key changes, flush any pending draft for the old session
  // and restore the draft for the new session.
  useEffect(() => {
    if (sessionKey !== prevSessionRef.current) {
      if (timerRef.current) clearTimeout(timerRef.current)
      prevSessionRef.current = sessionKey
      setTextLocal(resolvedDrafts[sessionKey] ?? '')
    }
  }, [sessionKey, resolvedDrafts])

  // Once drafts hydrate from storage, sync local text if it's still empty.
  useEffect(() => {
    if (resolvedDrafts[sessionKey] && !text) {
      setTextLocal(resolvedDrafts[sessionKey])
    }
    // Only run when resolvedDrafts identity changes (hydration).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedDrafts])

  const setText = useCallback(
    (value: string | ((prev: string) => string)) => {
      setTextLocal((prev) => {
        const next = typeof value === 'function' ? value(prev) : value
        // Debounce the persistence write
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
          setDrafts((d) => {
            const current = isResolved(d) ? d : {}
            if (next) {
              return { ...current, [sessionKey]: next }
            }
            // Remove empty drafts to keep storage clean
            if (current[sessionKey] == null) return current
            const { [sessionKey]: _, ...rest } = current
            return rest
          })
        }, DEBOUNCE_MS)
        return next
      })
    },
    [sessionKey, setDrafts],
  )

  /** Clear the draft for the current session (call after sending). */
  const clearDraft = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setTextLocal('')
    setDrafts((d) => {
      const current = isResolved(d) ? d : {}
      if (current[sessionKey] == null) return current
      const { [sessionKey]: _, ...rest } = current
      return rest
    })
  }, [sessionKey, setDrafts])

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return { text, setText, clearDraft }
}
