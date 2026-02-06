const VoiceDevotion = require('./voice-devotional')
const fs = require('fs')

const vd = new VoiceDevotion({
  apiKey: process.env.ELEVEN_LABS_API_KEY,
  outputDir: './output',
})

// Full-length custom devotional
const fullText = `Good morning. Today's devotional focuses on trust.

Scripture:
God is our refuge and strength, an ever-present help in trouble. Therefore we will not fear, though the earth give way and the mountains fall into the heart of the sea, though its waters roar and foam and the mountains quake with their surging. He says, Be still, and know that I am God. I will be exalted among the nations, I will be exalted in the earth. The Lord Almighty is with us; the God of Jacob is our fortress. Psalm 46, verses 1 through 3 and verse 10.

Reflection:
The news cycles fast. Government shutdowns end and begin. Leaders rise and fall. Economies fluctuate. And it is easy to let anxiety take root, to believe that the stability of our world depends on the right person in the right office, the right policy passing, the right outcome in the next election.

But Psalm 46 was not written during easy times. It was written for people who watched kingdoms crumble, who felt the ground shake beneath their feet, who saw the waters rise and threaten to overwhelm them. And the psalmist's response was not to panic. It was to remember.

God is our refuge. Not our government. Not our economy. Not our preferred leader. Our refuge. Our strength. Ever-present. When the mountains shake, and they will, the Lord of hosts is with us. The God of Jacob is our fortress.

This does not mean we disengage from the world. It means we engage from a place of security, not fear. We vote, we speak, we act, but we do not tremble. The nations rage, but God lifts His voice, and the earth melts. He is sovereign. He is good. He is in control, even when it does not look like it.

Be still. Know that He is God. He will be exalted among the nations. He will be exalted in the earth. Your anxiety does not help the situation. Your trust in God does.

Prayer:
Father, the news is loud and the world feels unstable. But You are the same yesterday, today, and forever. You are not surprised by elections, by policies, by shutdowns, or by shake-ups. You are on Your throne. Help me to be still and know that You are God. I release my anxiety to You. I choose trust over fear. Exalt Yourself in this nation and in my heart. In Jesus name, Amen.`

console.log('Generating full-length devotional...')
console.log('Text length:', fullText.length, 'characters')

vd.generateAudio(fullText, 'josh', {
  filename: 'devotional-trust-full.mp3',
})
  .then((audioPath) => {
    const dest = fs.realpathSync(process.env.HOME + '/Desktop/Devotional-Trust-Full.mp3')
    fs.copyFileSync(audioPath, dest)

    // Get duration
    const stats = fs.statSync(audioPath)
    const estimatedDuration = Math.round(stats.size / 3750) // Rough estimate

    console.log('✅ Saved to Desktop')
    console.log('Estimated duration:', Math.round(estimatedDuration / 60), 'minutes')

    // Play in QuickTime
    const { exec } = require('child_process')
    exec('open -a "QuickTime Player" "' + dest + '"')
    console.log('▶️  Playing in QuickTime...')

    // Auto-delete after 7 minutes
    setTimeout(() => {
      if (fs.existsSync(dest)) {
        fs.unlinkSync(dest)
        console.log('🗑️  Cleaned up')
      }
    }, 420000)
  })
  .catch((err) => {
    console.error('❌', err.message)
  })
