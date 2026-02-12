import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

import { storage } from './storeUtils'

// ─── Types ───────────────────────────────────────────────

export interface FavoriteItem {
  id: string
  text: string
  sender: 'user' | 'agent'
  savedAt: number
}

// ─── Persisted atoms ─────────────────────────────────────

/** Saved favorite messages */
export const favoritesAtom = atomWithStorage<FavoriteItem[]>('favorites', [], storage)

// ─── In-memory atoms ─────────────────────────────────────

/** Queued messages waiting to be sent while agent is responding */
export const messageQueueAtom = atom<string[]>([])

/** Counter trigger to clear and reload message history */
export const clearMessagesAtom = atom<number>(0)

/** Auto-send message set by deep link or trigger, consumed by ChatScreen */
export const pendingTriggerMessageAtom = atom<string | null>(null)

/** Share extension text to be inserted into chat input */
export const pendingShareTextAtom = atom<string | null>(null)
