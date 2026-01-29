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

// Gateway connection state
export const gatewayConnectedAtom = atom<boolean>(false);
export const gatewayConnectingAtom = atom<boolean>(false);
export const gatewayErrorAtom = atom<string | null>(null);
