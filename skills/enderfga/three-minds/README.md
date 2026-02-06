# Three Minds 🧠🧠🧠

**三个臭皮匠顶个诸葛亮** - A Multi-Agent Collaboration System

Three AI agents with different personas working together on the same codebase. Not just talking—they actually read files, write code, and run tests.

## Features

- 🔧 **Real Execution** - Each agent can read files, write code, run tests via Claude Code CLI
- 👥 **Multi-Perspective** - Three agents with different expertise review each other's work
- ✅ **Consensus Voting** - All must vote YES to finish, ensuring quality
- 📁 **Shared Workspace** - Collaborate on the same project directory
- 📝 **Full Transcript** - Auto-saves discussion and changes history

## Installation

```bash
# Clone
git clone https://github.com/Enderfga/three-minds.git
cd three-minds

# Install dependencies
npm install

# Build
npm run build

# Link globally (optional)
npm link
```

## Requirements

- Node.js 18+
- **Claude Code CLI** (`claude` command must be available)

## Usage

```bash
# Basic usage
three-minds "Review and improve this project's code quality" --dir ./my-project

# Use code-review preset (security + performance + quality trio)
three-minds "Review all code in src/" --config code-review --dir ./project

# Specify max rounds
three-minds "Refactor this module" --dir ./module --max-rounds 5

# Save result to JSON
three-minds "task description" --dir ./project --output result.json
```

## Preset Configurations

### Default - Code Collaboration Trio

- 🏗️ **Architect** - Code structure, design patterns, scalability
- ⚙️ **Engineer** - Code quality, error handling, performance
- 🔍 **Reviewer** - Code standards, potential bugs, documentation

### code-review - Code Review Trio

- 🛡️ **Security Expert** - Vulnerabilities, injection risks, permissions
- ⚡ **Performance Engineer** - Algorithm complexity, memory, query optimization
- ✅ **Quality Reviewer** - Readability, naming conventions, test coverage

### idea-brainstorm - Research Brainstorm Trio

- 📚 **Literature Expert** - Related work, theoretical foundation
- 💡 **Creative Thinker** - Novel approaches, unconventional ideas
- 🔬 **Feasibility Analyst** - Technical constraints, implementation path

### paper-writing - Paper Writing Trio

- 📝 **Content Reviewer** - Argument structure, logical flow
- ✍️ **Language Editor** - Grammar, clarity, academic tone
- 🎨 **Presentation Advisor** - Figures, tables, visual organization

## Custom Configuration

Create a JSON config file:

```json
{
  "name": "My Custom Trio",
  "agents": [
    {
      "name": "Expert A",
      "emoji": "🎯",
      "persona": "You are a... focusing on..."
    },
    {
      "name": "Expert B",
      "emoji": "🔬",
      "persona": "You are a... specializing in..."
    },
    {
      "name": "Expert C",
      "emoji": "📊",
      "persona": "You are a... responsible for..."
    }
  ],
  "maxRounds": 10,
  "projectDir": "."
}
```

Then: `three-minds "task" --config ./my-config.json`

## Workflow

```
┌──────────────────────────────────────────┐
│              Round N                      │
├──────────────────────────────────────────┤
│  🏗️ Architect                            │
│  → Read files, review structure          │
│  → Execute necessary refactoring         │
│  → Vote [CONSENSUS: YES/NO]              │
├──────────────────────────────────────────┤
│  ⚙️ Engineer                             │
│  → Review architect's changes            │
│  → Add implementation details, fix bugs  │
│  → Vote [CONSENSUS: YES/NO]              │
├──────────────────────────────────────────┤
│  🔍 Reviewer                             │
│  → Review all changes                    │
│  → Check standards, bugs, docs           │
│  → Vote [CONSENSUS: YES/NO]              │
└──────────────────────────────────────────┘
          ↓
    All YES? → Done
          ↓ NO
    Continue to next round...
```

## Output

1. **Terminal Output** - Real-time progress and votes from each agent
2. **Markdown Transcript** - Auto-saved to `three-minds-{timestamp}.md` in working directory
3. **JSON Result** - Use `--output` to save complete session data

## Use Cases

- **Code Review** - Multi-angle review of PRs or code changes
- **Refactoring** - Collaborative complex code refactoring
- **Feature Development** - From design to implementation
- **Bug Fixing** - Locate issues and verify fixes
- **Documentation** - Improve and complete project docs
- **Research Brainstorming** - Evaluate research ideas from multiple angles
- **Paper Writing** - Review and improve academic papers

## Notes

- Each agent will actually modify files—recommend using on a git branch
- Default max 15 rounds, adjustable via `--max-rounds`
- If consensus can't be reached, check if task description is clear

## License

MIT
