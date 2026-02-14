import de from '../locales/de.json'
import en from '../locales/en.json'
import es from '../locales/es.json'
import fr from '../locales/fr.json'
import hi from '../locales/hi.json'
import ja from '../locales/ja.json'
import ko from '../locales/ko.json'
import ptBR from '../locales/pt-BR.json'
import ru from '../locales/ru.json'
import zhCN from '../locales/zh-CN.json'
import zhTW from '../locales/zh-TW.json'

type NestedRecord = { [key: string]: string | NestedRecord }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Recursively extract all leaf keys from a nested object using dot notation. */
function getKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = []
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (isRecord(value)) {
      keys.push(...getKeys(value, fullKey))
    } else {
      keys.push(fullKey)
    }
  }
  return keys.sort()
}

const locales: Record<string, Record<string, unknown>> = {
  en,
  es,
  fr,
  de,
  hi,
  ja,
  ko,
  'pt-BR': ptBR,
  ru,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
}

const enKeys = getKeys(en)

// All skills-related keys from en.json
const skillsKeys = enKeys.filter((key) => key.startsWith('skills.'))

describe('Skills i18n translations', () => {
  it('has skills keys defined in en.json', () => {
    expect(skillsKeys.length).toBeGreaterThan(0)
  })

  it('en.json contains all required skills keys', () => {
    const requiredKeys = [
      'skills.title',
      'skills.subtitle',
      'skills.teach',
      'skills.teachSkill',
      'skills.noSkills',
      'skills.openClawOnly',
      'skills.openClawOnlyDescription',
      'skills.clawHub.title',
      'skills.clawHub.description',
      'skills.clawHub.search',
      'skills.clawHub.searchPlaceholder',
      'skills.clawHub.noResults',
      'skills.clawHub.install',
      'skills.clawHub.installSuccess',
      'skills.clawHub.installError',
      'skills.clawHub.searchError',
      'skills.clawHub.installMessage',
      'skills.clawHub.author',
      'skills.clawHub.installs',
    ]

    for (const key of requiredKeys) {
      expect(enKeys).toContain(key)
    }
  })

  // Verify every locale has every skills key from en.json
  const nonEnLocales = Object.keys(locales).filter((code) => code !== 'en')

  for (const localeCode of nonEnLocales) {
    describe(`${localeCode} locale`, () => {
      it('has all skills keys from en.json', () => {
        const localeKeys = getKeys(locales[localeCode])
        const missingKeys = skillsKeys.filter((key) => !localeKeys.includes(key))

        expect(missingKeys).toEqual([])
      })
    })
  }

  it('installMessage key contains interpolation placeholders in all locales', () => {
    for (const [code, locale] of Object.entries(locales)) {
      const skills = locale.skills as NestedRecord
      const clawHub = skills?.clawHub as NestedRecord
      const installMessage = clawHub?.installMessage as string

      expect(installMessage).toBeDefined()
      expect(installMessage).toContain('{{name}}')
      expect(installMessage).toContain('{{description}}')
      expect(installMessage).toContain('{{content}}')
      // Provide context on failure
      if (!installMessage?.includes('{{name}}')) {
        throw new Error(`${code}: installMessage missing {{name}} placeholder`)
      }
    }
  })

  it('installSuccess key contains name interpolation placeholder in all locales', () => {
    for (const [code, locale] of Object.entries(locales)) {
      const skills = locale.skills as NestedRecord
      const clawHub = skills?.clawHub as NestedRecord
      const installSuccess = clawHub?.installSuccess as string

      expect(installSuccess).toBeDefined()
      expect(installSuccess).toContain('{{name}}')
      if (!installSuccess?.includes('{{name}}')) {
        throw new Error(`${code}: installSuccess missing {{name}} placeholder`)
      }
    }
  })
})
