import { applyColorTheme, darkTheme, lightTheme } from '../themes'

describe('lightTheme', () => {
  it('has isDark set to false', () => {
    expect(lightTheme.isDark).toBe(false)
  })

  it('includes colors, typography, spacing, and borderRadius', () => {
    expect(lightTheme.colors).toBeDefined()
    expect(lightTheme.typography).toBeDefined()
    expect(lightTheme.spacing).toBeDefined()
    expect(lightTheme.borderRadius).toBeDefined()
  })
})

describe('darkTheme', () => {
  it('has isDark set to true', () => {
    expect(darkTheme.isDark).toBe(true)
  })
})

describe('applyColorTheme', () => {
  it('overrides primary colors for color themes', () => {
    const result = applyColorTheme(lightTheme, 'blue')
    expect(result.colors.primary).toBe('#2563EB')
    expect(result.colors.primaryLight).toBe('#60A5FA')
    expect(result.colors.primaryDark).toBe('#1D4ED8')
  })

  it('uses dark variant for dark base theme', () => {
    const result = applyColorTheme(darkTheme, 'blue')
    expect(result.colors.primary).toBe('#60A5FA')
  })

  it('overrides message colors', () => {
    const result = applyColorTheme(lightTheme, 'green')
    expect(result.colors.message.user).toBe('#2E9E5A')
    expect(result.colors.message.userText).toBe('#FFFFFF')
  })

  it('preserves non-overridden colors', () => {
    const result = applyColorTheme(lightTheme, 'blue')
    // Status colors should remain from base theme
    expect(result.colors.status).toEqual(lightTheme.colors.status)
    // Agent message should remain from base theme (blue doesn't override it)
    expect(result.colors.message.agent).toBe(lightTheme.colors.message.agent)
  })

  it('applies surface overrides for glass theme', () => {
    const result = applyColorTheme(lightTheme, 'glass')
    expect(result.colors.background).toBe('#F0F2F8')
    expect(result.colors.text.primary).toBe('#1A1A2E')
  })

  it('preserves isDark flag from base theme', () => {
    const lightResult = applyColorTheme(lightTheme, 'pink')
    const darkResult = applyColorTheme(darkTheme, 'pink')
    expect(lightResult.isDark).toBe(false)
    expect(darkResult.isDark).toBe(true)
  })
})
