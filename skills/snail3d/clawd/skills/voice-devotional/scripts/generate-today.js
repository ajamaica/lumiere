const VoiceDevotion = require('./voice-devotional')
const fs = require('fs')

const vd = new VoiceDevotion({
  apiKey: process.env.ELEVEN_LABS_API_KEY,
  outputDir: './output',
})

// Create custom devotional for today's news context
const customLesson = {
  type: 'daily-devotional',
  theme: 'trust',
  scripture_reference: 'Psalm 46:1-3, 10',
  scripture:
    'God is our refuge and strength, an ever-present help in trouble. Therefore we will not fear, though the earth give way and the mountains fall into the heart of the sea. He says, Be still, and know that I am God.',
  reflection: `The news cycles fast. Government shutdowns end and begin. Leaders rise and fall. Economies fluctuate. And it is easy to let anxiety take root, to believe that our stability depends on the right person in office or the right policy passing.

But Psalm 46 was not written during easy times. It was written for people who watched kingdoms crumble, who felt the ground shake beneath their feet. And the psalmist's response was not to panic. It was to remember.

God is our refuge. Not our government. Not our economy. Not our preferred leader. Our refuge. Our strength. Ever-present.

When the mountains shake, and they will, the Lord of hosts is with us. The God of Jacob is our fortress.

This does not mean we disengage from the world. It means we engage from a place of security, not fear. We vote, we speak, we act, but we do not tremble.

The nations rage, but God lifts His voice, and the earth melts. He is sovereign. He is good. He is in control, even when it does not look like it.

Be still. Know that He is God. He will be exalted among the nations. He will be exalted in the earth.

Your anxiety does not help the situation. Your trust in God does.`,
  prayer:
    'Father, the news is loud and the world feels unstable. But You are the same yesterday, today, and forever. You are not surprised by elections, by policies, by shutdowns, or by shake-ups. You are on Your throne. Help me to be still and know that You are God. I release my anxiety to You. I choose trust over fear. Exalt Yourself in this nation and in my heart. In Jesus name, Amen.',
  references: ['Psalm 46:1-3, 10', 'Hebrews 13:8'],
  estimatedDuration: 300,
}

// Generate audio from custom lesson
const text = vd.formatDevotion(customLesson)

console.log('Generating tailored devotional...')
console.log('Theme: Trust in God despite political uncertainty')

vd.generateAudio(text, 'josh', {
  filename: 'devotional-trust-today.mp3',
})
  .then((audioPath) => {
    const dest = fs.realpathSync(process.env.HOME + '/Desktop/Devotional-Trust-Today.mp3')
    fs.copyFileSync(audioPath, dest)
    console.log('✅ Saved to Desktop')

    // Play in QuickTime
    const { exec } = require('child_process')
    exec('open -a "QuickTime Player" "' + dest + '"')
    console.log('▶️  Playing in QuickTime...')
    console.log('🙏 Psalm 46: Be still, and know that I am God')

    // Auto-delete after 6 minutes
    setTimeout(() => {
      if (fs.existsSync(dest)) {
        fs.unlinkSync(dest)
        console.log('🗑️  Cleaned up')
      }
    }, 360000)
  })
  .catch((err) => {
    console.error('❌', err.message)
    process.exit(1)
  })
