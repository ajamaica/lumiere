#!/usr/bin/env node
/**
 * 🛠️ Skill Maker - Interactive Skill Generator
 *
 * Usage: node trigger.js
 *
 * Walks you through creating a Clawdbot skill from scratch,
 * generates all files, and packages it for publishing.
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

const question = (q) => new Promise((resolve) => rl.question(q, resolve))

// ASCII Art Header
console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   🛠️  SKILL MAKER - Create Clawdbot Skills      ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
`)

async function main() {
  console.log('Answer a few questions to generate your skill...\n')

  // Collect info
  const name = await question('Skill name (lowercase, no spaces): ')
  const description = await question('What does this skill do? ')
  const hasCommands = (await question('Does it have CLI commands? (y/n): ')).toLowerCase() === 'y'

  let commands = []
  if (hasCommands) {
    console.log('\nEnter commands (empty line to finish):')
    while (true) {
      const cmd = await question('  Command name: ')
      if (!cmd) break
      const script = await question('  Script to run: ')
      commands.push({ name: cmd, script })
    }
  }

  const hasScripts =
    (await question('\nDoes it need a scripts/ folder? (y/n): ')).toLowerCase() === 'y'
  const hasReferences =
    (await question('Does it need a references/ folder? (y/n): ')).toLowerCase() === 'y'
  const bmcLink =
    (await question('\nBuy Me a Coffee link: ')) || 'https://www.buymeacoffee.com/snail3d'

  // Generate skill
  const skillDir = path.join(process.env.HOME, 'clawd/skills', name)

  if (fs.existsSync(skillDir)) {
    const overwrite = await question(`\n⚠️  Skill "${name}" exists. Overwrite? (y/n): `)
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Aborted.')
      rl.close()
      return
    }
    fs.rmSync(skillDir, { recursive: true })
  }

  fs.mkdirSync(skillDir, { recursive: true })

  // Generate SKILL.md
  let commandsYaml = ''
  if (commands.length > 0) {
    commandsYaml = '\ncommands:\n' + commands.map((c) => `  ${c.name}: ${c.script}`).join('\n')
  }

  const skillMd = `---
name: ${name}
description: ${description}${commandsYaml}
---

# ${name.charAt(0).toUpperCase() + name.slice(1)}

${description}

## Usage

${commands.map((c) => `- **${c.name}**: \`${c.script}\``).join('\n') || 'Tell Clawd to run this skill.'}

## How to Run

\`\`\`bash
# Run the skill
${commands[0]?.script || 'node trigger.js'}
\`\`\`

## Features

- Feature 1
- Feature 2

## Notes

- No external dependencies (or list them)
- Fast and lightweight

---

Built with 💜 by Clawd | ☕ ${bmcLink}
`

  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillMd)

  // Generate README.md
  const readmeMd = `# ${name.charAt(0).toUpperCase() + name.slice(1)}

${description}

## Installation

\`\`\`bash
# Download and place in your skills directory
git clone https://github.com/YOUR_USERNAME/${name}.git ~/clawd/skills/${name}
\`\`\`

## Usage

${commands.map((c) => `- \`${c.script}\` - ${c.name}`).join('\n') || 'Tell Clawd to run this skill.'}

## How It Works

Brief explanation of what this skill does.

## Development

\`\`\`bash
cd ~/clawd/skills/${name}
# Edit files, test, etc.
\`\`\`

## Support

If you find this useful, consider supporting:

**[☕ Buy Me a Coffee](${bmcLink})**

## License

MIT — Use it, modify it, make it yours.

---

Built with 🛠️ Skill Maker by Clawd
`

  fs.writeFileSync(path.join(skillDir, 'README.md'), readmeMd)

  // Create folders
  if (hasScripts) {
    fs.mkdirSync(path.join(skillDir, 'scripts'), { recursive: true })
    // Create stub script
    fs.writeFileSync(
      path.join(skillDir, 'scripts', 'main.py'),
      `#!/usr/bin/env python3
"""
${name} - Main script
Add your implementation here.
"""

import sys

def main():
    print("🛠️ ${name} is running!")
    print("Add your implementation here.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
`,
    )
  }

  if (hasReferences) {
    fs.mkdirSync(path.join(skillDir, 'references'), { recursive: true })
  }

  // Create .gitattributes for zips
  fs.writeFileSync(path.join(skillDir, '.gitattributes'), '*.zip binary\n*.zip diff=false\n')

  // Create trigger.js if commands exist
  if (commands.length > 0) {
    const mainCmd = commands[0]
    fs.writeFileSync(
      path.join(skillDir, 'trigger.js'),
      `#!/usr/bin/env node
/**
 * ${name} - Skill Trigger
 * Runs: ${mainCmd.script}
 */

const { execSync } = require('child_process');

console.log('🛠️ Running ${name}...');

try {
    execSync('${mainCmd.script}', { stdio: 'inherit', cwd: __dirname });
} catch (e) {
    console.error('Failed to run ${name}');
    process.exit(1);
}
`,
    )
  }

  // Create zip
  const zipPath = path.join(skillDir, `${name}-publish.zip`)
  try {
    execSync(
      `cd ${path.dirname(skillDir)} && zip -r ${name}/${name}-publish.zip ${name}/ -x "*.git*"`,
      { stdio: 'ignore' },
    )
  } catch (e) {
    console.log('⚠️  Could not create zip automatically. Install zip or create manually.')
  }

  // Summary
  console.log(`
╔═══════════════════════════════════════════════════╗
║   ✅ Skill "${name}" Created!                     ║
╚═══════════════════════════════════════════════════╝

Location: ${skillDir}

Files created:
  ✓ SKILL.md${hasScripts ? '\n  ✓ scripts/' : ''}${hasReferences ? '\n  ✓ references/' : ''}
  ✓ README.md
  ✓ .gitattributes
${commands.length > 0 ? '  ✓ trigger.js' : ''}
${fs.existsSync(zipPath) ? `  ✓ ${name}-publish.zip` : ''}

Next steps:
  1. Review/edit files in ${skillDir}
  2. Create GitHub repo: https://github.com/new
  3. Push to GitHub
  4. Download zip or use ${name}-publish.zip
  5. Upload to Skill Hub: https://clawdhub.com

☕ Support: ${bmcLink}
`)

  // Copy to Desktop
  const desktopPath = path.join(process.env.HOME, 'Desktop', `${name}-publish.zip`)
  if (fs.existsSync(zipPath)) {
    fs.copyFileSync(zipPath, desktopPath)
    console.log(`📋 Also copied to Desktop: ${desktopPath}`)
  }

  rl.close()
}

main().catch((err) => {
  console.error('Error:', err)
  rl.close()
  process.exit(1)
})
