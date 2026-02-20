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

/** Whether to show tool activity events inline in the chat */
export const showToolEventsInChatAtom = atomWithStorage<boolean>(
  'showToolEventsInChat',
  false,
  storage,
)

/** Chat font size preference (applies to chat text only, not code blocks) */
export type ChatFontSize = 'small' | 'medium' | 'large'
export const chatFontSizeAtom = atomWithStorage<ChatFontSize>('chatFontSize', 'medium', storage)

/** Chat font family preference (applies to chat text only, not code blocks) */
export type ChatFontFamily = 'system' | 'serif' | 'monospace'
export const chatFontFamilyAtom = atomWithStorage<ChatFontFamily>(
  'chatFontFamily',
  'system',
  storage,
)

/** Haptic feedback on native (on by default) */
export const hapticFeedbackEnabledAtom = atomWithStorage<boolean>(
  'hapticFeedbackEnabled',
  true,
  storage,
)
