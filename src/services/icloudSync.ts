/**
 * iCloud Sync Service
 *
 * Bridges Jotai atoms with NSUbiquitousKeyValueStore via the icloud-storage
 * native module. When iCloud sync is enabled, atom changes are pushed to
 * iCloud and remote changes from other devices are pulled into local state.
 *
 * Data synced:
 * - Server configurations
 * - API tokens (synced as a token map in iCloud, stored in Keychain locally)
 * - Session mappings and aliases
 * - Session context (system messages)
 * - Favorites and triggers
 * - Theme, color, and language preferences
 *
 * NOT synced (transient or device-specific):
 * - Biometric lock setting (device-specific)
 * - Onboarding state (device-specific)
 * - Message queue (transient)
 * - Gateway connection state (transient)
 * - Notification timestamps (transient)
 * - Workflow configs (contain device-specific file URIs)
 */

import {
  addOnStoreChangedListener,
  getItem,
  isAvailable,
  setItem,
  type StoreChangedEvent,
} from '../../modules/icloud-storage'
import {
  currentServerIdAtom,
  favoritesAtom,
  getStore,
  serversAtom,
  serverSessionsAtom,
  sessionAliasesAtom,
  sessionContextAtom,
  triggersAtom,
} from '../store'
import { colorThemeAtom, languageAtom, themeModeAtom } from '../store/uiAtoms'

/** Keys synced to iCloud — must match the AsyncStorage keys used by atomWithStorage */
const SYNCED_KEYS = [
  'servers',
  'currentServerId',
  'serverSessions',
  'sessionAliases',
  'sessionContext',
  'favorites',
  'triggers',
  'themeMode',
  'colorTheme',
  'language',
] as const

type SyncedKey = (typeof SYNCED_KEYS)[number]

/** Prefix applied to all keys in NSUbiquitousKeyValueStore to avoid collisions */
const ICLOUD_PREFIX = 'lumiere_'

function icloudKey(key: string): string {
  return `${ICLOUD_PREFIX}${key}`
}

function stripPrefix(key: string): string {
  return key.startsWith(ICLOUD_PREFIX) ? key.slice(ICLOUD_PREFIX.length) : key
}

// Map from AsyncStorage key names to their corresponding Jotai atoms
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const keyToAtom: Record<SyncedKey, any> = {
  servers: serversAtom,
  currentServerId: currentServerIdAtom,
  serverSessions: serverSessionsAtom,
  sessionAliases: sessionAliasesAtom,
  sessionContext: sessionContextAtom,
  favorites: favoritesAtom,
  triggers: triggersAtom,
  themeMode: themeModeAtom,
  colorTheme: colorThemeAtom,
  language: languageAtom,
}

/** Flag to prevent echo: when we write to iCloud from a local change,
 *  we don't want the change notification to write back to local state. */
let isApplyingRemote = false
let isApplyingLocal = false

/** Unsubscribe function for the iCloud change listener */
let removeChangeListener: (() => void) | null = null

/** Unsubscribe functions for Jotai atom subscriptions */
let atomUnsubscribes: (() => void)[] = []

/**
 * Push the current local value of an atom to iCloud.
 */
function pushToICloud(key: SyncedKey): void {
  if (isApplyingRemote) return

  const store = getStore()
  const atom = keyToAtom[key]
  if (!atom) return

  const value = store.get(atom)
  const serialized = JSON.stringify(value)
  isApplyingLocal = true
  setItem(icloudKey(key), serialized)
  isApplyingLocal = false
}

/**
 * Pull a value from iCloud and apply it to the local Jotai atom.
 */
function pullFromICloud(key: SyncedKey, value: string | null): void {
  if (!value) return

  const store = getStore()
  const atom = keyToAtom[key]
  if (!atom) return

  try {
    const parsed = JSON.parse(value)
    isApplyingRemote = true
    store.set(atom, parsed)
    isApplyingRemote = false
  } catch {
    // Ignore malformed JSON from iCloud
    isApplyingRemote = false
  }
}

/**
 * Handle external changes from another device via iCloud.
 */
function handleStoreChanged(event: StoreChangedEvent): void {
  if (isApplyingLocal) return

  for (const iKey of event.changedKeys) {
    // Handle token changes
    if (iKey === TOKEN_ICLOUD_KEY) {
      const value = event.changedValues[iKey] ?? getItem(iKey)
      pullTokensFromICloud(value ?? null)
      continue
    }

    const key = stripPrefix(iKey) as SyncedKey
    if (SYNCED_KEYS.includes(key)) {
      const value = event.changedValues[iKey] ?? getItem(iKey)
      pullFromICloud(key, value ?? null)
    }
  }
}

/**
 * Subscribe to local atom changes and push them to iCloud.
 */
