import { atom } from 'jotai'

/** Queue of messages waiting to be sent */
export const messageQueueAtom = atom<string[]>([])

/** Counter incremented to trigger message clearing and history reload */
export const clearMessagesAtom = atom<number>(0)

/** Pending message from a deep link trigger, consumed by ChatScreen */
export const pendingTriggerMessageAtom = atom<string | null>(null)

/** Pending text from share extension, consumed by ChatInput */
export const pendingShareTextAtom = atom<string | null>(null)
