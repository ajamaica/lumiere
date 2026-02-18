import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { LayoutAnimation } from 'react-native'

import type { ToolEventMessage } from '../chatMessageTypes'
import { ToolEventBubble } from '../ToolEventBubble'

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, ...props }: { name: string; [key: string]: unknown }) => {
    const { View } = require('react-native') // eslint-disable-line @typescript-eslint/no-require-imports
    return <View testID={`icon-${name}`} {...props} />
  },
}))

// Mock jotai
const mockCanvasContent = { current: null as string | null }
const mockSetCanvasVisible = jest.fn()

jest.mock('jotai', () => ({
  useAtomValue: () => mockCanvasContent.current,
  useSetAtom: () => mockSetCanvasVisible,
  atom: jest.fn((initial: unknown) => ({ init: initial })),
}))

// Mock store atoms
jest.mock('../../../store', () => ({
  canvasContentAtom: { init: null },
  canvasVisibleAtom: { init: false },
}))

// Mock theme
jest.mock('../../../theme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        primary: '#22D3EE',
        text: {
          primary: '#F0F4F8',
          secondary: '#8892A8',
          tertiary: '#5A6478',
        },
        border: '#1E3A5F',
        status: { success: '#22C55E', error: '#EF4444' },
      },
      spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
      },
      borderRadius: {
        sm: 4,
        md: 8,
        lg: 12,
      },
      typography: {
        fontSize: {
          xs: 11,
          sm: 13,
          base: 15,
        },
        fontWeight: {
          normal: '400',
          medium: '500',
          semiBold: '600',
        },
      },
      isDark: false,
    },
  }),
}))

// Mock theme/themes for import
jest.mock('../../../theme/themes', () => ({
  Theme: {},
}))

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'missions.subagents.running': 'Running',
        'missions.subagents.error': 'Error',
        'missions.subagents.completed': 'Completed',
        'missions.toolEvent': 'Tool event',
        'canvas.tapToOpen': 'Tap to open',
      }
      return translations[key] || key
    },
  }),
}))

// Mock UI components
jest.mock('../../ui', () => ({
  Text: ({
    children,
    style,
    ...props
  }: {
    children: React.ReactNode
    style?: unknown
    [key: string]: unknown
  }) => {
    const { Text: RNText } = require('react-native') // eslint-disable-line @typescript-eslint/no-require-imports
    return (
      <RNText style={style} {...props}>
        {children}
      </RNText>
    )
  },
}))

function createToolEvent(overrides: Partial<ToolEventMessage> = {}): ToolEventMessage {
  return {
    id: 'tool-1',
    type: 'tool_event',
    toolName: 'web_search',
    toolCallId: 'tc-1',
    status: 'completed',
    sender: 'agent',
    timestamp: new Date(),
    text: 'web_search',
    ...overrides,
  }
}