function subscribeToAtoms(): void {
  const store = getStore()

  for (const key of SYNCED_KEYS) {
    const atom = keyToAtom[key]
    if (!atom) continue

    const unsub = store.sub(atom, () => {
      if (!isApplyingRemote) {
        pushToICloud(key)
      }
    })
    atomUnsubscribes.push(unsub)
  }
}

/**
 * Do an initial sync: pull any existing iCloud data, then push local data
 * for keys not yet in iCloud.
 */
async function initialSync(): Promise<void> {
  // Sync atoms
  for (const key of SYNCED_KEYS) {
    const iKey = icloudKey(key)
    const remoteValue = getItem(iKey)
    if (remoteValue) {
      // Remote data exists — pull it into local state
      pullFromICloud(key, remoteValue)
    } else {
      // No remote data — push local state to iCloud
      pushToICloud(key)
    }
  }

  // Sync tokens
  const remoteTokens = getItem(TOKEN_ICLOUD_KEY)
  if (remoteTokens) {
    await pullTokensFromICloud(remoteTokens)
  } else {
    await pushAllTokensToICloud()
  }
}

/**
 * Start iCloud sync. Call this when iCloud sync is enabled.
 * Sets up bidirectional sync between Jotai atoms and NSUbiquitousKeyValueStore.
 */
export async function startICloudSync(): Promise<void> {
  if (!isAvailable()) return

  // Stop any existing sync first
  stopICloudSync()

  isSyncActive = true

  // Do initial data sync (includes tokens)
  await initialSync()

  // Listen for remote changes from other devices
  removeChangeListener = addOnStoreChangedListener(handleStoreChanged)

  // Subscribe to local atom changes
  subscribeToAtoms()
}

/**
 * Stop iCloud sync. Call this when iCloud sync is disabled.
 */
export function stopICloudSync(): void {
  isSyncActive = false

  // Remove iCloud change listener
  if (removeChangeListener) {
    removeChangeListener()
    removeChangeListener = null
  }

  // Unsubscribe from atom changes
  for (const unsub of atomUnsubscribes) {
    unsub()
  }
  atomUnsubscribes = []
}

/**
 * Check if iCloud is available on this device.
 */
export function isICloudAvailable(): boolean {
  return isAvailable()
}

// ─── Token Sync ──────────────────────────────────────────────────────────────

const TOKEN_ICLOUD_KEY = icloudKey('serverTokens')

/** Whether iCloud sync is currently active */
let isSyncActive = false

/**
 * Returns true when iCloud sync is running, so callers can check
 * before deciding to push token changes.
 */
export function isSyncEnabled(): boolean {
  return isSyncActive
}

/**
 * Push a single token change to iCloud.
 * Called from secureTokenStorage when a token is set or deleted.
 */
export function pushTokenToICloud(serverId: string, token: string | null): void {
  if (!isSyncActive || isApplyingRemote) return

  const existing = getItem(TOKEN_ICLOUD_KEY)
  let tokenMap: Record<string, string> = {}
  if (existing) {
    try {
      tokenMap = JSON.parse(existing)
    } catch {
      // ignore
    }
  }

  if (token) {
    tokenMap[serverId] = token
  } else {
    delete tokenMap[serverId]
  }

  isApplyingLocal = true
  setItem(TOKEN_ICLOUD_KEY, JSON.stringify(tokenMap))
  isApplyingLocal = false
}

/**
 * Pull all tokens from iCloud and store them in the local Keychain.
 * Called during initial sync and when remote token changes arrive.
 */
async function pullTokensFromICloud(serialized: string | null): Promise<void> {
  if (!serialized) return

  let tokenMap: Record<string, string>
  try {
    tokenMap = JSON.parse(serialized)
  } catch {
    return
  }

  // Dynamic import to avoid circular dependency
  const { setServerToken } = await import('./secureTokenStorage')
  isApplyingRemote = true
  for (const [serverId, token] of Object.entries(tokenMap)) {
    if (token) {
      await setServerToken(serverId, token)
    }
  }
  isApplyingRemote = false
}

/**
 * Push all local tokens to iCloud. Called during initial sync.
 */
async function pushAllTokensToICloud(): Promise<void> {
  const store = getStore()
  const servers = store.get(serversAtom)
  const serverIds = Object.keys(servers)
  if (serverIds.length === 0) return

  const { getServerToken } = await import('./secureTokenStorage')
  const tokenMap: Record<string, string> = {}

  for (const id of serverIds) {
    const token = await getServerToken(id)
    if (token) {
      tokenMap[id] = token
    }
  }

  if (Object.keys(tokenMap).length > 0) {
    isApplyingLocal = true
    setItem(TOKEN_ICLOUD_KEY, JSON.stringify(tokenMap))
    isApplyingLocal = false
  }
}
