export const lightColors = {
  primary: '#007AFF',
  primaryLight: '#5AC8FA',
  primaryDark: '#0051D5',

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
    user: '#007AFF',
    agent: '#E9E9EB',
    userText: '#FFFFFF',
    agentText: '#000000',
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
  primary: '#0A84FF',
  primaryLight: '#64D2FF',
  primaryDark: '#0066CC',

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
    user: '#0A84FF',
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