describe('ToolEventBubble', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCanvasContent.current = null
    // Stub LayoutAnimation.configureNext to avoid native module errors in tests
    LayoutAnimation.configureNext = jest.fn()
  })

  describe('rendering', () => {
    it('renders tool name', () => {
      const { getByText } = render(<ToolEventBubble message={createToolEvent()} />)
      expect(getByText('web_search')).toBeTruthy()
    })

    it('renders completed status text', () => {
      const { getByText } = render(<ToolEventBubble message={createToolEvent()} />)
      expect(getByText('Completed')).toBeTruthy()
    })

    it('renders running status text', () => {
      const { getByText } = render(
        <ToolEventBubble message={createToolEvent({ status: 'running' })} />,
      )
      expect(getByText('Running')).toBeTruthy()
    })

    it('renders error status text', () => {
      const { getByText } = render(
        <ToolEventBubble message={createToolEvent({ status: 'error' })} />,
      )
      expect(getByText('Error')).toBeTruthy()
    })

    it('renders correct icon for known tool', () => {
      const { getByTestId } = render(<ToolEventBubble message={createToolEvent()} />)
      expect(getByTestId('icon-search-outline')).toBeTruthy()
    })

    it('renders default icon for unknown tool', () => {
      const { getByTestId } = render(
        <ToolEventBubble message={createToolEvent({ toolName: 'custom_tool' })} />,
      )
      expect(getByTestId('icon-build-outline')).toBeTruthy()
    })

    it('renders detail for tools with recognized input keys', () => {
      const { getByText } = render(
        <ToolEventBubble
          message={createToolEvent({
            toolName: 'web_search',
            toolInput: { query: 'test query' },
          })}
        />,
      )
      expect(getByText('test query')).toBeTruthy()
    })

    it('renders checkmark icon for completed status', () => {
      const { getByTestId } = render(<ToolEventBubble message={createToolEvent()} />)
      expect(getByTestId('icon-checkmark-circle')).toBeTruthy()
    })

    it('renders alert icon for error status', () => {
      const { getByTestId } = render(
        <ToolEventBubble message={createToolEvent({ status: 'error' })} />,
      )
      expect(getByTestId('icon-alert-circle')).toBeTruthy()
    })
  })

  describe('tool icons', () => {
    const iconTests: Array<[string, string]> = [
      ['web_fetch', 'icon-globe-outline'],
      ['web_search', 'icon-search-outline'],
      ['read', 'icon-document-text-outline'],
      ['write', 'icon-create-outline'],
      ['edit', 'icon-pencil-outline'],
      ['exec', 'icon-terminal-outline'],
      ['browser', 'icon-browsers-outline'],
      ['canvas', 'icon-easel-outline'],
    ]

    it.each(iconTests)('uses correct icon for %s tool', (toolName, expectedIconTestId) => {
      const { getByTestId } = render(<ToolEventBubble message={createToolEvent({ toolName })} />)
      expect(getByTestId(expectedIconTestId)).toBeTruthy()
    })
  })

  describe('tool detail extraction', () => {
    it('extracts URL from web_fetch', () => {
      const { getByText } = render(
        <ToolEventBubble
          message={createToolEvent({
            toolName: 'web_fetch',
            toolInput: { url: 'https://example.com' },
          })}
        />,
      )
      expect(getByText('https://example.com')).toBeTruthy()
    })

    it('extracts pattern from grep', () => {
      const { getByText } = render(
        <ToolEventBubble
          message={createToolEvent({
            toolName: 'grep',
            toolInput: { pattern: 'TODO' },
          })}
        />,
      )
      expect(getByText('TODO')).toBeTruthy()
    })

    it('extracts command from exec', () => {
      const { getByText } = render(
        <ToolEventBubble
          message={createToolEvent({
            toolName: 'exec',
            toolInput: { command: 'npm test' },
          })}
        />,
      )
      expect(getByText('npm test')).toBeTruthy()
    })

    it('does not show detail when toolInput is undefined', () => {
      const { queryByText } = render(
        <ToolEventBubble
          message={createToolEvent({
            toolName: 'web_search',
            toolInput: undefined,
          })}
        />,
      )
      // Should still render the tool name but no detail
      expect(queryByText('web_search')).toBeTruthy()
    })
  })

  describe('expand/collapse', () => {
    it('shows expanded input on press when toolInput exists', () => {
      const message = createToolEvent({
        toolInput: { query: 'test', limit: 10 },
      })

      const { getByText } = render(<ToolEventBubble message={message} />)

      // Press to expand
      fireEvent.press(getByText('web_search'))

      // After expansion, should show the JSON content
      expect(getByText(/"query": "test"/)).toBeTruthy()
    })

    it('does not expand when toolInput is empty', () => {
      const message = createToolEvent({ toolInput: {} })
      const { getByText, queryByText } = render(<ToolEventBubble message={message} />)

      fireEvent.press(getByText('web_search'))

      // Should not show any formatted JSON (no expand happened)
      expect(queryByText(/"query"/)).toBeNull()
    })
  })

  describe('canvas interaction', () => {
    it('opens canvas when canvas tool has content', () => {
      mockCanvasContent.current = '<html>Canvas content</html>'

      const message = createToolEvent({ toolName: 'canvas' })
      const { getByText } = render(<ToolEventBubble message={message} />)

      fireEvent.press(getByText('canvas'))

      expect(mockSetCanvasVisible).toHaveBeenCalledWith(true)
    })

    it('shows open-outline icon when canvas has content', () => {
      mockCanvasContent.current = '<html>Canvas content</html>'

      const message = createToolEvent({ toolName: 'canvas' })
      const { getByTestId } = render(<ToolEventBubble message={message} />)

      expect(getByTestId('icon-open-outline')).toBeTruthy()
    })
  })

  describe('accessibility', () => {
    it('has correct accessibilityLabel for basic tool event', () => {
      const { getByLabelText } = render(<ToolEventBubble message={createToolEvent()} />)
      expect(getByLabelText('Tool event: web_search')).toBeTruthy()
    })

    it('includes detail in accessibilityLabel when present', () => {
      const message = createToolEvent({
        toolName: 'web_fetch',
        toolInput: { url: 'https://example.com' },
      })
      const { getByLabelText } = render(<ToolEventBubble message={message} />)
      expect(getByLabelText('Tool event: web_fetch, https://example.com')).toBeTruthy()
    })

    it('has button role when tool has input', () => {
      const message = createToolEvent({ toolInput: { query: 'test' } })
      const { getByRole } = render(<ToolEventBubble message={message} />)
      expect(getByRole('button')).toBeTruthy()
    })
  })
})
