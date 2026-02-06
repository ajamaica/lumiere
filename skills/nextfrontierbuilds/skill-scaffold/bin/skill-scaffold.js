#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

// Colors for terminal output
const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
}

// Parse arguments
const args = process.argv.slice(2)

// Help text
if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  console.log(`
${c.bold}skill-scaffold${c.reset} - Create AI agent skills instantly

${c.cyan}Usage:${c.reset}
  skill-scaffold <skill-name> [options]

${c.cyan}Options:${c.reset}
  --template <type>    Template type: clawdbot, mcp, generic (default: clawdbot)
  --author <name>      Author name (default: NextFrontierBuilds)
  --description <desc> Skill description
  --dir <path>         Output directory (default: current directory)
  --cli                Include CLI binary scaffold
  --no-scripts         Skip scripts folder
  -h, --help           Show this help

${c.cyan}Templates:${c.reset}
  clawdbot   Full Clawdbot/Moltbot skill with SKILL.md, triggers, examples
  mcp        MCP (Model Context Protocol) server scaffold
  generic    Minimal skill structure

${c.cyan}Examples:${c.reset}
  skill-scaffold weather-alerts
  skill-scaffold my-api --template mcp --description "Custom API integration"
  skill-scaffold cli-tool --cli --dir ~/clawd/skills

${c.dim}Part of the Next Frontier toolkit${c.reset}
`)
  process.exit(0)
}

// Parse flags
const getFlag = (flag) => {
  const idx = args.indexOf(flag)
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null
}
const hasFlag = (flag) => args.includes(flag)

const skillName = args.find(
  (a) => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--'),
)
const template = getFlag('--template') || 'clawdbot'
const author = getFlag('--author') || 'NextFrontierBuilds'
const description = getFlag('--description') || `${skillName} skill for AI agents`
const baseDir = getFlag('--dir') || process.cwd()
const includeCli = hasFlag('--cli')
const includeScripts = !hasFlag('--no-scripts')

// Validate skill name
if (!skillName) {
  console.error(`${c.red}Error:${c.reset} Skill name required`)
  process.exit(1)
}

if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(skillName)) {
  console.error(
    `${c.red}Error:${c.reset} Skill name must be lowercase letters, numbers, and hyphens only`,
  )
  console.error('       Cannot start or end with a hyphen')
  process.exit(1)
}

if (!['clawdbot', 'mcp', 'generic'].includes(template)) {
  console.error(
    `${c.red}Error:${c.reset} Unknown template "${template}". Use: clawdbot, mcp, generic`,
  )
  process.exit(1)
}

const skillDir = path.join(baseDir, skillName)

// Check if exists
if (fs.existsSync(skillDir)) {
  console.error(`${c.red}Error:${c.reset} Directory "${skillName}" already exists`)
  process.exit(1)
}

// Title case helper
const titleCase = (str) =>
  str
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

