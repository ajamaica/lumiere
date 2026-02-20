import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

import { storage } from './storage'

/** Queue of messages waiting to be sent */
export const messageQueueAtom = atom<string[]>([])

/** Per-session chat input drafts, keyed by session key */
export const chatDraftsAtom = atomWithStorage<Record<string, string>>('chatDrafts', {}, storage)

/** Counter incremented to trigger message clearing and history reload */
export const clearMessagesAtom = atom<number>(0)

/** Pending message from a deep link trigger, consumed by ChatScreen */
export const pendingTriggerMessageAtom = atom<string | null>(null)

/** Pending text from share extension, consumed by ChatScreen */
export const pendingShareTextAtom = atom<string | null>(null)

/** Pending media from share extension, consumed by ChatScreen */
export const pendingShareMediaAtom = atom<import('./types').PendingShareMedia[] | null>(null)
