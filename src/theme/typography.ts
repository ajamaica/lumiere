import { monospaceFontFamily } from '../utils/platform'

export const typography = {
  fontSize: {
    xs: 11,
    sm: 13,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },

  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  fontFamily: {
    regular: 'System',
    monospace: monospaceFontFamily,
  },
}

export type Typography = typeof typography
