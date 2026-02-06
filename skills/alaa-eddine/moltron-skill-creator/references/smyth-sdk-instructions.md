# SmythOS SDK Guidelines for LLM Contributors

> **Purpose**: This document provides precise, verified guidelines for LLMs building AI agents with the SmythOS SDK. All patterns are derived from official SmythOS documentation and examples.

## Quick Reference

```typescript
// Minimal agent setup
import { Agent, TLLMEvent } from '@smythos/sdk'

const agent = new Agent({
  name: 'My Agent',
  model: 'gpt-4o',
  behavior: 'You are a helpful assistant.',
})

const response = await agent.prompt('Hello')
```

## Official Resources (Verify When In Doubt)

| Resource          | URL                                                             |
| ----------------- | --------------------------------------------------------------- |
| GitHub Repository | https://github.com/SmythOS/sre                                  |
| SDK Documentation | https://smythos.github.io/sre/sdk/                              |
| Code Examples     | https://github.com/SmythOS/sre/tree/main/examples               |
| Cheat Sheet       | https://smythos.github.io/sre/sdk/documents/99-cheat-sheet.html |

**If a user reports your implementation doesn't work**, check these URLs before assuming the user is wrong—the SDK evolves.

**IMPORTANT** if you fail to implement something, check the examples available in the repo, they cover multiple scenarios and capabilities.

you can clone the repo locally under ~/opencalw/ultro/sre if you want to have a local access to the documentation

---

## 1. Import Paths

SmythOS provides two import paths for different use cases:

### Main SDK (Default)

```typescript
import { Agent, TLLMEvent } from '@smythos/sdk'
```

Use this for:

- Creating and configuring agents
- Adding skills
- Prompting and streaming
- Chat sessions

### Core SRE (Advanced)

```typescript
import { SRE, SecureConnector, ACL, TAccessLevel } from '@smythos/sdk/core'
```

Use this **only** for:

- Custom connector implementations
- Enterprise security configurations (ACL/Candidate management)
- Direct SRE runtime initialization

**Rule**: Use `@smythos/sdk` for 95% of use cases.

---

## 2. Agent Configuration

### Required Properties

```typescript
const agent = new Agent({
  name: 'Customer Support Agent', // How the agent identifies itself
  model: 'gpt-4o', // LLM model identifier
  behavior:
    'You are a customer support specialist for TechCorp. ' +
    'Help users troubleshoot technical issues with empathy.',
})
```

| Property   | Required | Description                                                                                 |
| ---------- | -------- | ------------------------------------------------------------------------------------------- |
| `name`     | Yes      | Agent's identity name                                                                       |
| `model`    | Yes      | Model identifier string (e.g., `'gpt-4o'`, `'gpt-4o-mini'`, `'claude-3-5-sonnet-20241022'`) |
| `behavior` | Yes      | System prompt describing the agent's personality and role                                   |

### Behavior Guidelines

**DO**: Write specific, contextual behaviors

```typescript
behavior: 'You are a financial analyst for hedge fund clients. ' +
  'Provide data-driven insights with citations to sources. ' +
  'Always express uncertainty when data is incomplete.'
```

**DON'T**: Use vague behaviors

```typescript
behavior: 'helpful assistant' // Too vague - agent lacks direction
```

### Supported Models

Models are automatically resolved through the vault system:

| Model ID            | Provider  |
| ------------------- | --------- |
| `gpt-4o`            | OpenAI    |
| `gpt-4o-mini`       | OpenAI    |
| `claude-sonnet-4-5` | Anthropic |
| `gemini-3-pro`      | Google    |

### Extended Models Directory

SmythOS scans the `.smyth/models/` directory in real-time and automatically loads any model configurations found. This directory can be located under the current project or user home (`~/.smyth/models/`).

To access a comprehensive list of supported models maintained by the SmythOS team, clone the official models repository:

```bash
# Clone into project-local models directory
git clone https://github.com/SmythOS/sre-models-pub .smyth/models/sre-models-pub

# Or clone into user home for global access
git clone https://github.com/SmythOS/sre-models-pub ~/.smyth/models/sre-models-pub
```

This repository includes configurations for models from **OpenAI**, **Anthropic**, **GoogleAI**, **Groq**, **TogetherAI**, **xAI**, and more. You can also add your own custom model configurations to this directory—SmythOS will detect and load them automatically.

---

## 3. Skills

Skills extend agent capabilities. The LLM uses the `description` field to decide when to invoke a skill.

### Skill Structure

