import { useAtom } from 'jotai'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { DEFAULT_SESSION_KEY } from '../../constants'
import { useServers } from '../../hooks/useServers'
import { useOpenCrawGateway } from '../../services/opencraw'
import { ProviderConfig, readSessionIndex } from '../../services/providers'
import {
  createSessionKey,
  currentSessionKeyAtom,
  isMissionSession,
  sessionAliasesAtom,
} from '../../store'
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

  const isOpenCrawProvider = providerConfig?.type === 'opencraw'
  // Providers that support session management (server-side or locally managed)
  const supportsServerSessions = isOpenCrawProvider || providerConfig?.type === 'echo'

  const { connected, connect, disconnect, listSessions } = useOpenCrawGateway({
    url: providerConfig?.url || '',
    token: providerConfig?.token || '',
  })

  useEffect(() => {
    // Only connect to gateway for OpenCraw providers (WebSocket-based sessions)
    if (providerConfig && isOpenCrawProvider) {
      connect()
    }
    return () => {
      disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerConfig, isOpenCrawProvider, currentServerId])

  const loadSessions = useCallback(async () => {
    // Increment load ID so any in-flight request from a previous server
    // is discarded when it resolves.
    const loadId = ++sessionLoadIdRef.current

    // For providers without session support, just show current session
    if (!supportsServerSessions) {
      setSessions([{ key: currentSessionKey }])
      setLoadingSessions(false)
      return
    }

    // OpenCraw: load sessions from WebSocket gateway
    if (isOpenCrawProvider) {
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
          // Hide mission sessions from the regular chat list
          const chatSessions = sessionData.sessions.filter((s) => !isMissionSession(s.key))
          setSessions(chatSessions)

          // Only auto-select a session if there's no current key or it's the
          // default key that doesn't exist on this server. Don't override a
          // freshly-created session key that hasn't been persisted to the
          // server yet (sessions are created implicitly on first message).
          const currentKeyInSessions =
            currentSessionKey && chatSessions.some((s) => s.key === currentSessionKey)
          if (
            !currentKeyInSessions &&
            chatSessions.length > 0 &&
            (!currentSessionKey || currentSessionKey === DEFAULT_SESSION_KEY)
          ) {
            setCurrentSessionKey(chatSessions[0].key)
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
      return
    }

    // Non-OpenCraw providers with session support (e.g. echo): load from local index
    setLoadingSessions(true)
    try {
      const entries = await readSessionIndex(providerConfig?.serverId)
      if (loadId !== sessionLoadIdRef.current) return
      const chatSessions: Session[] = entries
        .filter((e) => !isMissionSession(e.key))
        .sort((a, b) => b.lastActivity - a.lastActivity)
        .map((e) => ({ key: e.key, messageCount: e.messageCount, lastActivity: e.lastActivity }))
      setSessions(chatSessions)
    } catch (err) {
      chatSidebarLogger.logError('Failed to load local sessions', err)
      setSessions([{ key: currentSessionKey }])
    } finally {
      if (loadId === sessionLoadIdRef.current) {
        setLoadingSessions(false)
      }
    }
  }, [
    connected,
    listSessions,
    isOpenCrawProvider,
    supportsServerSessions,
    providerConfig?.serverId,
    currentSessionKey,
    setCurrentSessionKey,
  ])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  // Track current session for current server
  useEffect(() => {
    if (currentServerId && currentSessionKey && currentSessionKey !== DEFAULT_SESSION_KEY) {
      // Don't track the default "agent:main:main" session - it's not server-specific
      // Only track actual session keys
      serverSessionsRef.current[currentServerId] = currentSessionKey
    }
  }, [currentServerId, currentSessionKey])

  // Initialize session for providers without session support
  useEffect(() => {
    if (!supportsServerSessions && currentSessionKey !== DEFAULT_SESSION_KEY) {
      setCurrentSessionKey(DEFAULT_SESSION_KEY)
    }
  }, [supportsServerSessions, currentSessionKey, setCurrentSessionKey])

  const handleNewSession = () => {
    const newSessionKey = createSessionKey('main', `${Date.now()}`)
    setCurrentSessionKey(newSessionKey)
    // Reload sessions list
    loadSessions()
  }

  const handleSelectSession = (sessionKey: string) => {
    if (isMissionSession(sessionKey)) return
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
      } else if (server?.providerType === 'opencraw' || server?.providerType === 'echo') {
        // For providers with session support without a saved session,
        // clear the key so loadSessions picks the first one
        setCurrentSessionKey('')
      } else {
        // For providers without session support, use consistent "main" session
        setCurrentSessionKey(DEFAULT_SESSION_KEY)
      }
    }
  }

  const sidebarElement = useMemo(
    () => (
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
    ),
    [
      handleNewSession,
      handleSelectSession,
      sessions,
      currentSessionKey,
      sessionAliases,
      supportsServerSessions,
      serversList,
      currentServerId,
      handleSwitchServer,
      loadingSessions,
    ],
  )

  return (
    <SidebarLayout sidebar={sidebarElement}>
      <ChatScreen providerConfig={providerConfig} />
    </SidebarLayout>
  )
}
