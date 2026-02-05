import { render, screen, waitFor } from '@testing-library/react-native'
import React from 'react'

import HomeScreen from '../index'

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'en',
      changeLanguage: jest.fn(),
    },
  }),
}))

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  Stack: Object.assign(({ children }: { children: React.ReactNode }) => <>{children}</>, {
    Screen: () => null,
  }),
}))

// Mock expo-system-ui
jest.mock('expo-system-ui', () => ({
  setBackgroundColorAsync: jest.fn(),
}))

// Mock react-native-keyboard-controller
jest.mock('react-native-keyboard-controller', () => ({
  KeyboardProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock secure token storage
jest.mock('../../src/services/secureTokenStorage', () => ({
  getServerToken: jest.fn().mockResolvedValue(null),
  setServerToken: jest.fn().mockResolvedValue(undefined),
  deleteServerToken: jest.fn().mockResolvedValue(undefined),
}))

// Mock chat components to avoid pulling in deep native dependencies
jest.mock('../../src/components/chat', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createElement } = require('react')
  return {
    ChatScreen: () => createElement('Text', null, 'ChatScreen'),
  }
})

// Mock deep linking and notifications hooks
jest.mock('../../src/hooks/useDeepLinking', () => ({
  useDeepLinking: jest.fn(),
}))

jest.mock('../../src/hooks/useNotifications', () => ({
  useNotifications: jest.fn(),
}))

// Mock the theme - use real theme values but mock the context provider
jest.mock('../../src/theme', () => {
  const { lightTheme } = jest.requireActual('../../src/theme/themes')

  return {
    ...jest.requireActual('../../src/theme'),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useTheme: () => ({
      theme: lightTheme,
      themeMode: 'light' as const,
      setThemeMode: jest.fn(),
      toggleTheme: jest.fn(),
      colorTheme: 'default' as const,
      setColorTheme: jest.fn(),
    }),
  }
})

// Mock useServers hook
const mockGetProviderConfig = jest.fn()
jest.mock('../../src/hooks/useServers', () => ({
  useServers: () => ({
    servers: {},
    currentServerId: '',
    currentServer: null,
    serversList: [],
    addServer: jest.fn(),
    updateServer: jest.fn(),
    removeServer: jest.fn(),
    switchToServer: jest.fn(),
    getProviderConfig: mockGetProviderConfig,
    getProviderConfigForServer: jest.fn(),
  }),
}))

describe('App Startup', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the home screen without crashing', async () => {
    mockGetProviderConfig.mockResolvedValue(null)

    render(<HomeScreen />)

    await waitFor(() => {
      expect(screen.getByText('home.noServerConfigured')).toBeTruthy()
    })
  })

  it('shows setup prompt when no server is configured', async () => {
    mockGetProviderConfig.mockResolvedValue(null)

    render(<HomeScreen />)

    await waitFor(() => {
      expect(screen.getByText('home.noServerConfigured')).toBeTruthy()
      expect(screen.getByText('home.noServerMessage')).toBeTruthy()
      expect(screen.getByText('home.goToSettings')).toBeTruthy()
    })
  })

  it('renders chat screen when a server is configured', async () => {
    mockGetProviderConfig.mockResolvedValue({
      type: 'echo',
      url: 'http://localhost:3000',
      token: 'test-token',
    })

    render(<HomeScreen />)

    await waitFor(() => {
      expect(screen.getByText('ChatScreen')).toBeTruthy()
      expect(screen.queryByText('home.noServerConfigured')).toBeNull()
    })
  })
})