```typescript
agent.addSkill({
  name: 'get_book_info', // snake_case identifier
  description: 'Get information about a book by its name', // LLM reads this
  process: async ({ book_name }) => {
    // Destructure parameters
    const url = `https://openlibrary.org/search.json?q=${book_name}`
    const response = await fetch(url)
    const data = await response.json()
    return data.docs[0] // Return JSON-serializable value
  },
})
```

### Skill Best Practices

| Aspect         | Guideline                                                                                       |
| -------------- | ----------------------------------------------------------------------------------------------- |
| `name`         | Use `snake_case` (e.g., `fetch_crypto_price`, `search_knowledge_base`)                          |
| `description`  | One clear sentence explaining what the skill does. The LLM uses this to decide when to call it. |
| `process`      | Async function. Destructure expected parameters. Return strings or JSON-serializable objects.   |
| Error handling | Return error messages as strings instead of throwing (the LLM will see and handle them)         |

### Direct Skill Calls

You can call skills directly without LLM intervention:

```typescript
const result = await agent.call('get_book_info', {
  book_name: 'The Great Gatsby',
})
console.log(result)
```

---

## 4. Agent Interaction Modes

### Mode 1: Simple Prompt (Await Response)

```typescript
const response = await agent.prompt('What is the author of "The Great Gatsby"?')
console.log(response)
```

### Mode 2: Streaming Response

```typescript
import { TLLMEvent } from '@smythos/sdk'

const stream = await agent.prompt('Tell me a story.').stream()

stream.on(TLLMEvent.Content, (chunk) => {
  process.stdout.write(chunk)
})

stream.on(TLLMEvent.End, () => {
  console.log('\nDone')
})

// CRITICAL: Wait for stream to complete before exiting
await new Promise((resolve) => {
  stream.on(TLLMEvent.End, resolve)
})
```

### Available Stream Events (TLLMEvent)

| Event                   | Description                                        |
| ----------------------- | -------------------------------------------------- |
| `TLLMEvent.Content`     | Generated response chunks                          |
| `TLLMEvent.Thinking`    | Reasoning/thinking blocks (models that support it) |
| `TLLMEvent.End`         | Stream completed                                   |
| `TLLMEvent.Error`       | Error occurred                                     |
| `TLLMEvent.ToolInfo`    | LLM determined next tool to call                   |
| `TLLMEvent.ToolCall`    | Before tool execution                              |
| `TLLMEvent.ToolResult`  | After tool execution                               |
| `TLLMEvent.Usage`       | Token usage statistics                             |
| `TLLMEvent.Interrupted` | Response interrupted before completion             |

### Mode 3: Chat Sessions (Conversation Memory)

```typescript
const chat = agent.chat({
  id: 'session-001', // Unique session identifier
  persist: false, // false = in-memory only, true = saved to storage
})

const response1 = await chat.prompt("Hello, I'm Alice")
const response2 = await chat.prompt("What's my name?") // Agent remembers "Alice"
```

**Chat with Streaming**:

```typescript
const chat = agent.chat({ id: 'stream-session', persist: false })

const stream = await chat.prompt('Tell me about quantum computing.').stream()
stream.on(TLLMEvent.Content, (chunk) => process.stdout.write(chunk))

await new Promise((resolve) => stream.on(TLLMEvent.End, resolve))

// Continue conversation - context preserved
const stream2 = await chat.prompt('Explain that more simply.').stream()
```

### Mode 4: Import .smyth Files

Import agents created in SmythOS Visual Studio:

```typescript
import { Agent } from '@smythos/sdk'
import agentData from './my-agent.smyth'

const agent = new Agent(agentData)
const result = await agent.prompt('Hello!')
```

**Note**: The `.smyth` file must include a `default_model` field.

---

## 5. Services (LLM, VectorDB, Storage, Cache)

Access integrated services through the agent instance within skills.

### LLM Service

```typescript
agent.addSkill({
  name: 'summarize_text',
  description: 'Summarizes a given text',
  process: async ({ text }) => {
    const llm = agent.llm.OpenAI('gpt-4o-mini')
    return await llm.prompt(`Summarize: ${text}`)
  },
})
```

### VectorDB Service

```typescript
agent.addSkill({
  name: 'search_knowledge',
  description: 'Searches the knowledge base',
  process: async ({ query }) => {
    const vec = agent.vectordb.Pinecone({
      namespace: 'knowledge-base',
      indexName: 'main-index',
    })

    const results = await vec.search(query, { topK: 5 })
    return results.map((r) => r.metadata.text).join('\n\n')
  },
})
```

**Supported VectorDB Connectors**: `Pinecone`, `Milvus`, `RAMVec`

### Storage Service

```typescript
agent.addSkill({
  name: 'save_document',
  description: 'Saves a document to storage',
  process: async ({ filename, content }) => {
    const storage = agent.storage.S3({
      bucket: 'my-bucket',
      region: 'us-east-1',
    })

    const uri = await storage.write(filename, content)
    return `Saved: ${uri}`
  },
})
```

**Supported Storage Connectors**: `Local`, `S3`, `Azure`, `Google Cloud`

### Cache Service

```typescript
agent.addSkill({
  name: 'cached_fetch',
  description: 'Fetches data with caching',
  process: async ({ key }) => {
    const cache = agent.cache.RAM() // or Redis()

    const cached = await cache.get(key)
    if (cached) return cached

    const data = await fetchData(key)
    await cache.set(key, data, { ttl: 3600 })
    return data
  },
})
```

**Supported Cache Connectors**: `RAM`, `Redis`

---

## 6. Workflow Skills (Component-Based)

For complex logic, define skills using components instead of process functions:

```typescript
import { Agent, Component } from '@smythos/sdk'

