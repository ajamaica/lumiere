# TypeScript + BAML Reference

TypeScript-specific patterns for BAML with generated interfaces and type-safe LLM extraction.

## Installation

```bash
# Install the package
npm install @boundaryml/baml    # or: pnpm add / yarn add / bun add

# Initialize BAML in your project
npx baml-cli init

# Generate the client (REQUIRED after any .baml file changes)
npx baml-cli generate
```

**CRITICAL**: You MUST run `npx baml-cli generate` every time you modify any `.baml` file.

Add to your build process:

```json
// package.json
{
  "scripts": {
    "build": "npx baml-cli generate && tsc --build"
  }
}
```

## Generator Configuration

The `generator` block in `baml_src/generators.baml` configures TypeScript code generation:

```baml
// Standard CommonJS
generator target {
  output_type "typescript"
  output_dir "../"
  version "0.76.2"
  module_format "cjs"  // CommonJS (default)
}

// ES Modules
generator target_esm {
  output_type "typescript"
  output_dir "../"
  version "0.76.2"
  module_format "esm"  // ES modules
}

// React/Next.js integration
generator target_react {
  output_type "typescript/react"  // Auto-generates React hooks
  output_dir "../"
  version "0.76.2"
}
```

### Generator Options

| Option          | Description                               | Values                                   |
| --------------- | ----------------------------------------- | ---------------------------------------- |
| `output_type`   | Target language/framework                 | `"typescript"`, `"typescript/react"`     |
| `output_dir`    | Output directory (relative to baml_src/)  | Any path                                 |
| `version`       | Runtime version (match installed package) | e.g., `"0.76.2"`                         |
| `module_format` | Module system (TypeScript only)           | `"cjs"` (CommonJS), `"esm"` (ES modules) |
| `on_generate`   | Shell command to run after generation     | e.g., `"prettier --write ."`             |

## Project Structure

```
my-project/
├── baml_src/
│   ├── generators.baml    # Generator configuration
│   ├── clients.baml       # LLM client definitions
│   ├── types.baml         # Classes and enums
│   ├── functions.baml     # BAML functions
│   └── tests.baml         # Test cases
├── baml_client/           # Generated - don't edit
│   ├── index.ts
│   ├── types.ts           # TypeScript interfaces
│   └── client.ts
├── package.json
├── tsconfig.json
└── .env
```

## Basic Usage

### Import Pattern

```typescript
import { b } from './baml_client'
import type { Person, Invoice, LineItem } from './baml_client/types'
```

### Async Usage (Default)

TypeScript BAML functions are **async by default** and return Promises:

```typescript
// Simple extraction
const person: Person = await b.ExtractPerson(text)
console.log(person.name) // Type-safe

// With error handling
try {
  const invoice = await b.ExtractInvoice(doc)
  console.log(invoice.total)
} catch (e) {
  if (e instanceof BamlValidationError) {
    console.error('Validation failed:', e.message)
  }
}
```

### Streaming

Use `for await` to iterate over streaming responses:

```typescript
// Async iteration
const stream = b.stream.ExtractData(largeDoc)
for await (const partial of stream) {
  console.log(`Progress: ${partial.items?.length ?? 0} items`)
  updateUI(partial) // Update UI with partial results
}

// Get final validated result
const final = await stream.getFinalResponse()
```

## Type Safety

### Generated Interfaces

BAML generates TypeScript interfaces from your classes:

```baml
// baml_src/types.baml
class Person {
  name string
  email string
  age int?
}
```

```typescript
// baml_client/types.ts (generated)
interface Person {
  name: string
  email: string
  age?: number // Optional fields use `?`
}

// Full IntelliSense in IDE
const person = await b.ExtractPerson(text)
person.name // string
person.age // number | undefined
```

### Union Type Handling

BAML union types generate discriminated unions in TypeScript:

```typescript
import type { GetWeather, SearchWeb, Calculator } from './baml_client/types'

const result = await b.SelectTool(query)

// Type guards
function isGetWeather(r: typeof result): r is GetWeather {
  return 'location' in r && 'units' in r
}

if (isGetWeather(result)) {
  return fetchWeather(result.location, result.units)
}
```

## Image Handling

BAML provides an `Image` class for multimodal inputs:

```typescript
import { Image } from '@boundaryml/baml'

// From URL
const result = await b.AnalyzeImage(Image.fromUrl('https://example.com/image.png'))

// From base64
const result = await b.AnalyzeImage(Image.fromBase64('image/jpeg', base64String))

// From file (Node.js)
import { readFileSync } from 'fs'
const buffer = readFileSync('image.jpg')
const result = await b.AnalyzeImage(Image.fromBase64('image/jpeg', buffer.toString('base64')))
```

## TypeBuilder (Dynamic Types at Runtime)

`TypeBuilder` allows modifying output schemas at runtime:

