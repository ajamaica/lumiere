/**
 * Unit tests for voice-devotional skill
 */

const VoiceDevotion = require('../scripts/voice-devotional')
const LessonGenerator = require('../scripts/lesson-generator')

describe('LessonGenerator', () => {
  let generator

  beforeEach(() => {
    generator = new LessonGenerator()
  })

  describe('generateDailyDevotion', () => {
    test('should generate devotion for peace theme', async () => {
      const result = await generator.generateDailyDevotion('peace')

      expect(result.type).toBe('daily-devotional')
      expect(result.theme).toBe('peace')
      expect(result.scripture).toBeDefined()
      expect(result.reflection).toBeDefined()
      expect(result.prayer).toBeDefined()
      expect(result.references).toBeDefined()
      expect(Array.isArray(result.references)).toBe(true)
    })

    test('should generate devotion for default theme', async () => {
      const result = await generator.generateDailyDevotion()

      expect(result.type).toBe('daily-devotional')
      expect(result.scripture).toBeDefined()
    })

    test('should have estimated duration', async () => {
      const result = await generator.generateDailyDevotion('faith')

      expect(result.estimatedDuration).toBeDefined()
      expect(typeof result.estimatedDuration).toBe('number')
    })
  })

  describe('generateScriptureReading', () => {
    test('should generate scripture reading for John 3:16', async () => {
      const result = await generator.generateScriptureReading('John 3:16')

      expect(result.type).toBe('scripture-reading')
      expect(result.reference).toBe('John 3:16')
      expect(result.text).toBeDefined()
      expect(result.intro).toBeDefined()
    })

    test('should include notes when requested', async () => {
      const result = await generator.generateScriptureReading('John 3:16', {
        includeNotes: true,
      })

      expect(result.notes).toBeDefined()
    })

    test('should exclude notes when requested', async () => {
      const result = await generator.generateScriptureReading('John 3:16', {
        includeNotes: false,
      })

      expect(result.notes).toBeNull()
    })
  })

  describe('generatePlanDay', () => {
    test('should generate plan day content', async () => {
      const result = await generator.generatePlanDay('hope', 1, 7)

      expect(result.daily_number).toBe(1)
      expect(result.daily_topic).toBeDefined()
      expect(result.daily_passage).toBeDefined()
      expect(result.daily_reflection).toBeDefined()
    })

    test('should generate correct day number', async () => {
      const result = await generator.generatePlanDay('faith', 5, 7)

      expect(result.daily_number).toBe(5)
    })
  })

  describe('generateRomanRoad', () => {
    test('should generate standard Roman Road', async () => {
      const result = await generator.generateRomanRoad('standard')

      expect(result.title).toBe('Roman Road to Salvation')
      expect(result.verses).toBeDefined()
      expect(result.verses.verse1).toBeDefined()
      expect(result.verses.verse2).toBeDefined()
      expect(result.verses.verse3).toBeDefined()
      expect(result.verses.verse4).toBeDefined()
    })

    test('should generate short Roman Road', async () => {
      const result = await generator.generateRomanRoad('short')

      expect(result.summary).toBeDefined()
    })

    test('should generate extended Roman Road', async () => {
      const result = await generator.generateRomanRoad('extended')

      expect(result.closing).toBeDefined()
    })
  })

  describe('Scripture lookup', () => {
    test('should get John 3:16', () => {
      const scripture = generator.getScripture('John 3:16')

      expect(scripture.reference).toBe('John 3:16')
      expect(scripture.text).toBeDefined()
    })

    test('should return fallback for unknown reference', () => {
      const scripture = generator.getScripture('Unknown 1:1')

      expect(scripture).toBeDefined()
      expect(scripture.reference).toBeDefined()
    })
  })

  describe('Reflection lookup', () => {
    test('should get peace reflection', () => {
      const reflection = generator.getReflection('peace')

      expect(reflection).toBeDefined()
      expect(typeof reflection).toBe('string')
    })

    test('should get default reflection', () => {
      const reflection = generator.getReflection('unknown-theme')

      expect(reflection).toBeDefined()
      expect(typeof reflection).toBe('string')
    })
  })

  describe('Prayer lookup', () => {
    test('should get peace prayer', () => {
      const prayer = generator.getPrayer('peace')

      expect(prayer).toBeDefined()
      expect(typeof prayer).toBe('string')
    })

    test('should get default prayer', () => {
      const prayer = generator.getPrayer('unknown-theme')

      expect(prayer).toBeDefined()
      expect(typeof prayer).toBe('string')
    })
  })
})