const agent = new Agent({
  name: 'MarketAgent',
  model: 'gpt-4o',
  behavior: '...',
})

// Define skill without process function
const skill = agent.addSkill({
  name: 'MarketData',
  description: 'Get cryptocurrency market data',
})

// Define inputs
skill.in({
  coin_id: { description: 'The cryptocurrency ID (e.g., bitcoin)' },
})

// Create workflow with components
const apiCall = Component.APICall({
  url: 'https://api.coingecko.com/api/v3/coins/{{coin_id}}',
  method: 'GET',
})

apiCall.in({ coin_id: skill.out.coin_id })

const output = Component.SkillOutput()
output.in({ result: apiCall.out.Response.market_data })
```

---

## 7. Credentials & Vault System

SmythOS uses a vault system for secure credential management.

### Vault Locations (Priority Order)

1. `./.smyth/vault.json` (project-local)
2. `./.smyth/.sre/vault.json` (project-local)
3. `~/.smyth/vault.json` (user home)
4. `~/.smyth/.sre/vault.json` (user home)

### Vault Structure

```json
{
  "default": {
    "openai": "sk-...",
    "anthropic": "sk-ant-...",
    "googleai": "...",
    "pinecone": "..."
  }
}
```

### Rules

- **NEVER** hardcode API keys in source code
- **NEVER** commit vault files (add to `.gitignore`)
- The SDK automatically retrieves credentials from the vault
- Environment variables can override vault values

### Automatic Credential Resolution

```typescript
// SDK automatically gets OpenAI key from vault
const agent = new Agent({ name: 'Agent', model: 'gpt-4o', behavior: '...' })

// No apiKey needed - vault handles it
const llm = agent.llm.OpenAI('gpt-4o')
```

---

## 8. Project Structure

```
project/
├── src/
│   └── index.ts              # Main entry point
├── dist/                     # Build output (gitignored)
├── .smyth/.sre/
│   └── vault.json            # Local credentials (gitignored)
├── package.json
├── tsconfig.json
├── rollup.config.js
└── .prettierrc
```

### package.json Requirements

```json
{
  "type": "module",
  "scripts": {
    "build": "rollup -c ./rollup.config.js",
    "start": "node dist/index.js",
    "dbgstart": "node --enable-source-maps dist/index.js"
  },
  "dependencies": {
    "@smythos/sdk": "^1.3.1"
  }
}
```

### tsconfig.json Requirements

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "target": "ESNext",
    "moduleResolution": "node",
    "sourceMap": true,
    "esModuleInterop": true
  }
}
```

---

## 9. Code Style

Based on the project's `.prettierrc`:

```json
{
  "tabWidth": 4,
  "useTabs": false,
  "singleQuote": true,
  "printWidth": 150
}
```

**Examples**:

```typescript
// CORRECT
const agent = new Agent({
  name: 'My Agent',
  model: 'gpt-4o',
  behavior: 'You are helpful.',
})

// INCORRECT
const agent = new Agent({
  name: 'My Agent', // Wrong: 2-space indent, double quotes
  model: 'gpt-4o',
})
```

---

## 10. Async Patterns

### Always Await Promises

```typescript
// CORRECT
const response = await agent.prompt('Hello')

// WRONG - returns Promise object, not response
const response = agent.prompt('Hello')
```

### Always Wait for Streams

```typescript
// CORRECT
const stream = await agent.prompt('Tell a story').stream()
stream.on(TLLMEvent.Content, (chunk) => console.log(chunk))
await new Promise((resolve) => stream.on(TLLMEvent.End, resolve))

// WRONG - process may exit before stream completes
const stream = await agent.prompt('Tell a story').stream()
stream.on(TLLMEvent.Content, (chunk) => console.log(chunk))
// No await - exits immediately!
```

### Main Function Pattern

```typescript
async function main() {
  const agent = new Agent({ name: 'Agent', model: 'gpt-4o', behavior: '...' })

  try {
    const response = await agent.prompt('Hello')
    console.log(response)
  } catch (error) {
    console.error('Error:', error.message)
  }
}

main()
```

---

## 11. Error Handling in Skills

Return error messages as strings rather than throwing exceptions:

