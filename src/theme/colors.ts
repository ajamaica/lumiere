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
