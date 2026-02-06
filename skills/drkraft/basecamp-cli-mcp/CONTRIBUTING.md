# Contributing to @drkraft/basecamp-cli

Thanks for your interest in contributing!

## Development Setup

1. Clone the repository:

```bash
git clone https://github.com/drkraft/basecamp-cli
cd basecamp-cli
```

2. Install dependencies:

```bash
bun install
```

3. Build:

```bash
bun run build
```

4. Run tests:

```bash
bun test
```

## Project Structure

```
src/
├── commands/        # CLI command implementations
├── lib/
│   ├── api.ts       # Basecamp API functions
│   ├── auth.ts      # OAuth handling
│   └── config.ts    # Config management
├── mcp/
│   ├── server.ts    # MCP server setup
│   └── tools/       # MCP tool implementations
├── types/           # TypeScript interfaces
└── __tests__/       # Test files
```

## Adding a New Command

1. Create the command file in `src/commands/`:

```typescript
// src/commands/example.ts
import { Command } from 'commander'
import * as api from '../lib/api.js'
import { formatOutput } from '../lib/format.js'

export function createExampleCommand(): Command {
  const cmd = new Command('example').description('Example command group')

  cmd
    .command('list')
    .description('List examples')
    .option('--project <id>', 'Project ID')
    .option('--format <type>', 'Output format', 'table')
    .action(async (options) => {
      const result = await api.listExamples(options.project)
      console.log(formatOutput(result, options.format))
    })

  return cmd
}
```

2. Register in `src/index.ts`:

```typescript
import { createExampleCommand } from './commands/example.js'
program.addCommand(createExampleCommand())
```

3. Add API functions in `src/lib/api.ts`

4. Add types in `src/types/index.ts`

5. Add tests in `src/__tests__/example.test.ts`

## Adding an MCP Tool

Add to `src/mcp/tools/index.ts`:

```typescript
{
  name: 'basecamp_example',
  description: 'Description of what this tool does',
  inputSchema: {
    type: 'object',
    properties: {
      param: {
        type: 'string',
        description: 'Parameter description',
      },
    },
    required: ['param'],
  },
  handler: async (args) => api.example(args.param as string),
},
```

## Testing

- Unit tests use vitest with msw for mocking HTTP
- Run `bun test` before committing
- Manual validation: `bun run scripts/validate.ts`

## Commit Messages

Follow conventional commits:

- `feat(scope): add new feature`
- `fix(scope): fix bug`
- `docs: update documentation`
- `test: add tests`
- `chore: maintenance tasks`

## Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes
4. Run tests: `bun test`
5. Build: `bun run build`
6. Submit a PR

## Questions?

Open an issue on GitHub.
