import { useCallback, useEffect, useState } from 'react'

import { useMoltGateway } from '../services/molt/useMoltGateway'
import { NodePairingResponse, PairedNode } from '../services/molt/types'
import * as Device from 'expo-device'
import { Platform } from 'react-native'

export function useNodePairing() {
  const { client } = useMoltGateway()
  const [pairingStatus, setPairingStatus] = useState<NodePairingResponse | null>(null)
  const [pairedNodes, setPairedNodes] = useState<PairedNode[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getDeviceInfo = () => {
    const deviceName = Device.deviceName || `${Platform.OS} device`
    const deviceId = Device.osBuildId || `lumiere-${Platform.OS}-${Date.now()}`
    
    return {
      id: deviceId,
      name: deviceName,
    }
  }

  const requestPairing = useCallback(async () => {
    if (!client) {
      setError('Not connected to gateway')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const deviceInfo = getDeviceInfo()
      const response = await client.requestNodePairing(deviceInfo)
      setPairingStatus(response as NodePairingResponse)
      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to request pairing'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [client])

  const checkPairingStatus = useCallback(async () => {
    if (!client) {
      return
    }

    try {
      const response = await client.listPairedNodes()
      const data = response as { pending: unknown[]; paired: PairedNode[] }
      setPairedNodes(data.paired || [])
      
      // Check if this device is paired
      const deviceInfo = getDeviceInfo()
      const isPaired = data.paired?.some(
        (node) => node.deviceId === deviceInfo.id || node.id === deviceInfo.id
      )
      
      if (isPaired && pairingStatus?.status === 'pending') {
        setPairingStatus({ ...pairingStatus, status: 'approved' })
      }
      
      return data
    } catch (err) {
      console.error('Failed to check pairing status:', err)
    }
  }, [client, pairingStatus])

  // Listen for pairing events
  useEffect(() => {
    if (!client) return

    const unsubscribe = client.addEventListener((frame) => {
      if (frame.event === 'node.pair.requested' || frame.event === 'node.pair.resolved') {
        // Refresh pairing status when events occur
        checkPairingStatus()
      }
    })

    return unsubscribe
  }, [client, checkPairingStatus])

  // Initial check
  useEffect(() => {
    if (client) {
      checkPairingStatus()
    }
  }, [client])

  const isPaired = pairedNodes.some((node) => {
    const deviceInfo = getDeviceInfo()
    return node.deviceId === deviceInfo.id || node.id === deviceInfo.id
  })

  return {
    requestPairing,
    checkPairingStatus,
    pairingStatus,
    pairedNodes,
    isPaired,
    isLoading,
    error,
  }
}
