/**
 * TypeScript wrapper for the ICloudStorage native Expo module.
 *
 * Wraps NSUbiquitousKeyValueStore for iCloud key-value sync.
 * Only available on iOS — all methods gracefully no-op on other platforms.
 */

interface ICloudStorageNativeModule {
  isAvailable(): boolean
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  getAllKeys(): string[]
  getAll(): Record<string, string>
  clear(): void
  synchronize(): boolean
  addListener(eventName: string): void
  removeListeners(count: number): void
}

export interface StoreChangedEvent {
  /** NSUbiquitousKeyValueStoreChangeReason: 0=server, 1=initialSync, 2=quotaViolation */
  reason: number
  changedKeys: string[]
  changedValues: Record<string, string | null>
}

let nativeModule: ICloudStorageNativeModule | null = null

function getModule(): ICloudStorageNativeModule | null {
  if (nativeModule === undefined) return null
  if (nativeModule) return nativeModule
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireNativeModule } = require('expo')
    nativeModule = requireNativeModule('ICloudStorage') as ICloudStorageNativeModule
    return nativeModule
  } catch {
    nativeModule = null
    return null
  }
}

/**
 * Check if iCloud key-value storage is available (iOS with signed-in iCloud account).
 */
export function isAvailable(): boolean {
  try {
    return getModule()?.isAvailable() ?? false
  } catch {
    return false
  }
}

/**
 * Get a value from iCloud key-value store.
 */
export function getItem(key: string): string | null {
  return getModule()?.getItem(key) ?? null
}

/**
 * Set a value in iCloud key-value store.
 */
export function setItem(key: string, value: string): void {
  getModule()?.setItem(key, value)
}

/**
 * Remove a value from iCloud key-value store.
 */
export function removeItem(key: string): void {
  getModule()?.removeItem(key)
}

/**
 * Get all keys stored in iCloud.
 */
export function getAllKeys(): string[] {
  return getModule()?.getAllKeys() ?? []
}

/**
 * Get all key-value pairs from iCloud.
 */
export function getAll(): Record<string, string> {
  return getModule()?.getAll() ?? {}
}

/**
 * Clear all data from iCloud key-value store.
 */
export function clear(): void {
  getModule()?.clear()
}

/**
 * Force a synchronization with iCloud.
 */
export function synchronize(): boolean {
  return getModule()?.synchronize() ?? false
}

/**
 * Listen for external changes from other devices via iCloud.
 * Returns a cleanup function to remove the listener.
 */
export function addOnStoreChangedListener(
  callback: (event: StoreChangedEvent) => void,
): () => void {
  const mod = getModule()
  if (!mod) return () => {}

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { EventEmitter } = require('expo')
    const emitter = new EventEmitter(mod)
    const subscription = emitter.addListener('onStoreChanged', callback)
    return () => subscription.remove()
  } catch {
    return () => {}
  }
}
