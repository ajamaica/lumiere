#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Check if we're in the right directory
const workspaceDir = process.cwd()
const gutcheckDir = path.join(workspaceDir, 'GutCheck')
const skillDir = path.join(workspaceDir, 'gutcheck-skill')

console.log('Preparing to publish GutCheck skill to ClawHub...')

// Verify GutCheck project exists
if (!fs.existsSync(gutcheckDir)) {
  console.error(`Error: GutCheck project not found at ${gutcheckDir}`)
  process.exit(1)
}

// Verify skill definition exists
if (!fs.existsSync(skillDir)) {
  console.error(`Error: gutcheck-skill directory not found at ${skillDir}`)
  process.exit(1)
}

// Check if clawhub CLI is available
try {
  execSync('npx clawhub --version', { stdio: 'pipe' })
  console.log('✓ ClawHub CLI is available')
} catch (error) {
  console.error('Error: clawhub CLI is not installed')
  console.error('Please run: npm install -g clawhub')
  process.exit(1)
}

// Create a temporary directory for the skill package
const tempDir = path.join(workspaceDir, 'temp-gutcheck-skill')
if (fs.existsSync(tempDir)) {
  fs.rmSync(tempDir, { recursive: true, force: true })
}

fs.mkdirSync(tempDir, { recursive: true })

// Copy the skill definition
fs.copyFileSync(path.join(skillDir, 'SKILL.md'), path.join(tempDir, 'SKILL.md'))

// Create package.json for the skill
const packageJson = {
  name: 'gutcheck',
  version: '1.0.0',
  description:
    'GutCheck - A digestive health tracking application with personalized insights and data-driven recommendations',
  keywords: ['health', 'nutrition', 'digestive', 'tracking', 'wellness'],
  author: 'OpenClaw Assistant',
  license: 'MIT',
  openclaw: {
    skill: true,
  },
}

fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2))

// Create README for the skill
const readmeContent = `# GutCheck Skill

GutCheck empowers individuals to understand and optimize their digestive health through personalized insights and data-driven recommendations. Unlike generic health apps, GutCheck focuses specifically on digestive health with scientifically-backed insights that help users identify food sensitivities and improve gut wellness.

## Features
- User authentication system with secure registration and login
- Personalized meal tracking with digestive impact assessment
- Food sensitivity identification through data analysis
- Gut health metrics and progress tracking
- Scientifically-backed dietary recommendations

## Installation

\`\`\`bash
clawhub install gutcheck
\`\`\`

For detailed usage instructions, please refer to the SKILL.md file.
`

fs.writeFileSync(path.join(tempDir, 'README.md'), readmeContent)

console.log('✓ Created temporary skill package')

// Publish the skill
try {
  const result = execSync(
    `npx clawhub publish ${tempDir} --slug gutcheck --name "GutCheck Digestive Health Tracker" --version 1.0.0 --changelog "Initial release of GutCheck skill"`,
    { stdio: 'inherit' },
  )
  console.log('✓ GutCheck skill published successfully!')
} catch (error) {
  console.error('Error publishing skill:', error.message)
  process.exit(1)
}

// Clean up
fs.rmSync(tempDir, { recursive: true, force: true })
console.log('✓ Cleaned up temporary files')
