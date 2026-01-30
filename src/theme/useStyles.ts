import { useMemo } from 'react'

import { useTheme } from './ThemeContext'
import { Theme } from './themes'

/**
 * Hook that eliminates the repetitive StyleSheet creation pattern.
 *
 * Before:
 *   const { theme } = useTheme()
 *   const styles = useMemo(() => createStyles(theme), [theme])
 *
 * After:
 *   const { styles, theme } = useStyles(createStyles)
 */
export function useStyles<T>(createStyles: (theme: Theme) => T): { styles: T; theme: Theme } {
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme, createStyles])
  return { styles, theme }
}
