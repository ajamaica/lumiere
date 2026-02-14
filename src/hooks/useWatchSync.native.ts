import { useAtom } from 'jotai'
import { useEffect } from 'react'

import { syncServers } from '../../modules/watch-connectivity'
import { currentServerIdAtom, serversAtom } from '../store'

/**
 * Watches the servers atom and current server ID, then pushes
 * changes to the companion Apple Watch app via WCSession.
 */
export function useWatchSync(): void {
  const [servers] = useAtom(serversAtom)
  const [currentServerId] = useAtom(currentServerIdAtom)

  useEffect(() => {
    const json = JSON.stringify(servers)
    syncServers(json, currentServerId)
  }, [servers, currentServerId])
}
