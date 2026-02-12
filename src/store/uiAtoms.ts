import { atomWithStorage } from 'jotai/utils'

import { storage } from './storage'

/** Theme mode: light, dark, or system */
export const themeModeAtom = atomWithStorage<'light' | 'dark' | 'system'>(
  'themeMode',
  'dark',
  storage,
)

/** Color theme identifier */
export const colorThemeAtom = atomWithStorage<string>('colorTheme', 'lumiere', storage)

/** Language preference (empty string means use device default) */
export const languageAtom = atomWithStorage<string>('language', '', storage)

/** Whether the user has completed onboarding */
export const onboardingCompletedAtom = atomWithStorage<boolean>(
  'onboardingCompleted',
  false,
  storage,
)

/** Biometric lock setting (off by default) */
export const biometricLockEnabledAtom = atomWithStorage<boolean>(
  'biometricLockEnabled',
  false,
  storage,
)

/** iCloud sync setting (off by default, iOS only) */
export const icloudSyncEnabledAtom = atomWithStorage<boolean>('icloudSyncEnabled', false, storage)
