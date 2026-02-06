# Strands SDK Cheatsheet

## Imports

```python
# Core
from strands import Agent, tool
from strands.types.tools import ToolContext

# Models
from strands.models import BedrockModel                    # default, eager
from strands.models.ollama import OllamaModel              # local
from strands.models.anthropic import AnthropicModel        # direct API
from strands.models.openai import OpenAIModel              # OpenAI
from strands.models.gemini import GeminiModel              # Google
from strands.models.mistral import MistralModel            # Mistral
from strands.models.litellm import LiteLLMModel            # meta-provider
from strands.models.llamaapi import LlamaAPIModel          # Llama API
from strands.models.llamacpp import LlamaCppModel          # local server
from strands.models.sagemaker import SageMakerAIModel      # AWS SageMaker
from strands.models.writer import WriterModel              # Writer

# Multi-agent
from strands.multiagent.swarm import Swarm
from strands.multiagent.graph import GraphBuilder
from strands.multiagent.a2a import A2AServer

# MCP
from strands.tools.mcp import MCPClient
from mcp import stdio_client, StdioServerParameters

# Sessions
from strands.session.file_session_manager import FileSessionManager
from strands.session.s3_session_manager import S3SessionManager

# Built-in tools (examples)
from strands_tools import calculator, file_read, file_write, shell, http_request

# Experimental
from strands.experimental.bidi.agent import BidiAgent
from strands.experimental.bidi.models.nova_sonic import NovaSonicModel
from strands.experimental.bidi.models.gemini_live import GeminiLiveModel
from strands.experimental.bidi.models.openai_realtime import OpenAIRealtimeModel
```

## Model Init Gotchas

```python
# Bedrock — zero config (needs AWS creds)
Agent()  # defaults to Claude Sonnet 4

# Ollama — host is POSITIONAL
OllamaModel("http://localhost:11434", model_id="qwen3:latest")  # ✅
OllamaModel(model_id="qwen3:latest")                            # ❌ missing host

# Anthropic — max_tokens is REQUIRED
AnthropicModel(model_id="claude-sonnet-4-20250514", max_tokens=4096)  # ✅
AnthropicModel(model_id="claude-sonnet-4-20250514")                   # ❌ crashes
```

## Agent Constructor

```python
Agent(
    model=model,                          # Model | str | None (None → Bedrock)
    tools=[tool1, tool2, mcp_provider],   # list of tools/ToolProviders
    system_prompt="You are helpful.",      # str or list[SystemContentBlock]
    name="my_agent",                      # for Swarm handoff identification
    description="Does things",            # for Swarm handoff identification
    session_manager=session,              # FileSessionManager | S3SessionManager
    load_tools_from_directory=True,       # watch ./tools/ for hot reload
    trace_attributes={"env": "dev"},      # OpenTelemetry attributes
)
```

## Tool Decorator

```python
@tool
def my_tool(arg1: str, arg2: int = 10) -> str:
    """Description shown to the LLM.

    Args:
        arg1: Description of arg1.
        arg2: Description of arg2.
    """
    return f"Result: {arg1} x {arg2}"
```

- Type hints → JSON schema
- Docstring → tool description
- Args section → parameter descriptions
- Optional: `tool_context: ToolContext` param for agent state access

## Multi-Agent Quick Reference

```python
# Swarm — self-organizing, handoff-based
swarm = Swarm(nodes=[a1, a2], entry_point=a1)
result = swarm("task")

# Graph — deterministic DAG
graph = GraphBuilder()
graph.add_node(a1, "step1")
graph.add_node(a2, "step2")
graph.add_edge("step1", "step2")
result = graph.build()("task")

# A2A — inter-process server
server = A2AServer(agent=my_agent, port=9000)
```

## MCP Quick Reference

```python
# stdio transport
mcp = MCPClient(lambda: stdio_client(StdioServerParameters(
    command="uvx", args=["server@latest"]
)))
with mcp:
    agent = Agent(tools=[mcp])

# SSE transport
from mcp.client.sse import sse_client
mcp = MCPClient(lambda: sse_client("http://localhost:8080/sse"))
```

## Environment Variables

| Variable | Provider | Required |
|----------|----------|----------|
| `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` | Bedrock, SageMaker | When not using profile |
| `AWS_REGION` | Bedrock, SageMaker | Optional (default: us-west-2) |
| `ANTHROPIC_API_KEY` | Anthropic | Yes |
| `OPENAI_API_KEY` | OpenAI | Yes |
| `MISTRAL_API_KEY` | Mistral | Yes |
| `STRANDS_MCP_TIMEOUT` | MCP | Optional (default: 30s) |
