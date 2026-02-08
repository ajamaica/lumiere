import { render } from '@testing-library/react-native'
import React from 'react'
import { Text } from 'react-native'

import { gradientColors } from '../../../theme/colors'
import { GradientBackground, GradientText } from '../'

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) => {
    const MockedLinearGradient = require('react-native').View // eslint-disable-line @typescript-eslint/no-require-imports
    return <MockedLinearGradient {...props}>{children}</MockedLinearGradient>
  },
}))

// Mock @react-native-masked-view/masked-view
jest.mock('@react-native-masked-view/masked-view', () => {
  const MockedMaskedView = ({ children, maskElement }: any) => {
    const MockedView = require('react-native').View // eslint-disable-line @typescript-eslint/no-require-imports
    return (
      <MockedView>
        {maskElement}
        {children}
      </MockedView>
    )
  }
  return MockedMaskedView
})

// Mock theme hook
jest.mock('../../../theme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        primary: '#22D3EE',
        primaryLight: '#67E8F9',
        background: '#050A18',
        surface: '#0A1628',
        text: {
          primary: '#F0F4F8',
          secondary: '#8892A8',
        },
        border: '#1E3A5F',
      },
      typography: {
        fontSize: {
          xxl: 32,
          base: 16,
        },
        fontWeight: {
          regular: '400',
          medium: '500',
          semibold: '600',
          bold: '700',
        },
      },
      spacing: {
        sm: 8,
        lg: 24,
        xl: 32,
      },
      borderRadius: {
        full: 9999,
      },
    },
  }),
}))

describe('Gradient Components', () => {
  describe('GradientText', () => {
    it('renders with default hero preset', () => {
      const { getAllByText } = render(<GradientText>Test Text</GradientText>)
      expect(getAllByText('Test Text')).toHaveLength(2) // Text appears twice due to masking
    })

    it('renders with custom colors', () => {
      const customColors = ['#FF0000', '#00FF00'] as const
      const { getAllByText } = render(
        <GradientText colors={customColors}>Custom Colors</GradientText>,
      )
      expect(getAllByText('Custom Colors')).toHaveLength(2)
    })

    it('renders with different presets', () => {
      const presets: Array<'primary' | 'accent' | 'hero' | 'subtle'> = [
        'primary',
        'accent',
        'hero',
        'subtle',
      ]

      presets.forEach((preset) => {
        const { getAllByText } = render(<GradientText preset={preset}>{preset} text</GradientText>)
        expect(getAllByText(`${preset} text`)).toHaveLength(2)
      })
    })

    it('renders with custom font properties', () => {
      const { getAllByText } = render(
        <GradientText fontSize={24} fontWeight="medium">
          Custom Font
        </GradientText>,
      )
      expect(getAllByText('Custom Font')).toHaveLength(2)
    })
  })

  describe('GradientBackground', () => {
    it('renders with default dark preset', () => {
      const { getByText } = render(
        <GradientBackground>
          <Text>Content</Text>
        </GradientBackground>,
      )
      expect(getByText('Content')).toBeTruthy()
    })

    it('renders with different presets', () => {
      const presets: Array<'dark' | 'subtle' | 'accent' | 'radial'> = [
        'dark',
        'subtle',
        'accent',
        'radial',
      ]

      presets.forEach((preset) => {
        const { getByText } = render(
          <GradientBackground preset={preset}>
            <Text>{preset} content</Text>
          </GradientBackground>,
        )
        expect(getByText(`${preset} content`)).toBeTruthy()
      })
    })

    it('renders with custom colors', () => {
      const customColors = ['#FF0000', '#00FF00', '#0000FF'] as const
      const { getByText } = render(
        <GradientBackground colors={customColors}>
          <Text>Custom Background</Text>
        </GradientBackground>,
      )
      expect(getByText('Custom Background')).toBeTruthy()
    })
  })

  describe('Gradient Colors Export', () => {
    it('exports all expected gradient color sets', () => {
      expect(gradientColors).toHaveProperty('primary')
      expect(gradientColors).toHaveProperty('accent')
      expect(gradientColors).toHaveProperty('hero')
      expect(gradientColors).toHaveProperty('subtle')
      expect(gradientColors).toHaveProperty('purple')
      expect(gradientColors).toHaveProperty('warm')
    })

    it('has correct gradient color arrays', () => {
      expect(Array.isArray(gradientColors.primary)).toBe(true)
      expect(Array.isArray(gradientColors.accent)).toBe(true)
      expect(Array.isArray(gradientColors.hero)).toBe(true)
      expect(gradientColors.hero.length).toBe(3) // Should have 3 colors for hero gradient
    })

    it('has valid hex color values', () => {
      const hexColorRegex = /^#[0-9A-F]{6}$/i

      Object.values(gradientColors).forEach((colorArray) => {
        colorArray.forEach((color) => {
          expect(color).toMatch(hexColorRegex)
        })
      })
    })
  })
})
