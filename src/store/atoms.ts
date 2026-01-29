import AsyncStorage from '@react-native-async-storage/async-storage'
import { atom } from 'jotai'
import { atomWithStorage, createJSONStorage } from 'jotai/utils'

// Create AsyncStorage adapter for Jotai
const storage = createJSONStorage<any>(() => AsyncStorage)

// Theme mode atom with AsyncStorage persistence
export const themeModeAtom = atomWithStorage<'light' | 'dark' | 'system'>(
  'themeMode',
  'system',
  storage,
)

// Current session key atom with AsyncStorage persistence
export const currentSessionKeyAtom = atomWithStorage<string>('currentSessionKey', '', storage)

// Gateway configuration atoms with AsyncStorage persistence
export const gatewayUrlAtom = atomWithStorage<string>('gatewayUrl', '', storage)

export const gatewayTokenAtom = atomWithStorage<string>('gatewayToken', '', storage)

export const clientIdAtom = atomWithStorage<string>('clientId', 'lumiere-mobile', storage)

// Onboarding completion status
export const onboardingCompletedAtom = atomWithStorage<boolean>(
  'onboardingCompleted',
  false,
  storage,
)

// Gateway connection state
export const gatewayConnectedAtom = atom<boolean>(false)
export const gatewayConnectingAtom = atom<boolean>(false)
export const gatewayErrorAtom = atom<string | null>(null)
