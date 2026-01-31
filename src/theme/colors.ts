export const lightColors = {
  primary: '#FF6B47',
  primaryLight: '#FF8A6B',
  primaryDark: '#E85A3C',

  background: '#F2EFE9',
  surface: '#E8E5DD',
  surfaceVariant: '#DDD9D0',

  text: {
    primary: '#3C3C3C',
    secondary: '#9B9B9B',
    tertiary: '#B8B8B8',
    inverse: '#FFFFFF',
  },

  message: {
    user: '#FF6B47',
    agent: '#DDD9D0',
    userText: '#FFFFFF',
    agentText: '#3C3C3C',
  },

  status: {
    success: '#34C759',
    error: '#FF3B30',
    warning: '#FF9500',
    info: '#5AC8FA',
  },

  border: '#DDD9D0',
  divider: '#C7C7C7',
  shadow: 'rgba(0, 0, 0, 0.08)',
}

export const darkColors = {
  primary: '#FFD60A',
  primaryLight: '#FFE34D',
  primaryDark: '#FFCC00',

  background: '#000000',
  surface: '#1C1C1E',
  surfaceVariant: '#2C2C2E',

  text: {
    primary: '#FFFFFF',
    secondary: '#8E8E93',
    tertiary: '#48484A',
    inverse: '#000000',
  },

  message: {
    user: '#FFD60A',
    agent: '#2C2C2E',
    userText: '#000000',
    agentText: '#FFFFFF',
  },

  status: {
    success: '#32D74B',
    error: '#FF453A',
    warning: '#FF9F0A',
    info: '#64D2FF',
  },

  border: '#38383A',
  divider: '#48484A',
  shadow: 'rgba(0, 0, 0, 0.3)',
}

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
  | 'default'
  | 'pink'
  | 'green'
  | 'red'
  | 'blue'
  | 'purple'
  | 'orange'
  | 'glass'

export const colorThemes: Record<ColorThemeKey, ColorThemePalette> = {
  default: {
    name: 'Default',
    light: {
      primary: '#FF6B47',
      primaryLight: '#FF8A6B',
      primaryDark: '#E85A3C',
      messageUser: '#FF6B47',
      messageUserText: '#FFFFFF',
    },
    dark: {
      primary: '#FFD60A',
      primaryLight: '#FFE34D',
      primaryDark: '#FFCC00',
      messageUser: '#FFD60A',
      messageUserText: '#000000',
    },
  },
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
}
