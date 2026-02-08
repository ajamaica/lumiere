export const lightColors = {
  primary: '#22D3EE',
  primaryLight: '#67E8F9',
  primaryDark: '#06B6D4',

  background: '#F0F4F8',
  surface: '#FFFFFF',
  surfaceVariant: '#E8EDF4',

  text: {
    primary: '#1A2A3A',
    secondary: '#64748B',
    tertiary: '#94A3B8',
    inverse: '#FFFFFF',
  },

  message: {
    user: '#22D3EE',
    agent: '#E8EDF4',
    userText: '#050A18',
    agentText: '#1A2A3A',
  },

  status: {
    success: '#34C759',
    error: '#FF3B30',
    warning: '#FF9500',
    info: '#5AC8FA',
  },

  border: '#CBD5E1',
  divider: '#E2E8F0',
  shadow: 'rgba(0, 40, 80, 0.08)',
}

export const darkColors = {
  primary: '#22D3EE',
  primaryLight: '#67E8F9',
  primaryDark: '#06B6D4',

  background: '#050A18',
  surface: '#0A1628',
  surfaceVariant: '#0F1D32',

  text: {
    primary: '#F0F4F8',
    secondary: '#8892A8',
    tertiary: '#4A5568',
    inverse: '#050A18',
  },

  message: {
    user: '#22D3EE',
    agent: '#0F1D32',
    userText: '#050A18',
    agentText: '#F0F4F8',
  },

  status: {
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#22D3EE',
  },

  border: '#1E3A5F',
  divider: '#1E3A5F',
  shadow: 'rgba(0, 0, 0, 0.5)',
}

// Gradient color definitions for use across the app
export const gradientColors = {
  primary: ['#22D3EE', '#06B6D4'],
  accent: ['#A855F7', '#22D3EE'],
  hero: ['#22D3EE', '#A855F7', '#EC4899'],
  subtle: ['#22D3EE', '#67E8F9'],
  purple: ['#A855F7', '#7C3AED'],
  warm: ['#F59E0B', '#EC4899'],
}

export type GradientKey = keyof typeof gradientColors

export type Colors = typeof lightColors

// Color theme definitions - each provides primary colors for light and dark modes
// Surface overrides are optional and used by themes like "glass" that change the full palette
export interface ColorThemeVariant {
  primary: string
  primaryLight: string
  primaryDark: string
  messageUser: string
  messageUserText: string
  // Optional surface overrides for full-palette themes
  background?: string
  surface?: string
  surfaceVariant?: string
  messageAgent?: string
  messageAgentText?: string
  textPrimary?: string
  textSecondary?: string
  textTertiary?: string
  textInverse?: string
  border?: string
  divider?: string
  shadow?: string
}

export interface ColorThemePalette {
  name: string
  light: ColorThemeVariant
  dark: ColorThemeVariant
}

export type ColorThemeKey =
  | 'lumiere'
  | 'pink'
  | 'green'
  | 'red'
  | 'blue'
  | 'purple'
  | 'orange'
  | 'glass'

