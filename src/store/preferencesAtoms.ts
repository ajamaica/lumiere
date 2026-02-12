import { atomWithStorage } from 'jotai/utils'

import { storage } from './storeUtils'

// ─── Atoms ───────────────────────────────────────────────

/** Theme mode preference: light, dark, or follow system */
export const themeModeAtom = atomWithStorage<'light' | 'dark' | 'system'>(
  'themeMode',
  'dark',
  storage,
)

/** Color theme name (e.g., 'lumiere') */
export const colorThemeAtom = atomWithStorage<string>('colorTheme', 'lumiere', storage)

/** Whether the user has completed onboarding */
export const onboardingCompletedAtom = atomWithStorage<boolean>(
  'onboardingCompleted',
  false,
  storage,
)

/** Whether biometric lock is enabled */
export const biometricLockEnabledAtom = atomWithStorage<boolean>(
  'biometricLockEnabled',
  false,
  storage,
)

/** Language preference (empty string = device default) */
export const languageAtom = atomWithStorage<string>('language', '', storage)