```typescript
import { TypeBuilder } from './baml_client/type_builder'
import { b } from './baml_client'

const tb = new TypeBuilder()

// Add enum values
tb.Category.addValue('GREEN')
tb.Category.addValue('YELLOW')

// Add class properties
tb.User.addProperty('email', tb.string())
tb.User.addProperty('address', tb.string().optional())

// Pass TypeBuilder when calling function
const result = await b.Categorize('The sun is bright', { tb })
```

### Create New Types at Runtime

```typescript
const tb = new TypeBuilder()

// Create a new enum
const hobbies = tb.addEnum('Hobbies')
hobbies.addValue('Soccer')
hobbies.addValue('Reading')

// Create a new class
const address = tb.addClass('Address')
address.addProperty('street', tb.string())
address.addProperty('city', tb.string())

// Attach to existing type
tb.User.addProperty('hobbies', hobbies.type().list())
tb.User.addProperty('address', address.type())
```

### TypeBuilder Methods

| Method                     | Description           |
| -------------------------- | --------------------- |
| `tb.string()`              | String type           |
| `tb.int()`                 | Integer type          |
| `tb.float()`               | Float type            |
| `tb.bool()`                | Boolean type          |
| `tb.string().list()`       | List of strings       |
| `tb.string().optional()`   | Optional string       |
| `tb.addClass("Name")`      | Create new class      |
| `tb.addEnum("Name")`       | Create new enum       |
| `.addProperty(name, type)` | Add property to class |
| `.addValue(name)`          | Add value to enum     |
| `.description("...")`      | Add description       |

## ClientRegistry (Dynamic Client Selection)

`ClientRegistry` allows modifying LLM clients at runtime:

```typescript
import { ClientRegistry } from '@boundaryml/baml'
import { b } from './baml_client'

const cr = new ClientRegistry()

// Add a new client
cr.addLlmClient('MyClient', 'openai', {
  model: 'gpt-4o',
  temperature: 0.7,
  api_key: process.env.OPENAI_API_KEY,
})

// Set as the primary client
cr.setPrimary('MyClient')

// Use the registry
const result = await b.ExtractResume('...', { clientRegistry: cr })
```

### ClientRegistry Methods

| Method                                  | Description             |
| --------------------------------------- | ----------------------- |
| `addLlmClient(name, provider, options)` | Add a new LLM client    |
| `setPrimary(name)`                      | Set which client to use |

## React / Next.js Integration

BAML provides first-class React/Next.js integration with auto-generated hooks. **Requires Next.js 15+**.

### Installation

```bash
# Install packages
npm install @boundaryml/baml @boundaryml/baml-nextjs-plugin

# Initialize BAML
npx baml-cli init
```

### Configure Next.js

```typescript
// next.config.ts
import { withBaml } from '@boundaryml/baml-nextjs-plugin'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // ... existing config
}

export default withBaml()(nextConfig)
```

### Configure Generator for React

```baml
// baml_src/generators.baml
generator typescript {
  output_type "typescript/react"  // Enable React hooks generation
  output_dir "../"
  version "0.76.2"
}
```

Then run `npx baml-cli generate`.

### Auto-Generated Hooks

For each BAML function, a React hook is auto-generated with the pattern `use{FunctionName}`:

```baml
// baml_src/story.baml
class Story {
  title string
  content string
}

function WriteMeAStory(input: string) -> Story {
  client "openai/gpt-4o"
  prompt #"
    Tell me a story about {{ input }}
    {{ ctx.output_format }}
  "#
}
```

```tsx
// app/components/story-form.tsx
'use client'

import { useWriteMeAStory } from '@/baml_client/react/hooks'

export function StoryForm() {
  const story = useWriteMeAStory()

  return (
    <div>
      <button onClick={() => story.mutate('a brave robot')} disabled={story.isLoading}>
        {story.isLoading ? 'Generating...' : 'Generate Story'}
      </button>

      {story.data && (
        <div>
          <h4>{story.data.title}</h4>
          <p>{story.data.content}</p>
        </div>
      )}

      {story.error && <div>Error: {story.error.message}</div>}
    </div>
  )
}
```

### Hook Options

```tsx
// Streaming (default)
const hook = useWriteMeAStory()

// Non-streaming
const hook = useWriteMeAStory({ stream: false })

// With callbacks
const hook = useWriteMeAStory({
  onStreamData: (partial) => console.log('Streaming:', partial),
  onFinalData: (final) => console.log('Complete:', final),
  onError: (error) => console.error('Error:', error),
})
```

### Hook Return Values

| Property       | Type              | Description                       |
| -------------- | ----------------- | --------------------------------- |
| `data`         | `T \| Partial<T>` | Current data (streaming or final) |
| `streamData`   | `Partial<T>`      | Latest streaming update           |
| `finalData`    | `T`               | Final complete response           |
| `isLoading`    | `boolean`         | Request in progress               |
| `isPending`    | `boolean`         | Waiting to start                  |
| `isStreaming`  | `boolean`         | Currently streaming               |
| `isSuccess`    | `boolean`         | Completed successfully            |
| `isError`      | `boolean`         | Failed                            |
| `error`        | `Error`           | Error details                     |
| `mutate(args)` | `function`        | Execute the BAML function         |
| `reset()`      | `function`        | Reset hook state                  |

