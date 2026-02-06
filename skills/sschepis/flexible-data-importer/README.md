# OpenClaw Data Importer Skill

The **OpenClaw Data Importer** is an AI-driven tool for ingesting unstructured or semi-structured data (CSV, JSON, XLSX) into Supabase. It uses an LLM to automatically infer relationships, generate relational schemas, and map data types, removing the need for manual ETL scripting.

## Features

- **Auto-Schema Generation**: Reads a sample of your file and proposes a SQL schema.
- **Intelligent Mapping**: Transforms raw keys (e.g., "First Name") to database columns (e.g., "first_name") and casts types (strings to dates/booleans).
- **Streaming & Batching**: Handles large datasets efficiently by streaming files and uploading in batches.
- **Supabase Integration**: Direct UPSERT support via PostgREST.

## Installation

```bash
npm install flexible-data-importer
```

## Usage

### CLI

Ensure you have a `.env` file with:

```env
SUPABASE_URL=...
SUPABASE_KEY=...
OPENAI_API_KEY=...
```

Run the importer:

```bash
npx data-importer ./path/to/my-data.csv
```

### Programmatic

```typescript
import {
  UniversalImporter,
  NodeFileAdapter,
  OpenAILLMAdapter,
  SupabaseAdapter,
} from 'flexible-data-importer'

const importer = new UniversalImporter(
  new NodeFileAdapter(),
  new OpenAILLMAdapter(process.env.OPENAI_API_KEY),
  new SupabaseAdapter(process.env.SUPABASE_URL, process.env.SUPABASE_KEY),
)

await importer.execute('./large-dataset.xlsx')
```

## Architecture

The system uses a **UniversalImporter** core that orchestrates three adapters:

1. **FileAdapter**: Abstracts filesystem access (Node streams vs OpenClaw sandbox).
2. **LLMAdapter**: Abstracts the intelligence provider (OpenAI vs OpenClaw Internal).
3. **DatabaseAdapter**: Abstracts the storage layer (Supabase vs Postgres).

This architecture allows the skill to be run standalone or injected with OpenClaw's native capabilities when running inside the agent runtime.
