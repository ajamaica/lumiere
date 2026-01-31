import AsyncStorage from '@react-native-async-storage/async-storage'
import { atom } from 'jotai'
import { atomWithStorage, createJSONStorage } from 'jotai/utils'

import { DEFAULT_SESSION_KEY } from '../constants'

// Create AsyncStorage adapter for Jotai
const storage = createJSONStorage<unknown>(() => AsyncStorage)

// Server configuration types
export interface ServerConfig {
  id: string // UUID
  name: string // User-friendly name
  url: string
  clientId?: string
  createdAt: number
}

export interface ServersDict {
  [uuid: string]: ServerConfig
}

export interface ServerSessions {
  [serverUuid: string]: string // session key for each server
}

// Theme mode atom with AsyncStorage persistence
export const themeModeAtom = atomWithStorage<'light' | 'dark' | 'system'>(
  'themeMode',
  'system',
  storage,
)

// Multi-server storage atoms
export const serversAtom = atomWithStorage<ServersDict>('servers', {}, storage)

export const currentServerIdAtom = atomWithStorage<string>('currentServerId', '', storage)

export const serverSessionsAtom = atomWithStorage<ServerSessions>('serverSessions', {}, storage)

// Current session key with persistent storage
// Stores whatever session key is set during onboarding or session selection
export const currentSessionKeyAtom = atomWithStorage<string>(
  'currentSessionKey',
  DEFAULT_SESSION_KEY,
  storage,
)

// Onboarding completion status
export const onboardingCompletedAtom = atomWithStorage<boolean>(
  'onboardingCompleted',
  false,
  storage,
)

// Gateway connection state (in-memory only)
export const gatewayConnectedAtom = atom<boolean>(false)
export const gatewayConnectingAtom = atom<boolean>(false)
export const gatewayErrorAtom = atom<string | null>(null)

// Message queue (in-memory only, not persisted)
export const messageQueueAtom = atom<string[]>([])

// Trigger to clear messages and reload history (in-memory only)
export const clearMessagesAtom = atom<number>(0)
