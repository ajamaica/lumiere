import AsyncStorage from '@react-native-async-storage/async-storage'
import { atom } from 'jotai'
import { atomWithStorage, createJSONStorage } from 'jotai/utils'

import { DEFAULT_SESSION_KEY } from '../constants'
import type { ProviderType } from '../services/providers/types'

// Create AsyncStorage adapter for Jotai
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const storage = createJSONStorage<any>(() => AsyncStorage)

// Server configuration types
export interface ServerConfig {
  id: string // UUID
  name: string // User-friendly name
  url: string
  clientId?: string
  providerType: ProviderType // 'molt' | 'ollama'
  model?: string // Model name for Ollama (e.g., 'llama3.2', 'mistral')
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

// Color theme atom with AsyncStorage persistence
export const colorThemeAtom = atomWithStorage<string>('colorTheme', 'default', storage)

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

// Favorites
export interface FavoriteItem {
  id: string
  text: string
  sender: 'user' | 'agent'
  savedAt: number
}

export const favoritesAtom = atomWithStorage<FavoriteItem[]>('favorites', [], storage)

// Biometric lock setting (off by default)
export const biometricLockEnabledAtom = atomWithStorage<boolean>(
  'biometricLockEnabled',
  false,
  storage,
)

// Session aliases (local display names for session keys)
export interface SessionAliases {
  [sessionKey: string]: string // display name for each session
}

export const sessionAliasesAtom = atomWithStorage<SessionAliases>('sessionAliases', {}, storage)

// Triggers (persisted)
export interface TriggerConfig {
  id: string // Random 8-char slug used in the deep link URL
  message: string // Message to auto-send when the trigger fires
  sessionKey: string // Session key to send the message in
  serverId: string // Server to send it on
  createdAt: number
}

export interface TriggersDict {
  [slug: string]: TriggerConfig
}

export const triggersAtom = atomWithStorage<TriggersDict>('triggers', {}, storage)

// In-memory atom for pending trigger messages (set by deep link, consumed by ChatScreen)
export const pendingTriggerMessageAtom = atom<string | null>(null)

// Background notifications setting (off by default)
export const backgroundNotificationsEnabledAtom = atomWithStorage<boolean>(
  'backgroundNotificationsEnabled',
  false,
  storage,
)

// Interval in minutes for background fetch checks (default 15 min)
export const backgroundFetchIntervalAtom = atomWithStorage<number>(
  'backgroundFetchInterval',
  15,
  storage,
)

// Language preference (empty string means use device default)
export const languageAtom = atomWithStorage<string>('language', '', storage)
