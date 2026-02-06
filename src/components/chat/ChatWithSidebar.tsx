import { useAtom } from 'jotai'
import React, { useCallback, useEffect, useState } from 'react'
import { Alert } from 'react-native'

import { useServers } from '../../hooks/useServers'
import { useMoltGateway } from '../../services/molt'
import { ProviderConfig } from '../../services/providers'
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

  // Only molt provider supports server-side sessions
  const supportsServerSessions = providerConfig?.type === 'molt'

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

  const loadSessions = useCallback(async () => {
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
      if (sessionData?.sessions && Array.isArray(sessionData.sessions)) {
        setSessions(sessionData.sessions)
      }
    } catch (err) {
      chatSidebarLogger.logError('Failed to fetch sessions', err)
      // Fallback to showing current session
      setSessions([{ key: currentSessionKey }])
    } finally {
      setLoadingSessions(false)
    }
  }, [connected, listSessions, supportsServerSessions, currentSessionKey])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

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
              // Only call server reset for providers that support server sessions
              if (supportsServerSessions) {
                await resetSession(currentSessionKey)
              }
              // Increment trigger to reload message history
              setClearMessagesTrigger((prev) => prev + 1)
              Alert.alert('Success', 'Session has been reset')
              // Reload sessions to update message counts
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