// Templates
const templates = {
  clawdbot: {
    skillMd: () => `---
name: ${skillName}
description: ${description}
author: ${author}
version: 1.0.0
keywords:
  - ai
  - automation
  - clawdbot
  - moltbot
  - ${skillName.split('-').join('\n  - ')}
---

# ${titleCase(skillName)}

${description}

## Trigger Words

Use this skill when the user mentions:
- "${skillName.replace(/-/g, ' ')}"
- Add more trigger phrases here

## Quick Start

\`\`\`bash
# Example command
${skillName} --help
\`\`\`

## Commands

| Command | Description |
|---------|-------------|
| \`${skillName} --help\` | Show help |
| \`${skillName} list\` | List items |
| \`${skillName} get <id>\` | Get specific item |

## Usage Examples

\`\`\`bash
# Basic usage
${skillName} list

# With options
${skillName} get item-123 --verbose
\`\`\`

## Configuration

No additional configuration required.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Command not found | Ensure skill is installed: \`clawdhub install ${skillName}\` |
| Permission denied | Check file permissions |

## Notes

- Add implementation notes here
- Document any quirks or gotchas
- List dependencies if any
`,
    readme: () => `# ${titleCase(skillName)}

> ${description}

[![npm version](https://img.shields.io/npm/v/${skillName}.svg)](https://www.npmjs.com/package/${skillName})
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

\`\`\`bash
# Via ClawdHub
clawdhub install ${skillName}

# Via npm
npm install -g ${skillName}

# Or copy to skills directory
cp -r ${skillName} ~/clawd/skills/
\`\`\`

## Usage

See [SKILL.md](./SKILL.md) for detailed usage instructions.

## Features

- ✅ Feature 1
- ✅ Feature 2
- ✅ Feature 3

## Keywords

AI, automation, Clawdbot, Moltbot, Claude, Cursor, vibe coding, agent, ${skillName.split('-').join(', ')}

## Author

${author}

## License

MIT
`,
  },

  mcp: {
    skillMd: () => `---
name: ${skillName}
description: ${description}
author: ${author}
version: 1.0.0
type: mcp
keywords:
  - mcp
  - model-context-protocol
  - ai
  - ${skillName.split('-').join('\n  - ')}
---

# ${titleCase(skillName)} MCP Server

${description}

## Installation

\`\`\`bash
npm install -g ${skillName}
\`\`\`

## MCP Configuration

Add to your MCP settings (Claude Desktop, Cursor, etc.):

\`\`\`json
{
  "mcpServers": {
    "${skillName}": {
      "command": "npx",
      "args": ["${skillName}"]
    }
  }
}
\`\`\`

## Available Tools

| Tool | Description |
|------|-------------|
| \`${skillName}_list\` | List items |
| \`${skillName}_get\` | Get specific item |
| \`${skillName}_create\` | Create new item |

## Resources

This server provides the following resources:

- \`${skillName}://items\` - List of all items
- \`${skillName}://item/{id}\` - Specific item by ID

## Development

\`\`\`bash
# Run in development
npm run dev

# Test
npm test
\`\`\`
`,
    readme: () => `# ${titleCase(skillName)}

> ${description}

MCP (Model Context Protocol) server for AI assistants.

## Installation

\`\`\`bash
npm install -g ${skillName}
\`\`\`

## Configuration

Add to your Claude Desktop or Cursor MCP config:

\`\`\`json
{
  "mcpServers": {
    "${skillName}": {
      "command": "npx",
      "args": ["${skillName}"]
    }
  }
}
\`\`\`

## Keywords

MCP, Model Context Protocol, AI, Claude, Cursor, agent, ${skillName.split('-').join(', ')}

## License

MIT
`,
  },

  generic: {
    skillMd: () => `---
name: ${skillName}
description: ${description}
author: ${author}
version: 1.0.0
---

# ${titleCase(skillName)}

${description}

## Usage

Document usage here.

## Notes

Add notes here.
`,
    readme: () => `# ${titleCase(skillName)}

${description}

## License

MIT
`,
  },
}

// CLI template
const cliTemplate = `#!/usr/bin/env node

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  console.log(\`
${skillName} - ${description}

Usage:
  ${skillName} <command> [options]

Commands:
  list        List items
  get <id>    Get specific item
  --help      Show this help

Examples:
  ${skillName} list
  ${skillName} get item-123
\`);
  process.exit(0);
}

const command = args[0];

switch (command) {
  case 'list':
    console.log('Listing items...');
    // TODO: Implement
    break;
  case 'get':
    const id = args[1];
    if (!id) {
      console.error('Error: ID required');
      process.exit(1);
    }
    console.log(\`Getting item: \${id}\`);
    // TODO: Implement
    break;
  default:
    console.error(\`Unknown command: \${command}\`);
    console.error('Run with --help for usage');
    process.exit(1);
}
`

// Create structure
try {
  const t = templates[template]

  fs.mkdirSync(skillDir, { recursive: true })
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), t.skillMd())
  fs.writeFileSync(path.join(skillDir, 'README.md'), t.readme())

  if (includeScripts) {
    fs.mkdirSync(path.join(skillDir, 'scripts'))
    fs.writeFileSync(path.join(skillDir, 'scripts', '.gitkeep'), '')
  }

  if (includeCli) {
    fs.mkdirSync(path.join(skillDir, 'bin'))
    const cliPath = path.join(skillDir, 'bin', `${skillName}.js`)
    fs.writeFileSync(cliPath, cliTemplate)
    fs.chmodSync(cliPath, '755')
  }

  console.log(`
${c.green}✅ Created skill:${c.reset} ${c.bold}${skillName}${c.reset} ${c.dim}(${template} template)${c.reset}

${c.cyan}📁 Structure:${c.reset}
   ${skillDir}/
   ├── SKILL.md      ${c.dim}(main documentation)${c.reset}
   ├── README.md     ${c.dim}(GitHub/npm readme)${c.reset}${
     includeScripts
       ? `
   └── scripts/      ${c.dim}(helper scripts)${c.reset}`
       : ''
   }${
     includeCli
       ? `
   └── bin/          ${c.dim}(CLI binary)${c.reset}`
       : ''
   }

${c.cyan}📝 Next steps:${c.reset}
   1. ${c.yellow}cd ${skillDir}${c.reset}
   2. Edit SKILL.md with your documentation
   3. ${includeCli ? 'Implement bin/' + skillName + '.js' : 'Add helper scripts if needed'}
   4. Test locally
   5. ${c.yellow}clawdhub publish .${c.reset}
`)
} catch (err) {
  console.error(`${c.red}Error creating skill:${c.reset}`, err.message)
  process.exit(1)
}