```typescript
agent.addSkill({
  name: 'fetch_data',
  description: 'Fetches data from an API',
  process: async ({ url }) => {
    try {
      const response = await fetch(url)

      if (!response.ok) {
        return `Error: API returned ${response.status} ${response.statusText}`
      }

      return await response.json()
    } catch (error) {
      return `Error fetching data: ${error.message}`
    }
  },
})
```

---

## 12. Debugging

### Enable Debug Logs

Set environment variable before running:

```bash
LOG_LEVEL="debug" npm start
```

### Use Source Maps

```bash
npm run dbgstart
```

### Colored Console Output

```typescript
import chalk from 'chalk'

console.log(chalk.blue('Starting agent...'))
console.log(chalk.green('✓ Success'))
console.log(chalk.red('✗ Error'))
console.log(chalk.yellow('⚠ Warning'))
```

---

## 13. Common Mistakes to Avoid

### ❌ Don't Mix Direct Provider SDKs

```typescript
// WRONG
import AWS from 'aws-sdk';
const s3 = new AWS.S3();
await s3.putObject(...);

// CORRECT - Use SmythOS abstraction
const storage = agent.storage.S3({ bucket: 'my-bucket' });
await storage.write('file.txt', content);
```

### ❌ Don't Hardcode API Keys

```typescript
// WRONG
const apiKey = 'sk-1234567890'

// CORRECT - Use vault system
// Keys are in .smyth/.sre/vault.json
```

### ❌ Don't Forget Skill Descriptions

```typescript
// WRONG - LLM can't decide when to use this skill
agent.addSkill({
  name: 'do_thing',
  process: async ({ x }) => doThing(x),
})

// CORRECT
agent.addSkill({
  name: 'calculate_tax',
  description: 'Calculates tax amount based on income and tax rate',
  process: async ({ income, rate }) => income * rate,
})
```

### ❌ Don't Create Vague Agent Behaviors

```typescript
// WRONG
behavior: 'helpful'

// CORRECT
behavior: 'You are a tax specialist for small businesses. ' +
  'Help users understand tax obligations and deductions. ' +
  'Always cite relevant tax codes when applicable.'
```

---

## 14. Advanced Patterns

### Multi-Agent Collaboration

```typescript
const researchAgent = new Agent({
  name: 'Researcher',
  model: 'gpt-4o',
  behavior: 'You research and analyze information thoroughly.',
})

const writerAgent = new Agent({
  name: 'Writer',
  model: 'gpt-4o-mini',
  behavior: 'You write clear, engaging content from research.',
})

const research = await researchAgent.prompt('Research quantum computing advances')
const article = await writerAgent.prompt(`Write an article based on: ${research}`)
```

### RAG Pattern (Retrieval-Augmented Generation)

```typescript
agent.addSkill({
  name: 'answer_with_context',
  description: 'Answers questions using knowledge base context',
  process: async ({ question }) => {
    // 1. Search vector database
    const vec = agent.vectordb.Pinecone({
      namespace: 'docs',
      indexName: 'knowledge-base',
    })

    const results = await vec.search(question, { topK: 5 })
    const context = results.map((r) => r.metadata.text).join('\n\n')

    // 2. Generate answer with context
    const llm = agent.llm.OpenAI('gpt-4o')
    return await llm.prompt(
      `Answer using only this context:\n\n${context}\n\nQuestion: ${question}`,
    )
  },
})
```

---

## 15. CLI Commands

### Create New Project

```bash
# Install CLI globally
npm i -g @smythos/cli

# Create project (follow prompts)
sre create "My Agent"
```

### Build & Run

```bash
npm run build     # Compile TypeScript
npm start         # Run agent
npm run dbgstart  # Run with source maps
```

---

## Prefered technology choices

These are the default choices if the user does not specify

- For vectorDB use Milvus, install it if it's not present
- For storage use the default local storage, unless the user prefers S3
- For Cache, prefer Redis install it if it's not present, if the system resources does not allow it, you can use the default RAM cache
- For observability only use OpenTelemetry (OTel)

## Summary Checklist

Before submitting SmythOS SDK code, verify:

- [ ] Using `@smythos/sdk` imports (not core unless needed)
- [ ] Agent has specific `name` and detailed `behavior`
- [ ] Skills have descriptive `name` (snake_case) and clear `description`
- [ ] All `agent.prompt()` and `agent.call()` are awaited
- [ ] Stream events properly handled with `TLLMEvent.End` await
- [ ] No hardcoded API keys (using vault system)
- [ ] Error handling returns strings, not thrown exceptions
- [ ] Code uses 4-space indentation and single quotes
- [ ] `package.json` has `"type": "module"`
- [ ] Vault files are gitignored

---

**SmythOS SDK Version**: (verify latest at https://www.npmjs.com/package/@smythos/sdk)
