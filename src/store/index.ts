// ─── Types ───────────────────────────────────────────────
export type {
  FavoriteItem,
  NotificationLastCheckMap,
  PendingShareMedia,
  ServerConfig,
  ServersDict,
  ServerSessions,
  SessionAliases,
  SessionContextConfig,
  SessionContextMap,
  TriggerConfig,
  TriggersDict,
} from './types'

// ─── Storage & store access ──────────────────────────────
export { getStore, jotaiStorage } from './storage'

// ─── Session atoms & utilities ───────────────────────────
export type { SessionKeyParts } from './sessionAtoms'
export {
  createSessionKey,
  currentAgentIdAtom,
  currentSessionKeyAtom,
  parseSessionKey,
  serverSessionsAtom,
  sessionAliasesAtom,
  sessionContextAtom,
} from './sessionAtoms'

// ─── Server atoms ────────────────────────────────────────
export { currentServerIdAtom, serversAtom } from './serverAtoms'

// ─── UI atoms ────────────────────────────────────────────
export {
  biometricLockEnabledAtom,
  colorThemeAtom,
  languageAtom,
  onboardingCompletedAtom,
  themeModeAtom,
} from './uiAtoms'

// ─── Gateway atoms ───────────────────────────────────────
export { gatewayConnectedAtom, gatewayConnectingAtom, gatewayErrorAtom } from './gatewayAtoms'

// ─── Messaging atoms ─────────────────────────────────────
export {
  clearMessagesAtom,
  messageQueueAtom,
  pendingShareMediaAtom,
  pendingShareTextAtom,
  pendingTriggerMessageAtom,
} from './messagingAtoms'

// ─── User data atoms ─────────────────────────────────────
export { favoritesAtom, triggersAtom } from './userDataAtoms'

// ─── Notification atoms ──────────────────────────────────
export {
  backgroundFetchIntervalAtom,
  backgroundNotificationsEnabledAtom,
  notificationLastCheckAtom,
} from './notificationAtoms'

// ─── Secure store (web only) ─────────────────────────────
export {
  clearSessionCryptoKey,
  getSessionCryptoKey,
  hasSessionCryptoKey,
  hydrateSecureServers,
  persistSecureServers,
  secureServersAtom,
  secureStoreHydratedAtom,
  setSessionCryptoKey,
} from './secureAtom'
