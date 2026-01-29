import { lightColors, darkColors, Colors } from './colors';
import { typography, Typography } from './typography';
import { spacing, borderRadius, Spacing, BorderRadius } from './spacing';

export interface Theme {
  colors: Colors;
  typography: Typography;
  spacing: Spacing;
  borderRadius: BorderRadius;
  isDark: boolean;
}

export const lightTheme: Theme = {
  colors: lightColors,
  typography,
  spacing,
  borderRadius,
  isDark: false,
};

export const darkTheme: Theme = {
  colors: darkColors,
  typography,
  spacing,
  borderRadius,
  isDark: true,
};

export type ThemeMode = 'light' | 'dark' | 'system';
