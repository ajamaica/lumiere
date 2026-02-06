# Provider Configuration Reference

## Native Providers

| Provider       | Shorthand                              | Default Env Var        |
| -------------- | -------------------------------------- | ---------------------- |
| `openai`       | `"openai/gpt-4o"`                      | `OPENAI_API_KEY`       |
| `anthropic`    | `"anthropic/claude-sonnet-4-20250514"` | `ANTHROPIC_API_KEY`    |
| `google-ai`    | `"google-ai/gemini-2.0-flash"`         | `GOOGLE_API_KEY`       |
| `vertex`       | `"vertex/gemini-2.0-flash"`            | Google Cloud creds     |
| `azure-openai` | (full config only)                     | `AZURE_OPENAI_API_KEY` |
| `aws-bedrock`  | (full config only)                     | AWS creds              |

## OpenAI-Compatible Providers (use `provider openai-generic`)

| Service     | base_url                         |
| ----------- | -------------------------------- |
| Groq        | `https://api.groq.com/openai/v1` |
| Together AI | `https://api.together.ai/v1`     |
| OpenRouter  | `https://openrouter.ai/api/v1`   |
| Ollama      | `http://localhost:11434/v1`      |
| Cerebras    | `https://api.cerebras.ai/v1`     |

## Client Syntax

**Shorthand**: `client "openai/gpt-4o"` (uses default env var)

**Named Client**:

```baml
client<llm> MyClient {
  provider openai
  retry_policy StandardRetry
  options { model "gpt-4o"  api_key env.OPENAI_API_KEY  temperature 0.0 }
}
```

## Retry Policy

```baml
retry_policy StandardRetry { max_retries 3 }
retry_policy CustomRetry {
  max_retries 5
  strategy { type exponential_backoff  delay_ms 200  multiplier 1.5  max_delay_ms 10000 }
}
```

Retried: network timeouts, 5xx errors, 429 rate limits. NOT retried: 4xx, invalid keys.

## Fallback Strategy

```baml
client<llm> ResilientPipeline {
  provider fallback
  options { strategy [Primary, Secondary, Tertiary] }
}
```

Execution: tries each in order, stops at first success.

## Round-Robin Load Balancing

```baml
client<llm> LoadBalanced {
  provider round-robin
  options { strategy [ClientA, ClientB, ClientC] }
}
```

## Anthropic Prompt Caching

```baml
client<llm> ClaudeWithCache {
  provider anthropic
  options { model "claude-sonnet-4-20250514"  allowed_role_metadata ["cache_control"] }
}
```

In prompt: `{{ _.role("system", cache_control={"type": "ephemeral"}) }}`

## Best Practices

| Context     | Recommendation                                                 |
| ----------- | -------------------------------------------------------------- |
| Production  | Retry policies (3+), fallbacks, temperature 0.0, named clients |
| Development | Local models (Ollama), cheaper models, lower max_tokens        |
| Cost        | Chain cheap→expensive, prompt caching, smart routing           |
| Reliability | Retries + fallbacks combined, test failure scenarios           |

## Temperature Guidelines

| Value   | Use Case                                 |
| ------- | ---------------------------------------- |
| 0.0     | Extraction, factual tasks (recommended)  |
| 0.3-0.5 | Balanced with slight creativity          |
| 0.7-1.0 | Creative generation (not for extraction) |

## Troubleshooting

| Error              | Fix                                             |
| ------------------ | ----------------------------------------------- |
| API Key Not Found  | Check `.env` file, variable name, loading order |
| Connection Refused | Verify service running, correct port            |
| 429 Rate Limit     | Increase retry delays, round-robin keys         |
| Model Not Found    | Check spelling, provider availability           |

**Docs**: https://docs.boundaryml.com/ref/llm-client
