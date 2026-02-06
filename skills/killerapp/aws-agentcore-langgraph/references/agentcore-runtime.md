# AgentCore Runtime Patterns

## Basic Entrypoint

```python
from bedrock_agentcore.runtime import BedrockAgentCoreApp
app = BedrockAgentCoreApp()

@app.entrypoint
def invoke(payload, context):
    result = graph.invoke({"messages": [("user", payload.get("prompt", ""))]})
    return {"result": result["messages"][-1].content}

app.run()  # HTTP server on port 8080
```

## Async Streaming

```python
@app.entrypoint
async def invoke(payload, context):
    async for chunk in graph.astream({"messages": [("user", payload["prompt"])]}, stream_mode="updates"):
        for node_name, output in chunk.items():
            if "messages" in output:
                yield output["messages"][-1].content
```

Stream modes: `"values"` (full state), `"updates"` (changed keys, recommended), `"messages"` (messages only)

## CLI Reference

| Command                                                 | Purpose                      |
| ------------------------------------------------------- | ---------------------------- |
| `agentcore configure -e agent.py --region us-east-1`    | Interactive setup            |
| `agentcore configure --non-interactive --name my_agent` | Scripted setup               |
| `agentcore launch`                                      | Deploy via CodeBuild (ARM64) |
| `agentcore launch --local`                              | Local Docker testing         |
| `agentcore invoke '{"prompt":"Hi"}'`                    | Test invocation              |
| `agentcore status --verbose`                            | Detailed status              |
| `agentcore destroy --dry-run`                           | Preview cleanup              |

**Agent naming**: Letters/numbers/underscores only, 1-48 chars. Use `my_agent` not `my-agent`.

**Platform note**: ARM64 containers required. CodeBuild handles cross-platform builds automatically.

## Bedrock Models

| Model             | ID                                            | Notes                      |
| ----------------- | --------------------------------------------- | -------------------------- |
| Claude 3 Haiku    | `anthropic.claude-3-haiku-20240307-v1:0`      | Fast, on-demand            |
| Claude 3.5 Haiku  | `anthropic.claude-3-5-haiku-20241022-v1:0`    | Better quality             |
| Claude 3.5 Sonnet | `anthropic.claude-3-5-sonnet-20241022-v2:0`   | High quality               |
| Claude 4.5 Haiku  | `us.anthropic.claude-haiku-4-5-20251001-v1:0` | Requires inference profile |

**CRITICAL**: Claude 4.x requires `us.` or `eu.` prefix. Using `anthropic.claude-haiku-4-5-*` causes `ValidationException`.

```python
# Claude 3.5 (on-demand)
llm = init_chat_model("anthropic.claude-3-5-haiku-20241022-v1:0", model_provider="bedrock_converse")

# Claude 4.5 (inference profile)
llm = init_chat_model("us.anthropic.claude-haiku-4-5-20251001-v1:0", model_provider="bedrock_converse")
```

## Model Access Errors

`ResourceNotFoundException`: Go to Bedrock Console > Model access > Request Anthropic access > Wait ~15 min.

## Local Testing

```bash
python agent.py
curl -X POST http://localhost:8080/invocations -H "Content-Type: application/json" -d '{"prompt":"Test"}'
curl http://localhost:8080/ping  # Health check
```

## Documentation

| Resource         | URL                                                                        |
| ---------------- | -------------------------------------------------------------------------- |
| Runtime Overview | https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime.html |
| Model IDs        | https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html |
