import AsyncStorage from '@react-native-async-storage/async-storage'
import { getDefaultStore } from 'jotai'
import { createJSONStorage } from 'jotai/utils'

// Create AsyncStorage adapter for Jotai
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const storage = createJSONStorage<any>(() => AsyncStorage)

// Export the storage adapter for use outside React components
export { storage as jotaiStorage }

// Lazily initialized store for accessing atoms outside React
// This avoids calling getDefaultStore() at module load time, which can cause issues in tests
let _store: ReturnType<typeof getDefaultStore> | null = null
export function getStore() {
  if (!_store) {
    _store = getDefaultStore()
  }
  return _store
}
