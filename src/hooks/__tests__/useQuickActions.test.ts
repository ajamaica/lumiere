import * as QuickActions from 'expo-quick-actions'
import { useRouter } from 'expo-router'
import { getDefaultStore, useAtomValue } from 'jotai'
import { useCallback, useEffect } from 'react'

import { useQuickActions } from '../useQuickActions'

// ---------- mocks ----------

jest.mock('expo-quick-actions', () => ({
  setItems: jest.fn().mockResolvedValue(undefined),
  addListener: jest.fn(() => ({ remove: jest.fn() })),
  initial: undefined,
}))

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}))

jest.mock('jotai', () => ({
  useAtomValue: jest.fn(),
  getDefaultStore: jest.fn(),
  atom: jest.fn((initial: unknown) => ({ init: initial })),
}))

jest.mock('jotai/utils', () => ({
  atomWithStorage: jest.fn((_key: string, initial: unknown) => ({ init: initial })),
  createJSONStorage: jest.fn(),
}))

jest.mock('react', () => {
  const actual = jest.requireActual('react')
  return {
    ...actual,
    useCallback: jest.fn(actual.useCallback),
    useEffect: jest.fn(),
  }
})

// ---------- helpers ----------

function setupHook(
  overrides: {
    triggers?: Record<
      string,
      { id: string; message: string; sessionKey: string; serverId: string; createdAt: number }
    >
    servers?: Record<
      string,
      { id: string; name: string; url: string; providerType: string; createdAt: number }
    >
    initial?: QuickActions.Action
  } = {},
) {
  const triggers = overrides.triggers ?? {}
  const servers = overrides.servers ?? {}

  // useAtomValue returns triggers first, then servers
  let atomCallIndex = 0
  ;(useAtomValue as jest.Mock).mockImplementation(() => {
    const idx = atomCallIndex++
    if (idx === 0) return triggers
    if (idx === 1) return servers
    return {}
  })

  const mockRouter = { canDismiss: jest.fn(() => false), dismissAll: jest.fn() }
  ;(useRouter as jest.Mock).mockReturnValue(mockRouter)

  const mockStore = {
    get: jest.fn().mockReturnValue(triggers),
    set: jest.fn(),
  }
  ;(getDefaultStore as jest.Mock).mockReturnValue(mockStore)

  // Capture effects
  const effects: Array<() => (() => void) | void> = []
  ;(useEffect as jest.Mock).mockImplementation((fn: () => (() => void) | void) => {
    effects.push(fn)
  })
  ;(useCallback as jest.Mock).mockImplementation((fn: (...args: unknown[]) => unknown) => fn)

  // Set initial if provided
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(QuickActions as any).initial = overrides.initial ?? undefined

  // eslint-disable-next-line react-hooks/rules-of-hooks -- test helper that drives hooks imperatively
  useQuickActions()

  return { effects, mockRouter, mockStore }
}

// ---------- tests ----------

