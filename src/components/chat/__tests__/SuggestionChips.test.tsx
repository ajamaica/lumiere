import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'

import type { ResponseSuggestion } from '../../../hooks/useResponseSuggestions'
import { SuggestionChips } from '../SuggestionChips'

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
        xl: 32,
        xxl: 48,
      },
      borderRadius: {
        sm: 4,
        md: 8,
        lg: 12,
        xl: 16,
        xxl: 24,
      },
      typography: {
        fontSize: {
          xs: 11,
          sm: 13,
          base: 15,
          lg: 17,
          xl: 20,
          xxl: 32,
        },
        fontWeight: {
          normal: '400',
          medium: '500',
          semiBold: '600',
          bold: '700',
        },
      },
      isDark: false,
    },
  }),
  Theme: {},
}))

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'chat.generatingSuggestions') return 'Generating suggestions...'
      if (key === 'chat.useSuggestion' && params?.text) return `Use suggestion: ${params.text}`
      return key
    },
  }),
}))

const mockSuggestions: ResponseSuggestion[] = [
  { id: 'suggestion-1', text: 'Sure, tell me more.' },
  { id: 'suggestion-2', text: "That's interesting." },
  { id: 'suggestion-3', text: 'I have a different idea.' },
]

describe('SuggestionChips', () => {
  it('renders nothing when no suggestions and not loading', () => {
    const { toJSON } = render(<SuggestionChips suggestions={[]} onSelect={jest.fn()} />)
    expect(toJSON()).toBeNull()
  })

  it('renders loading state when isLoading with no suggestions', () => {
    const { getByText } = render(
      <SuggestionChips suggestions={[]} onSelect={jest.fn()} isLoading />,
    )
    expect(getByText('Generating suggestions...')).toBeTruthy()
  })

  it('renders suggestion chips', () => {
    const { getByText } = render(
      <SuggestionChips suggestions={mockSuggestions} onSelect={jest.fn()} />,
    )

    expect(getByText('Sure, tell me more.')).toBeTruthy()
    expect(getByText("That's interesting.")).toBeTruthy()
    expect(getByText('I have a different idea.')).toBeTruthy()
  })

  it('calls onSelect with the suggestion text when tapped', () => {
    const onSelect = jest.fn()
    const { getByText } = render(
      <SuggestionChips suggestions={mockSuggestions} onSelect={onSelect} />,
    )

    fireEvent.press(getByText('Sure, tell me more.'))
    expect(onSelect).toHaveBeenCalledWith('Sure, tell me more.')

    fireEvent.press(getByText("That's interesting."))
    expect(onSelect).toHaveBeenCalledWith("That's interesting.")
  })

  it('shows chips instead of loading when suggestions exist and isLoading is true', () => {
    const { getByText, queryByText } = render(
      <SuggestionChips suggestions={mockSuggestions} onSelect={jest.fn()} isLoading />,
    )

    // Should show chips, not loading text
    expect(getByText('Sure, tell me more.')).toBeTruthy()
    expect(queryByText('Generating suggestions...')).toBeNull()
  })

  it('renders with proper accessibility attributes', () => {
    const { getAllByRole } = render(
      <SuggestionChips suggestions={mockSuggestions} onSelect={jest.fn()} />,
    )

    const buttons = getAllByRole('button')
    expect(buttons.length).toBe(3)
  })

  it('renders a single suggestion', () => {
    const singleSuggestion = [{ id: 'suggestion-1', text: 'Only option' }]
    const { getByText } = render(
      <SuggestionChips suggestions={singleSuggestion} onSelect={jest.fn()} />,
    )

    expect(getByText('Only option')).toBeTruthy()
  })
})
