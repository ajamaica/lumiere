import { useAtom } from 'jotai'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { useServers } from '../../hooks/useServers'
import { useMoltGateway } from '../../services/molt'
import { ProviderConfig } from '../../services/providers'
import { currentSessionKeyAtom, sessionAliasesAtom } from '../../store'
import { logger } from '../../utils/logger'
import { SessionSidebar } from '../layout/SessionSidebar'
import { SidebarLayout } from '../layout/SidebarLayout'
import { ChatScreen } from './ChatScreen'

const chatSidebarLogger = logger.create('ChatSidebar')

interface Session {
  key: string
  lastActivity?: number
  messageCount?: number
}

interface ChatWithSidebarProps {
  providerConfig: ProviderConfig
}

export function ChatWithSidebar({ providerConfig }: ChatWithSidebarProps) {
  const { currentServerId, serversList, switchToServer } = useServers()
  const [currentSessionKey, setCurrentSessionKey] = useAtom(currentSessionKeyAtom)
  const [sessionAliases] = useAtom(sessionAliasesAtom)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const sessionLoadIdRef = useRef(0)
  // Track last session per server
  const serverSessionsRef = useRef<Record<string, string>>({})

  // Only molt provider supports server-side sessions
  const supportsServerSessions = providerConfig?.type === 'molt'

  const { connected, connect, disconnect, listSessions } = useMoltGateway({
    url: providerConfig?.url || '',
    token: providerConfig?.token || '',
  })

  useEffect(() => {
    // Only connect to gateway if provider supports server sessions
    if (providerConfig && supportsServerSessions) {
      connect()
    }
    return () => {
      disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerConfig, supportsServerSessions, currentServerId])

  const loadSessions = useCallback(async () => {
    // Increment load ID so any in-flight request from a previous server
    // is discarded when it resolves.
    const loadId = ++sessionLoadIdRef.current

    // For non-molt providers, just show current session
    if (!supportsServerSessions) {
      setSessions([{ key: currentSessionKey }])
      setLoadingSessions(false)
      return
    }

    // When disconnected (e.g. during a server switch), show a loader
    // instead of resetting to a fallback.
    if (!connected) {
      setLoadingSessions(true)
      return
    }

    setLoadingSessions(true)
    try {
      const sessionData = (await listSessions()) as { sessions?: Session[] }
      if (loadId !== sessionLoadIdRef.current) return // stale response
      if (sessionData?.sessions && Array.isArray(sessionData.sessions)) {
        setSessions(sessionData.sessions)

        // If no session is set for this server and sessions are available, use the first one
        if (
          (!serverSessionsRef.current[currentServerId] || !currentSessionKey) &&
          sessionData.sessions.length > 0
        ) {
          setCurrentSessionKey(sessionData.sessions[0].key)
        }
      }
    } catch (err) {
      chatSidebarLogger.logError('Failed to fetch sessions', err)
      // Fallback to showing current session
      setSessions([{ key: currentSessionKey }])
    } finally {
      if (loadId === sessionLoadIdRef.current) {
        setLoadingSessions(false)
      }
    }
  }, [
    connected,
    listSessions,
    supportsServerSessions,
    currentSessionKey,
    currentServerId,
    setCurrentSessionKey,
  ])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  // Track current session for current server
  useEffect(() => {
    if (currentServerId && currentSessionKey && currentSessionKey !== 'agent:main') {
      // Don't track the default "agent:main" session - it's not server-specific
      // Only track actual session keys
      serverSessionsRef.current[currentServerId] = currentSessionKey
    }
  }, [currentServerId, currentSessionKey])

  // Initialize session for non-molt servers
  useEffect(() => {
    if (!supportsServerSessions && currentSessionKey !== 'agent:main') {
      setCurrentSessionKey('agent:main')
    }
  }, [supportsServerSessions, currentSessionKey, setCurrentSessionKey])

  const handleNewSession = () => {
    const newSessionKey = `agent:main:${Date.now()}`
    setCurrentSessionKey(newSessionKey)
    // Reload sessions list
    loadSessions()
  }

  const handleSelectSession = (sessionKey: string) => {
    setCurrentSessionKey(sessionKey)
  }

  const handleSwitchServer = (serverId: string) => {
    if (serverId !== currentServerId) {
      switchToServer(serverId)

      // Restore last session for this server, or use default
      const server = serversList.find((s) => s.id === serverId)
      const lastSession = serverSessionsRef.current[serverId]

      if (lastSession) {
        // Restore previous session for this server
        setCurrentSessionKey(lastSession)
      } else if (server?.providerType === 'molt') {
        // For molt servers without a saved session, clear the key so loadSessions picks the first one
        // Use a temporary placeholder to avoid the tracking effect saving the old session
        setCurrentSessionKey('')
      } else {
        // For non-molt servers, use consistent "main" session
        setCurrentSessionKey('agent:main')
      }
    }
  }

  return (
    <SidebarLayout
      sidebar={
        <SessionSidebar
          onNewSession={handleNewSession}
          onSelectSession={handleSelectSession}
          sessions={sessions}
          currentSessionKey={currentSessionKey}
          sessionAliases={sessionAliases}
          supportsServerSessions={supportsServerSessions}
          servers={serversList}
          currentServerId={currentServerId}
          onSwitchServer={handleSwitchServer}
          loadingSessions={loadingSessions}
        />
      }
    >
      <ChatScreen providerConfig={providerConfig} />
    </SidebarLayout>
  )
}
