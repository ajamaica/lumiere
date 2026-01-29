import { atom } from 'jotai';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create AsyncStorage adapter for Jotai
const storage = createJSONStorage<any>(() => AsyncStorage);

// Theme mode atom with AsyncStorage persistence
export const themeModeAtom = atomWithStorage<'light' | 'dark' | 'system'>(
  'themeMode',
  'system',
  storage
);

// Current session key atom with AsyncStorage persistence
export const currentSessionKeyAtom = atomWithStorage<string>(
  'currentSessionKey',
  'agent:main:main',
  storage
);

// Gateway configuration atoms with AsyncStorage persistence
export const gatewayUrlAtom = atomWithStorage<string>(
  'gatewayUrl',
  'wss://ajamaica-standardpc.tail185e2.ts.net',
  storage
);

export const gatewayTokenAtom = atomWithStorage<string>(
  'gatewayToken',
  'a4b48356b80d2e02bf40cf6a1cfdc1bbd0341db58b072325',
  storage
);

export const clientIdAtom = atomWithStorage<string>(
  'clientId',
  'lumiere-mobile',
  storage
);

// Onboarding completion status
export const onboardingCompletedAtom = atomWithStorage<boolean>(
  'onboardingCompleted',
  false,
  storage
);

// Gateway connection state
export const gatewayConnectedAtom = atom<boolean>(false);
export const gatewayConnectingAtom = atom<boolean>(false);
export const gatewayErrorAtom = atom<string | null>(null);