describe('useQuickActions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('syncing triggers to quick actions', () => {
    it('calls setItems with empty array when there are no triggers', async () => {
      const { effects } = setupHook()

      // First effect is the sync effect
      await effects[0]()

      expect(QuickActions.setItems).toHaveBeenCalledWith([])
    })

    it('syncs triggers as quick action items', async () => {
      const triggers = {
        abc12345: {
          id: 'abc12345',
          message: 'Hello agent',
          sessionKey: 'session-1',
          serverId: 'server-1',
          createdAt: 1000,
        },
        xyz67890: {
          id: 'xyz67890',
          message: 'Run report',
          sessionKey: 'session-2',
          serverId: 'server-2',
          createdAt: 2000,
        },
      }

      const servers = {
        'server-1': {
          id: 'server-1',
          name: 'My Server',
          url: 'ws://localhost',
          providerType: 'molt',
          createdAt: 0,
        },
        'server-2': {
          id: 'server-2',
          name: 'Other Server',
          url: 'ws://other',
          providerType: 'ollama',
          createdAt: 0,
        },
      }

      const { effects } = setupHook({ triggers, servers })
      await effects[0]()

      expect(QuickActions.setItems).toHaveBeenCalledWith([
        {
          id: 'xyz67890',
          title: 'Run report',
          subtitle: 'Other Server',
          icon: 'play',
          params: { slug: 'xyz67890' },
        },
        {
          id: 'abc12345',
          title: 'Hello agent',
          subtitle: 'My Server',
          icon: 'play',
          params: { slug: 'abc12345' },
        },
      ])
    })

    it('truncates long messages in the title', async () => {
      const triggers = {
        longmsg1: {
          id: 'longmsg1',
          message: 'This is a very long message that exceeds forty characters limit',
          sessionKey: 'session-1',
          serverId: 'server-1',
          createdAt: 1000,
        },
      }

      const { effects } = setupHook({ triggers })
      await effects[0]()

      const items = (QuickActions.setItems as jest.Mock).mock.calls[0][0]
      expect(items[0].title).toBe('This is a very long message that exce...')
      expect(items[0].title.length).toBeLessThanOrEqual(40)
    })

    it('shows "Unknown server" when server is not found', async () => {
      const triggers = {
        noserver: {
          id: 'noserver',
          message: 'Test',
          sessionKey: 'session-1',
          serverId: 'missing-server',
          createdAt: 1000,
        },
      }

      const { effects } = setupHook({ triggers })
      await effects[0]()

      const items = (QuickActions.setItems as jest.Mock).mock.calls[0][0]
      expect(items[0].subtitle).toBe('Unknown server')
    })
  })

  describe('handling quick action presses', () => {
    it('registers a listener for quick action events', () => {
      const { effects } = setupHook()

      // Second effect registers the listener
      effects[1]()

      expect(QuickActions.addListener).toHaveBeenCalledWith(expect.any(Function))
    })

    it('cleans up the listener on unmount', () => {
      const removeFn = jest.fn()
      ;(QuickActions.addListener as jest.Mock).mockReturnValue({ remove: removeFn })

      const { effects } = setupHook()
      const cleanup = effects[1]()

      expect(typeof cleanup).toBe('function')
      ;(cleanup as () => void)()
      expect(removeFn).toHaveBeenCalled()
    })

    it('handles cold-start initial action', async () => {
      const triggers = {
        coldstrt: {
          id: 'coldstrt',
          message: 'Cold start msg',
          sessionKey: 'session-1',
          serverId: 'server-1',
          createdAt: 1000,
        },
      }

      const initialAction: QuickActions.Action = {
        id: 'coldstrt',
        title: 'Cold start msg',
        params: { slug: 'coldstrt' },
      }

      const { effects, mockStore } = setupHook({ triggers, initial: initialAction })

      // Run the listener effect which checks QuickActions.initial
      effects[1]()

      // Allow the async executeTrigger to complete
      await new Promise((r) => setTimeout(r, 0))

      expect(getDefaultStore).toHaveBeenCalled()
      expect(mockStore.get).toHaveBeenCalled()
    })

    it('dismisses modals when a quick action fires and modals are open', async () => {
      const triggers = {
        abc12345: {
          id: 'abc12345',
          message: 'Hello',
          sessionKey: 'session-1',
          serverId: 'server-1',
          createdAt: 1000,
        },
      }

      const { effects, mockRouter, mockStore } = setupHook({ triggers })
      mockRouter.canDismiss.mockReturnValue(true)
      mockStore.get.mockReturnValue(triggers)

      // Second effect registers the listener
      effects[1]()

      // Get the listener callback
      const listenerCallback = (QuickActions.addListener as jest.Mock).mock.calls[0][0]

      // Fire the action
      await listenerCallback({
        id: 'abc12345',
        title: 'Hello',
        params: { slug: 'abc12345' },
      })

      expect(mockRouter.dismissAll).toHaveBeenCalled()
    })
  })
})