### Chatbot Example

```baml
// baml_src/chat.baml
class Message {
  role "user" | "assistant"
  content string
}

function Chat(messages: Message[]) -> string {
  client "openai/gpt-4o"
  prompt #"
    You are a helpful assistant.

    {% for m in messages %}
      {{ _.role(m.role) }}
      {{ m.content }}
    {% endfor %}
  "#
}
```

```tsx
'use client'

import { useChat } from '@/baml_client/react/hooks'
import { useState, useEffect } from 'react'
import type { Message } from '@/baml_client/types'

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const chat = useChat()

  // Add assistant response to history when complete
  useEffect(() => {
    if (chat.isSuccess && chat.finalData) {
      setMessages((prev) => [...prev, { role: 'assistant', content: chat.finalData! }])
    }
  }, [chat.isSuccess, chat.finalData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || chat.isLoading) return

    const newMessages = [...messages, { role: 'user' as const, content: input }]
    setMessages(newMessages)
    setInput('')
    await chat.mutate(newMessages)
  }

  return (
    <div>
      {messages.map((m, i) => (
        <div key={i}>
          <strong>{m.role}:</strong> {m.content}
        </div>
      ))}
      {chat.isLoading && (
        <div>
          <strong>assistant:</strong> {chat.data ?? '...'}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <input value={input} onChange={(e) => setInput(e.target.value)} />
        <button type="submit" disabled={chat.isLoading}>
          Send
        </button>
      </form>
    </div>
  )
}
```

### Server Component (API Route)

```typescript
// app/api/extract/route.ts
import { b } from '@/baml_client'

export async function POST(req: Request) {
  const { text } = await req.json()
  const result = await b.ExtractPerson(text)
  return Response.json(result)
}
```

## Environment Variables

```bash
# .env file
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

```typescript
// Use dotenv for Node.js
import 'dotenv/config'
import { b } from './baml_client'

// In BAML files, reference with env.VAR_NAME
```

```baml
client<llm> MyClient {
  provider openai
  options {
    api_key env.OPENAI_API_KEY
  }
}
```

## Testing

### Jest

```typescript
import { b } from './baml_client'

describe('Person Extraction', () => {
  it('extracts name and email', async () => {
    const text = 'John Smith, john@example.com'
    const result = await b.ExtractPerson(text)

    expect(result.name).toBe('John Smith')
    expect(result.email).toBe('john@example.com')
  })
})
```

### Vitest

```typescript
import { describe, it, expect } from 'vitest'
import { b } from './baml_client'

describe('extraction', () => {
  it('works', async () => {
    const result = await b.ExtractPerson(text)
    expect(result.name).toBeDefined()
  })
})
```

### BAML Test Runner

Run tests defined in `.baml` files:

```bash
npx baml-cli test                          # Run all tests
npx baml-cli test -i "MyFunction:TestName" # Run specific test
```

```baml
// baml_src/tests.baml
test TestClassify {
  functions [ClassifyTweets]
  args {
    tweets ["Hello world!", "Buy now! Limited offer!"]
  }
}
```

## Best Practices

1. **Use strict TypeScript** - Enable `"strict": true` in tsconfig.json
2. **Import types separately** - Use `import type { ... }` for interfaces
3. **Handle async properly** - Always await or handle promises correctly
4. **Stream for UX** - Better perceived performance in interactive applications
5. **Server-side only** - Don't expose API keys in browser code
6. **Run baml-cli generate** - After ANY change to `.baml` files
7. **Use generated types** - Leverage TypeScript's type system for safety
8. **Handle errors** - Wrap BAML calls in try/catch blocks

## Common Patterns

### Conditional Imports

```typescript
// Use dynamic imports for server-side only code
if (typeof window === 'undefined') {
  const { b } = await import('./baml_client')
  // Use b here
}
```

### Error Handling

```typescript
import { BamlValidationError } from '@boundaryml/baml'

try {
  const result = await b.ExtractData(input)
} catch (error) {
  if (error instanceof BamlValidationError) {
    console.error('BAML validation failed:', error.message)
    console.error('Prompt:', error.prompt)
    console.error('Raw response:', error.rawOutput)
  } else {
    console.error('Unexpected error:', error)
  }
}
```

### Type Narrowing

```typescript
// Use type guards for union types
function processResult(result: GetWeather | SearchWeb | Calculator) {
  if ('location' in result) {
    // result is GetWeather
    console.log(result.location)
  } else if ('query' in result) {
    // result is SearchWeb
    console.log(result.query)
  } else {
    // result is Calculator
    console.log(result.expression)
  }
}
```

## Documentation

For detailed TypeScript documentation, visit:

- React/Next.js: https://docs.boundaryml.com/guide/framework-integration/react-next-js
- TypeBuilder: https://docs.boundaryml.com/ref/baml-client/typebuilder
- ClientRegistry: https://docs.boundaryml.com/guide/baml-advanced/client-registry
- Streaming: https://docs.boundaryml.com/guide/baml-basics/streaming