describe('VoiceDevotion', () => {
  let vd

  beforeEach(() => {
    process.env.ELEVEN_LABS_API_KEY = 'test-key'
    vd = new VoiceDevotion({
      apiKey: 'test-key',
      outputDir: './test-output',
    })
  })

  describe('Format utilities', () => {
    test('formatDate should return YYYY-MM-DD format', () => {
      const date = new Date('2024-01-15')
      const formatted = vd.formatDate(date)

      expect(formatted).toBe('2024-01-15')
    })

    test('formatDuration should convert seconds to MM:SS', () => {
      expect(vd.formatDuration(0)).toBe('0:00')
      expect(vd.formatDuration(60)).toBe('1:00')
      expect(vd.formatDuration(125)).toBe('2:05')
      expect(vd.formatDuration(305)).toBe('5:05')
    })
  })

  describe('Text formatting', () => {
    test('formatDevotion should structure devotion text', () => {
      const lesson = {
        theme: 'peace',
        scripture: 'Psalm 4:8',
        reflection: 'Test reflection',
        prayer: 'Test prayer',
      }

      const formatted = vd.formatDevotion(lesson)

      expect(formatted).toContain('peace')
      expect(formatted).toContain('Scripture')
      expect(formatted).toContain('Reflection')
      expect(formatted).toContain('Prayer')
    })

    test('formatScripture should structure scripture text', () => {
      const scripture = {
        reference: 'John 3:16',
        intro: 'Let us read',
        text: 'God so loved the world',
        notes: 'These are notes',
      }

      const formatted = vd.formatScripture(scripture)

      expect(formatted).toContain('John 3:16')
      expect(formatted).toContain('Scripture Reading')
      expect(formatted).toContain('Notes')
    })

    test('formatRomanRoad should structure gospel presentation', () => {
      const content = {
        verse1: 'All have sinned',
        verse2: 'Wages of sin is death',
        verse3: 'Gift of God is life',
        verse4: 'Believe and confess',
      }

      const formatted = vd.formatRomanRoad(content, 'standard')

      expect(formatted).toContain('Roman Road')
      expect(formatted).toContain('sinned')
      expect(formatted).toContain('Believe')
    })
  })

  describe('Voice settings', () => {
    test('should load voice settings', () => {
      expect(vd.voiceSettings).toBeDefined()
      expect(vd.voiceSettings.josh).toBeDefined()
      expect(vd.voiceSettings.chris).toBeDefined()
      expect(vd.voiceSettings.bella).toBeDefined()
    })

    test('josh should be devotional voice', () => {
      expect(vd.voiceSettings.josh.tone).toBe('devotional')
      expect(vd.voiceSettings.josh.voice_id).toBeDefined()
    })

    test('chris should be teaching voice', () => {
      expect(vd.voiceSettings.chris.tone).toBe('teaching')
    })

    test('bella should be meditation voice', () => {
      expect(vd.voiceSettings.bella.tone).toBe('meditation')
    })
  })
})

describe('Integration', () => {
  test('should initialize without errors', () => {
    process.env.ELEVEN_LABS_API_KEY = 'test-key'

    expect(() => {
      new VoiceDevotion({
        apiKey: 'test-key',
      })
    }).not.toThrow()
  })

  test('should throw error without API key', () => {
    delete process.env.ELEVEN_LABS_API_KEY

    expect(() => {
      new VoiceDevotion({})
    }).toThrow('ELEVEN_LABS_API_KEY not configured')
  })
})
