// ─── Types ───────────────────────────────────────────────
export type {
  Mission,
  MissionsDict,
  MissionStatus,
  MissionSubtask,
  SubtaskSubagent,
} from './missionTypes'
export type {
  AuthResponse,
  Instance,
  InstanceResponse,
  InstanceStatus,
  SubscriptionResponse,
  SubscriptionStatus,
  ThinkLumiereApiError,
  ThinkLumiereUser,
} from './thinklumiereTypes'
export type {
  FavoriteItem,
  GatewayLastSeenMap,
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
  isMissionSession,
  parseSessionKey,
  serverSessionsAtom,
  sessionAliasesAtom,
  sessionContextAtom,
} from './sessionAtoms'

// ─── Server atoms ────────────────────────────────────────
export { agentConfigsAtom, currentServerIdAtom, serversAtom } from './serverAtoms'

// ─── UI atoms ────────────────────────────────────────────
export {
  biometricLockEnabledAtom,
  colorThemeAtom,
  languageAtom,
  onboardingCompletedAtom,
  showToolEventsInChatAtom,
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
  gatewayLastSeenTimestampAtom,
} from './notificationAtoms'

// ─── Mission atoms ──────────────────────────────────────
export { activeMissionIdAtom, missionMessagesAtom, missionsAtom } from './missionAtoms'

// ─── Canvas atoms ───────────────────────────────────────
export type {
  CanvasAction,
  CanvasActionType,
  CanvasContent,
  CanvasEvalResult,
  CanvasSnapshot,
  CanvasSourceType,
} from './canvasAtoms'
export {
  canvasActionQueueAtom,
  canvasContentAtom,
  canvasEvalResultAtom,
  canvasSnapshotAtom,
  canvasVisibleAtom,
} from './canvasAtoms'

// ─── MCP atoms ──────────────────────────────────────────
export {
  mcpConnectionErrorsAtom,
  mcpConnectionStatesAtom,
  mcpServersAtom,
  mcpServerToolsAtom,
} from './mcpAtoms'

// ─── ThinkLumiere atoms ─────────────────────────────────
export {
  instanceAtom,
  subscriptionStatusAtom,
  thinklumiereAuthenticatedAtom,
  thinklumiereUserAtom,
} from './thinklumiereAtoms'

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
