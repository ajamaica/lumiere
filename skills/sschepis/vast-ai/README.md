# VAST.ai Skill for OpenClaw

A resilient, type-safe VAST.ai client wrapper and OpenClaw skill adapter. This project provides a robust interface for renting and managing on-demand GPU infrastructure via VAST.ai, designed to be embedded in OpenClaw agents or used as a standalone library/CLI.

## Features

- **Resilient API Client**: Built on a generic `DynamicApi` class that handles:
  - **Rate Limiting**: Respects API limits automatically.
  - **Request Queuing**: Concurrency control to prevent flooding.
  - **Exponential Backoff/Retry**: Automatically handles 429s and transient network errors.
- **Financial Awareness**: Built-in tools to check account balance, calculate burn rates, and estimate remaining runtime.
- **Type-Safe**: Written in TypeScript with full typing for API interactions.
- **OpenClaw Ready**: Includes an adapter and CLI wrapper formatted for OpenClaw skill execution.

## Installation

1.  **Clone/Navigate to the directory**:

    ```bash
    cd ~/Development/vast-ai
    ```

2.  **Install Dependencies**:

    ```bash
    npm install
    ```

3.  **Build the Project**:
    ```bash
    npm run build
    # or
    npx tsc
    ```

## Configuration

You must provide your VAST.ai API key via an environment variable:

```bash
export VAST_API_KEY="your_vast_api_key_here"
```

## Usage

### CLI (Command Line Interface)

This project includes a CLI wrapper (`dist/cli.js`) used by OpenClaw. You can also run it manually.

**Check Balance:**

```bash
node dist/cli.js balance
```

_Output:_

```json
{
  "remainingCredit": "$15.42",
  "currentHourlyBurn": "$0.55/hr",
  "estimatedRunTime": "28.0 hours"
}
```

**Search for GPUs:**

```bash
# Find RTX 4090s under $0.60/hr
node dist/cli.js search --gpu "RTX 4090" --price 0.60
```

**Rent an Instance:**

```bash
node dist/cli.js rent --id 12345 --image "pytorch/pytorch"
```

**Get Connection Details:**

```bash
node dist/cli.js connect --id 12345
```

### Programmatic Usage

You can import `VastClient` directly into other Node.js or TypeScript projects.

```typescript
import { VastClient } from './dist/VastClient'

const client = new VastClient(process.env.VAST_API_KEY)

async function main() {
  // Check funds
  const balance = await client.getBalance()
  console.log(`Credit: $${balance.credit}`)

  // Search
  const offers = await client.findGpu('RTX 3090', 0.4)
  console.log('Found offers:', offers)
}

main()
```

## Project Structure

- `src/DynamicApi.ts`: Generic API wrapper with retry/queue logic.
- `src/VastClient.ts`: Domain-specific VAST.ai logic.
- `src/adapter.ts`: OpenClaw skill interface.
- `src/cli.ts`: Entry point for CLI execution.
- `SKILL.md`: Documentation for the AI agent (OpenClaw).

## License

ISC
