import { colorThemes, darkColors, lightColors } from '../colors'

describe('lightColors', () => {
  it('has the expected primary color', () => {
    expect(lightColors.primary).toBe('#FF6B47')
  })

  it('contains all required text color keys', () => {
    expect(lightColors.text).toHaveProperty('primary')
    expect(lightColors.text).toHaveProperty('secondary')
    expect(lightColors.text).toHaveProperty('tertiary')
    expect(lightColors.text).toHaveProperty('inverse')
  })

  it('contains all required status color keys', () => {
    expect(lightColors.status).toHaveProperty('success')
    expect(lightColors.status).toHaveProperty('error')
    expect(lightColors.status).toHaveProperty('warning')
    expect(lightColors.status).toHaveProperty('info')
  })

  it('contains all required message color keys', () => {
    expect(lightColors.message).toHaveProperty('user')
    expect(lightColors.message).toHaveProperty('agent')
    expect(lightColors.message).toHaveProperty('userText')
    expect(lightColors.message).toHaveProperty('agentText')
  })
})

describe('darkColors', () => {
  it('has the expected primary color', () => {
    expect(darkColors.primary).toBe('#FFD60A')
  })

  it('has a dark background', () => {
    expect(darkColors.background).toBe('#000000')
  })

  it('has inverse text colors compared to light', () => {
    expect(darkColors.text.primary).toBe('#FFFFFF')
    expect(darkColors.text.inverse).toBe('#000000')
  })
})

describe('colorThemes', () => {
  const themeKeys = ['default', 'pink', 'green', 'red', 'blue', 'purple', 'orange', 'glass']

  it('has all expected theme keys', () => {
    expect(Object.keys(colorThemes)).toEqual(expect.arrayContaining(themeKeys))
  })

  it.each(themeKeys)('%s theme has light and dark variants with required fields', (key) => {
    const theme = colorThemes[key as keyof typeof colorThemes]
    expect(theme).toHaveProperty('name')
    expect(theme).toHaveProperty('light')
    expect(theme).toHaveProperty('dark')

    // Both variants must have primary colors and message colors
    for (const variant of [theme.light, theme.dark]) {
      expect(variant).toHaveProperty('primary')
      expect(variant).toHaveProperty('primaryLight')
      expect(variant).toHaveProperty('primaryDark')
      expect(variant).toHaveProperty('messageUser')
      expect(variant).toHaveProperty('messageUserText')
    }
  })

  it('glass theme has surface overrides', () => {
    const glass = colorThemes.glass
    expect(glass.light.background).toBeDefined()
    expect(glass.light.surface).toBeDefined()
    expect(glass.dark.background).toBeDefined()
    expect(glass.dark.surface).toBeDefined()
  })
})
