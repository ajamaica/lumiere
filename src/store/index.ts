// ─── Shared utilities ────────────────────────────────────
export { getStore, jotaiStorage } from './storeUtils'

// ─── Session domain ──────────────────────────────────────
export type { ServerSessions, SessionAliases } from './sessionAtoms'
export {
  currentAgentIdAtom,
  currentSessionKeyAtom,
  serverSessionsAtom,
  sessionAliasesAtom,
} from './sessionAtoms'

// ─── Server domain ───────────────────────────────────────
export type { ServerConfig, ServersDict } from './serverAtoms'
export { currentServerIdAtom, serversAtom } from './serverAtoms'

// ─── Gateway domain ──────────────────────────────────────
export { gatewayConnectedAtom, gatewayConnectingAtom, gatewayErrorAtom } from './gatewayAtoms'

// ─── Chat domain ─────────────────────────────────────────
export type { FavoriteItem } from './chatAtoms'
export {
  clearMessagesAtom,
  favoritesAtom,
  messageQueueAtom,
  pendingShareTextAtom,
  pendingTriggerMessageAtom,
} from './chatAtoms'

// ─── Trigger domain ──────────────────────────────────────
export type { TriggerConfig, TriggersDict } from './triggerAtoms'
export { triggersAtom } from './triggerAtoms'

// ─── Workflow domain ─────────────────────────────────────
export type { WorkflowConfig, WorkflowConfigMap, WorkflowFile } from './workflowAtoms'
export { workflowConfigAtom } from './workflowAtoms'

// ─── Notification domain ─────────────────────────────────
export type { NotificationLastCheckMap } from './notificationAtoms'
export {
  backgroundFetchIntervalAtom,
  backgroundNotificationsEnabledAtom,
  notificationLastCheckAtom,
} from './notificationAtoms'

// ─── Preferences domain ──────────────────────────────────
export {
  biometricLockEnabledAtom,
  colorThemeAtom,
  languageAtom,
  onboardingCompletedAtom,
  themeModeAtom,
} from './preferencesAtoms'

// ─── Secure store (web) ──────────────────────────────────
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