export const colorThemes: Record<ColorThemeKey, ColorThemePalette> = {
  pink: {
    name: 'Pink',
    light: {
      primary: '#E91E8C',
      primaryLight: '#F06CB4',
      primaryDark: '#C4177A',
      messageUser: '#E91E8C',
      messageUserText: '#FFFFFF',
    },
    dark: {
      primary: '#FF6EB4',
      primaryLight: '#FF9CCE',
      primaryDark: '#E85A9E',
      messageUser: '#FF6EB4',
      messageUserText: '#000000',
    },
  },
  green: {
    name: 'Green',
    light: {
      primary: '#2E9E5A',
      primaryLight: '#5BBE82',
      primaryDark: '#24804A',
      messageUser: '#2E9E5A',
      messageUserText: '#FFFFFF',
    },
    dark: {
      primary: '#4ADE80',
      primaryLight: '#86EFAC',
      primaryDark: '#3EBF6E',
      messageUser: '#4ADE80',
      messageUserText: '#000000',
    },
  },
  red: {
    name: 'Red',
    light: {
      primary: '#DC2626',
      primaryLight: '#EF4444',
      primaryDark: '#B91C1C',
      messageUser: '#DC2626',
      messageUserText: '#FFFFFF',
    },
    dark: {
      primary: '#F87171',
      primaryLight: '#FCA5A5',
      primaryDark: '#EF4444',
      messageUser: '#F87171',
      messageUserText: '#000000',
    },
  },
  blue: {
    name: 'Blue',
    light: {
      primary: '#2563EB',
      primaryLight: '#60A5FA',
      primaryDark: '#1D4ED8',
      messageUser: '#2563EB',
      messageUserText: '#FFFFFF',
    },
    dark: {
      primary: '#60A5FA',
      primaryLight: '#93C5FD',
      primaryDark: '#3B82F6',
      messageUser: '#60A5FA',
      messageUserText: '#000000',
    },
  },
  purple: {
    name: 'Purple',
    light: {
      primary: '#7C3AED',
      primaryLight: '#A78BFA',
      primaryDark: '#6D28D9',
      messageUser: '#7C3AED',
      messageUserText: '#FFFFFF',
    },
    dark: {
      primary: '#A78BFA',
      primaryLight: '#C4B5FD',
      primaryDark: '#8B5CF6',
      messageUser: '#A78BFA',
      messageUserText: '#000000',
    },
  },
  orange: {
    name: 'Orange',
    light: {
      primary: '#EA580C',
      primaryLight: '#FB923C',
      primaryDark: '#C2410C',
      messageUser: '#EA580C',
      messageUserText: '#FFFFFF',
    },
    dark: {
      primary: '#FB923C',
      primaryLight: '#FDBA74',
      primaryDark: '#F97316',
      messageUser: '#FB923C',
      messageUserText: '#000000',
    },
  },
  glass: {
    name: 'Glass',
    light: {
      primary: '#6A7BDB',
      primaryLight: '#8E9BEA',
      primaryDark: '#4F5FC0',
      messageUser: 'rgba(106, 123, 219, 0.85)',
      messageUserText: '#FFFFFF',
      background: '#F0F2F8',
      surface: 'rgba(255, 255, 255, 0.55)',
      surfaceVariant: 'rgba(220, 225, 240, 0.60)',
      messageAgent: 'rgba(255, 255, 255, 0.50)',
      messageAgentText: '#2C2C3A',
      textPrimary: '#1A1A2E',
      textSecondary: '#6E6E8A',
      textTertiary: '#A0A0B8',
      textInverse: '#FFFFFF',
      border: 'rgba(180, 190, 220, 0.40)',
      divider: 'rgba(160, 170, 200, 0.30)',
      shadow: 'rgba(100, 110, 160, 0.12)',
    },
    dark: {
      primary: '#8E9BEA',
      primaryLight: '#B0BAFB',
      primaryDark: '#6A7BDB',
      messageUser: 'rgba(142, 155, 234, 0.80)',
      messageUserText: '#FFFFFF',
      background: '#0A0A14',
      surface: 'rgba(255, 255, 255, 0.08)',
      surfaceVariant: 'rgba(255, 255, 255, 0.12)',
      messageAgent: 'rgba(255, 255, 255, 0.06)',
      messageAgentText: '#E0E0F0',
      textPrimary: '#F0F0FF',
      textSecondary: '#8888A8',
      textTertiary: '#4A4A64',
      textInverse: '#0A0A14',
      border: 'rgba(255, 255, 255, 0.10)',
      divider: 'rgba(255, 255, 255, 0.06)',
      shadow: 'rgba(0, 0, 0, 0.40)',
    },
  },
  lumiere: {
    name: 'Lumiere',
    light: {
      primary: '#22D3EE',
      primaryLight: '#67E8F9',
      primaryDark: '#06B6D4',
      messageUser: '#22D3EE',
      messageUserText: '#050A18',
      background: '#F0F4F8',
      surface: '#FFFFFF',
      surfaceVariant: '#E8EDF4',
      messageAgent: '#E8EDF4',
      messageAgentText: '#1A2A3A',
      textPrimary: '#1A2A3A',
      textSecondary: '#64748B',
      textTertiary: '#94A3B8',
      textInverse: '#FFFFFF',
      border: '#CBD5E1',
      divider: '#E2E8F0',
      shadow: 'rgba(0, 40, 80, 0.08)',
    },
    dark: {
      primary: '#22D3EE',
      primaryLight: '#67E8F9',
      primaryDark: '#06B6D4',
      messageUser: '#22D3EE',
      messageUserText: '#050A18',
      background: '#050A18',
      surface: '#0A1628',
      surfaceVariant: '#0F1D32',
      messageAgent: '#0F1D32',
      messageAgentText: '#F0F4F8',
      textPrimary: '#F0F4F8',
      textSecondary: '#8892A8',
      textTertiary: '#4A5568',
      textInverse: '#050A18',
      border: '#1E3A5F',
      divider: '#1E3A5F',
      shadow: 'rgba(0, 0, 0, 0.5)',
    },
  },
}
