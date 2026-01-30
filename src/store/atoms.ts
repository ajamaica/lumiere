import AsyncStorage from '@react-native-async-storage/async-storage'
import { atom } from 'jotai'
import { atomWithStorage, createJSONStorage } from 'jotai/utils'

// Create AsyncStorage adapter for Jotai
const storage = createJSONStorage<any>(() => AsyncStorage)

// Server configuration types
export interface ServerConfig {
  id: string // UUID
  name: string // User-friendly name
  url: string
  token: string
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

// Derived atom for current session key (backward compatible interface)
export const currentSessionKeyAtom = atom(
  (get) => {
    const currentServerId = get(currentServerIdAtom)
    const sessions = get(serverSessionsAtom)
    return sessions[currentServerId] || ''
  },
  (get, set, newValue: string) => {
    const currentServerId = get(currentServerIdAtom)
    const sessions = get(serverSessionsAtom)
    set(serverSessionsAtom, {
      ...sessions,
      [currentServerId]: newValue,
    })
  },
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
