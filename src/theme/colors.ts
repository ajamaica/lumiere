export const lightColors = {
  primary: '#f07b49',
  primaryLight: '#f59d6f',
  primaryDark: '#d4612c',

  background: '#fde9c9',
  surface: '#F2F2F7',
  surfaceVariant: '#E5E5EA',

  text: {
    primary: '#000000',
    secondary: '#8E8E93',
    tertiary: '#C7C7CC',
    inverse: '#FFFFFF',
  },

  message: {
    user: '#f2af4c',
    agent: '#343434',
    userText: '#FFFFFF',
    agentText: '#FFFFFF',
  },

  status: {
    success: '#34C759',
    error: '#FF3B30',
    warning: '#FF9500',
    info: '#5AC8FA',
  },

  border: '#E5E5EA',
  divider: '#C7C7CC',
  shadow: 'rgba(0, 0, 0, 0.1)',
}

export const darkColors = {
  primary: '#f07b49',
  primaryLight: '#f59d6f',
  primaryDark: '#d4612c',

  background: '#343434',
  surface: '#1C1C1E',
  surfaceVariant: '#2C2C2E',

  text: {
    primary: '#FFFFFF',
    secondary: '#8E8E93',
    tertiary: '#48484A',
    inverse: '#000000',
  },

  message: {
    user: '#f2af4c',
    agent: '#2C2C2E',
    userText: '#FFFFFF',
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
