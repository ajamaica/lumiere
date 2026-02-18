import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { Text } from 'react-native'

import { AnimatedGradient, GradientBubble, GradientButton } from '../'

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) => {
    const MockedLinearGradient = require('react-native').View // eslint-disable-line @typescript-eslint/no-require-imports
    return (
      <MockedLinearGradient testID="linear-gradient" {...props}>
        {children}
      </MockedLinearGradient>
    )
  },
}))

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Reanimated = require('react-native-reanimated/mock')

  // Add missing mocks
  Reanimated.default.createAnimatedComponent = (component: any) => component
  Reanimated.default.Easing = {
    out: jest.fn(() => jest.fn()),
    inOut: jest.fn(() => jest.fn()),
    in: jest.fn(() => jest.fn()),
    linear: jest.fn(),
    ease: jest.fn(),
  }

  return Reanimated
})

// Mock theme hook
jest.mock('../../../theme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        primary: '#22D3EE',
        primaryLight: '#67E8F9',
        primaryDark: '#0891B2',
        surface: '#0A1628',
        surfaceVariant: '#1E3A5F',
        border: '#1E3A5F',
        text: {
          primary: '#F0F4F8',
          secondary: '#8892A8',
          inverse: '#FFFFFF',
        },
        status: {
          success: '#10B981',
          error: '#EF4444',
          warning: '#F59E0B',
          info: '#3B82F6',
        },
      },
      typography: {
        fontSize: {
          sm: 14,
          base: 16,
          lg: 18,
        },
        fontWeight: {
          semibold: '600',
        },
      },
      spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
      },
      borderRadius: {
        xs: 4,
        sm: 8,
        lg: 16,
        xxl: 24,
      },
    },
  }),
}))

describe('New Gradient Components', () => {
  describe('GradientBubble', () => {
    it('renders with default user variant', () => {
      const { getByText } = render(
        <GradientBubble>
          <Text>User message</Text>
        </GradientBubble>,
      )
      expect(getByText('User message')).toBeTruthy()
    })

    it('renders with agent variant', () => {
      const { getByText } = render(
        <GradientBubble variant="agent">
          <Text>Agent message</Text>
        </GradientBubble>,
      )
      expect(getByText('Agent message')).toBeTruthy()
    })

    it('renders with animation disabled', () => {
      const { getByText } = render(
        <GradientBubble animated={false}>
          <Text>Static message</Text>
        </GradientBubble>,
      )
      expect(getByText('Static message')).toBeTruthy()
    })

    it('accepts custom style props', () => {
      const { getByText } = render(
        <GradientBubble style={{ margin: 10 }}>
          <Text>Styled message</Text>
        </GradientBubble>,
      )
      expect(getByText('Styled message')).toBeTruthy()
    })
  })

  describe('GradientButton', () => {
    it('renders with default props', () => {
      const { getByText } = render(<GradientButton title="Default Button" />)
      expect(getByText('Default Button')).toBeTruthy()
    })

    it('renders with different presets', () => {
      const presets: Array<'primary' | 'accent' | 'success' | 'warning'> = [
        'primary',
        'accent',
        'success',
        'warning',
      ]

      presets.forEach((preset) => {
        const { getByText } = render(<GradientButton title={`${preset} button`} preset={preset} />)
        expect(getByText(`${preset} button`)).toBeTruthy()
      })
    })

    it('renders with different sizes', () => {
      const sizes: Array<'sm' | 'md' | 'lg'> = ['sm', 'md', 'lg']

      sizes.forEach((size) => {
        const { getByText } = render(<GradientButton title={`${size} button`} size={size} />)
        expect(getByText(`${size} button`)).toBeTruthy()
      })
    })

    it('handles loading state', () => {
      const { queryByText } = render(<GradientButton title="Loading Button" loading={true} />)
      expect(queryByText('Loading Button')).toBeNull()
      // ActivityIndicator should be rendered instead
    })

    it('handles disabled state', () => {
      const onPressMock = jest.fn()
      const { getByText } = render(
        <GradientButton title="Disabled Button" disabled={true} onPress={onPressMock} />,
      )

      const button = getByText('Disabled Button')
      fireEvent.press(button)
      expect(onPressMock).not.toHaveBeenCalled()
    })

    it('calls onPress when pressed', () => {
      const onPressMock = jest.fn()
      const { getByText } = render(
        <GradientButton title="Clickable Button" onPress={onPressMock} />,
      )

      const button = getByText('Clickable Button')
      fireEvent.press(button)
      expect(onPressMock).toHaveBeenCalledTimes(1)
    })

    it('renders with custom colors', () => {
      const customColors = ['#FF0000', '#00FF00', '#0000FF'] as const
      const { getByText } = render(<GradientButton title="Custom Colors" colors={customColors} />)
      expect(getByText('Custom Colors')).toBeTruthy()
    })

    it('renders with icon', () => {
      const icon = <Text testID="button-icon">Icon</Text>
      const { getByTestId, getByText } = render(
        <GradientButton title="Button with Icon" icon={icon} />,
      )
      expect(getByTestId('button-icon')).toBeTruthy()
      expect(getByText('Button with Icon')).toBeTruthy()
    })

    it('has proper accessibility props', () => {
      const { getByRole } = render(<GradientButton title="Accessible Button" />)
      expect(getByRole('button')).toBeTruthy()
    })
  })

  describe('AnimatedGradient', () => {
    const testColors = ['#FF0000', '#00FF00', '#0000FF'] as const

    it('renders with default shimmer animation', () => {
      const { getByText } = render(
        <AnimatedGradient colors={testColors}>
          <Text>Animated content</Text>
        </AnimatedGradient>,
      )
      expect(getByText('Animated content')).toBeTruthy()
    })

    it('renders with different animation presets', () => {
      const presets: Array<'shimmer' | 'pulse' | 'wave' | 'breathe' | 'none'> = [
        'shimmer',
        'pulse',
        'wave',
        'breathe',
        'none',
      ]

      presets.forEach((preset) => {
        const { getByText } = render(
          <AnimatedGradient colors={testColors} animationPreset={preset}>
            <Text>{preset} animation</Text>
          </AnimatedGradient>,
        )
        expect(getByText(`${preset} animation`)).toBeTruthy()
      })
    })

    it('renders with custom duration', () => {
      const { getByText } = render(
        <AnimatedGradient colors={testColors} duration={5000}>
          <Text>Custom duration</Text>
        </AnimatedGradient>,
      )
      expect(getByText('Custom duration')).toBeTruthy()
    })

    it('accepts custom style props', () => {
      const { getByText } = render(
        <AnimatedGradient colors={testColors} style={{ padding: 20 }}>
          <Text>Styled gradient</Text>
        </AnimatedGradient>,
      )
      expect(getByText('Styled gradient')).toBeTruthy()
    })

    it('renders without animation when preset is none', () => {
      const { getByText } = render(
        <AnimatedGradient colors={testColors} animationPreset="none">
          <Text>Static gradient</Text>
        </AnimatedGradient>,
      )
      expect(getByText('Static gradient')).toBeTruthy()
    })
  })

  describe('Component Integration', () => {
    it('all components can be used together', () => {
      const { getByText } = render(
        <AnimatedGradient colors={['#FF0000', '#00FF00']}>
          <GradientBubble variant="user">
            <Text>User message in animated gradient</Text>
          </GradientBubble>
          <GradientButton title="Action Button" />
        </AnimatedGradient>,
      )

      expect(getByText('User message in animated gradient')).toBeTruthy()
      expect(getByText('Action Button')).toBeTruthy()
    })
  })
})
