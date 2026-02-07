import { useAtom } from 'jotai'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Alert } from 'react-native'

import { useServers } from '../../hooks/useServers'
import { useMoltGateway } from '../../services/molt'
import { ProviderConfig, readSessionIndex, SessionIndexEntry } from '../../services/providers'
import { clearMessagesAtom, currentSessionKeyAtom, sessionAliasesAtom } from '../../store'
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
  const [, setClearMessagesTrigger] = useAtom(clearMessagesAtom)
  const [sessionAliases] = useAtom(sessionAliasesAtom)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const sessionLoadIdRef = useRef(0)
  // Track last session per server
  const serverSessionsRef = useRef<Record<string, string>>({})

  // Molt provider supports server-side sessions via WebSocket gateway
  const supportsServerSessions = providerConfig?.type === 'molt'
  // Apple Intelligence supports local on-device sessions via cached session index
  const supportsLocalSessions = providerConfig?.type === 'apple'
  // Any form of multi-session support (server-side or local)
  const supportsSessions = supportsServerSessions || supportsLocalSessions

  const { connected, connect, disconnect, listSessions, resetSession } = useMoltGateway({
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

  // Load sessions from local session index (for Apple Intelligence)
  const loadLocalSessions = useCallback(async () => {
    const loadId = ++sessionLoadIdRef.current
    setLoadingSessions(true)
    try {
      const entries: SessionIndexEntry[] = await readSessionIndex(providerConfig?.serverId)
      if (loadId !== sessionLoadIdRef.current) return // stale response
      const localSessions: Session[] = entries
        .map((entry) => ({
          key: entry.key,
          messageCount: entry.messageCount,
          lastActivity: entry.lastActivity,
        }))
        .sort((a, b) => (b.lastActivity ?? 0) - (a.lastActivity ?? 0))
      setSessions(localSessions)
    } catch (err) {
      chatSidebarLogger.logError('Failed to load local sessions', err)
      setSessions([{ key: currentSessionKey }])
    } finally {
      if (loadId === sessionLoadIdRef.current) {
        setLoadingSessions(false)
      }
    }
  }, [providerConfig?.serverId, currentSessionKey])

  const loadSessions = useCallback(async () => {
    // Increment load ID so any in-flight request from a previous server
    // is discarded when it resolves.
    const loadId = ++sessionLoadIdRef.current

    // Apple Intelligence uses local session index
    if (supportsLocalSessions) {
      loadLocalSessions()
      return
    }

    // For providers without any session support, just show current session
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
    supportsLocalSessions,
    loadLocalSessions,
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

  // Initialize session for providers without session support
  useEffect(() => {
    if (!supportsSessions && currentSessionKey !== 'agent:main') {
      setCurrentSessionKey('agent:main')
    }
  }, [supportsSessions, currentSessionKey, setCurrentSessionKey])

  const handleNewSession = () => {
    const newSessionKey = `agent:main:${Date.now()}`
    setCurrentSessionKey(newSessionKey)
    // Reload sessions list
    loadSessions()
  }

  const handleResetSession = () => {
    Alert.alert(
      'Reset Session',
      'Are you sure you want to reset the current session? This will clear all message history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              // Only call server reset for Molt providers with server-side sessions
              if (supportsServerSessions) {
                await resetSession(currentSessionKey)
              }
              // Increment trigger to reload message history
              setClearMessagesTrigger((prev) => prev + 1)
              Alert.alert('Success', 'Session has been reset')
              // Reload sessions to update message counts (works for both server and local sessions)
              loadSessions()
            } catch (err) {
              chatSidebarLogger.logError('Failed to reset session', err)
              Alert.alert('Error', 'Failed to reset session')
            }
          },
        },
      ],
    )
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
      } else if (server?.providerType === 'apple') {
        // Apple Intelligence supports local sessions; use default session key
        setCurrentSessionKey('agent:main:main')
      } else {
        // For other providers, use consistent "main" session
        setCurrentSessionKey('agent:main')
      }
    }
  }

  return (
    <SidebarLayout
      sidebar={
        <SessionSidebar
          onNewSession={handleNewSession}
          onResetSession={handleResetSession}
          onSelectSession={handleSelectSession}
          sessions={sessions}
          currentSessionKey={currentSessionKey}
          sessionAliases={sessionAliases}
          supportsServerSessions={supportsSessions}
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
