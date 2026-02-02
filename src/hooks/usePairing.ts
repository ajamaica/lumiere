import { useCallback, useEffect, useRef, useState } from 'react'

import { MoltGatewayClient } from '../services/molt/client'
import { NodePairApproval, NodePairResponse, PairingState } from '../services/molt/types'

export interface UsePairingResult {
  /** Current pairing state machine position */
  pairingState: PairingState
  /** Info returned by the gateway after requesting pairing */
  pairingInfo: NodePairResponse | null
  /** Whether the WebSocket is connected (pre-pairing) */
  wsConnected: boolean
  /** Error message, if any */
  error: string | null
  /** The token issued by the gateway on approval */
  issuedToken: string | null
  /**
   * Initiate the full pairing flow:
   * 1. Connect to gateway WS (no token)
   * 2. Send node.pair.request
   * 3. Wait for approval event
   */
  startPairing: (gatewayUrl: string, deviceName?: string) => Promise<void>
  /** Cancel an in-progress pairing attempt */
  cancel: () => void
}

/**
 * Hook that drives the OpenClaw node pairing flow.
 *
 * Usage:
 * ```
 * const { pairingState, pairingInfo, issuedToken, startPairing } = usePairing()
 * // User taps "Pair" → startPairing("ws://192.168.1.5:18789")
 * // UI shows "Waiting for approval — run: openclaw nodes approve <requestId>"
 * // When approved, issuedToken is set → store it and proceed to normal connection
 * ```
 */
export function usePairing(): UsePairingResult {
  const [pairingState, setPairingState] = useState<PairingState>('unpaired')
  const [pairingInfo, setPairingInfo] = useState<NodePairResponse | null>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [issuedToken, setIssuedToken] = useState<string | null>(null)

  const clientRef = useRef<MoltGatewayClient | null>(null)

  const cleanup = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect()
      clientRef.current = null
    }
  }, [])

  const cancel = useCallback(() => {
    cleanup()
    setPairingState('unpaired')
    setPairingInfo(null)
    setWsConnected(false)
    setError(null)
    setIssuedToken(null)
  }, [cleanup])

  const startPairing = useCallback(
    async (gatewayUrl: string, deviceName?: string) => {
      // Reset state
      cleanup()
      setPairingState('requesting')
      setPairingInfo(null)
      setError(null)
      setIssuedToken(null)

      try {
        // Step 1: Create client with no token (unpaired connection)
        const client = new MoltGatewayClient({
          url: gatewayUrl,
          token: '', // No token — this is a pairing request
        })
        clientRef.current = client

        // Listen for pairing approval/rejection events
        client.addEventListener((frame) => {
          if (frame.event === 'node.pair.approved') {
            const approval = frame.payload as NodePairApproval
            setIssuedToken(approval.token)
            setPairingState('paired')
          } else if (frame.event === 'node.pair.rejected') {
            setPairingState('error')
            setError('Pairing request was rejected')
          }
        })

        // Step 2: Connect to the gateway WebSocket
        await client.connect()
        setWsConnected(true)

        // Step 3: Send pairing request
        const response = await client.requestPairing(deviceName)
        setPairingInfo(response)
        setPairingState('waiting')
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Pairing failed'
        setError(message)
        setPairingState('error')
        cleanup()
      }
    },
    [cleanup],
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    pairingState,
    pairingInfo,
    wsConnected,
    error,
    issuedToken,
    startPairing,
    cancel,
  }
}
