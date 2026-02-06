---
name: strands
version: 2.0.0
description: Build and run Python-based AI agents using the AWS Strands SDK. Use when you need to create autonomous agents, multi-agent workflows, custom tools, or integrate with MCP servers. Supports Ollama (local), Anthropic, OpenAI, Bedrock, and other model providers. Use for agent scaffolding, tool creation, and running agent tasks programmatically.
homepage: https://github.com/strands-agents/sdk-python
metadata:
  openclaw:
    emoji: 🧬
    requires:
      bins: [python3]
      packages: [strands-agents]
---

# Strands Agents SDK

Build AI agents in Python using the [Strands SDK](https://github.com/strands-agents/sdk-python) (Apache-2.0, from AWS).

Validated against: `strands-agents==1.23.0`, `strands-agents-tools==0.2.19`

## Prerequisites

```bash
# Install SDK + tools (via pipx for isolation — recommended)
pipx install strands-agents-builder  # includes strands-agents + strands-agents-tools + CLI

# Or install directly
pip install strands-agents strands-agents-tools
```

## Core Concept: Bedrock Is the Default

`Agent()` with no `model=` argument defaults to **Amazon Bedrock** — specifically `us.anthropic.claude-sonnet-4-20250514-v1:0` in `us-west-2`. This requires AWS credentials. To use a different provider, pass `model=` explicitly.

Default model constant: `strands.models.bedrock.DEFAULT_BEDROCK_MODEL_ID`

## Quick Start — Local Agent (Ollama)

```python
from strands import Agent
from strands.models.ollama import OllamaModel

# host is a required positional argument
model = OllamaModel("http://localhost:11434", model_id="qwen3:latest")
agent = Agent(model=model)
result = agent("What is the capital of France?")
print(result)
```

**Note:** Not all open-source models support tool-calling. Abliterated models often lose function-calling during the abliteration process. Test with a stock model (qwen3, llama3.x, mistral) first.

## Quick Start — Bedrock (Default Provider)

```python
from strands import Agent

# No model specified → BedrockModel (Claude Sonnet 4, us-west-2)
# Requires AWS credentials (~/.aws/credentials or env vars)
agent = Agent()
result = agent("Explain quantum computing")

# Explicit Bedrock model:
from strands.models import BedrockModel
model = BedrockModel(model_id="us.anthropic.claude-sonnet-4-20250514-v1:0")
agent = Agent(model=model)
```

## Quick Start — Anthropic (Direct API)

```python
from strands import Agent
from strands.models.anthropic import AnthropicModel

# max_tokens is Required[int] — must be provided
model = AnthropicModel(model_id="claude-sonnet-4-20250514", max_tokens=4096)
agent = Agent(model=model)
result = agent("Explain quantum computing")
```

Requires `ANTHROPIC_API_KEY` environment variable.

## Quick Start — OpenAI

```python
from strands import Agent
from strands.models.openai import OpenAIModel

model = OpenAIModel(model_id="gpt-4.1")
agent = Agent(model=model)
```

Requires `OPENAI_API_KEY` environment variable.

## Creating Custom Tools

Use the `@tool` decorator. Type hints become the schema; the docstring becomes the description:

```python
from strands import Agent, tool

@tool
def read_file(path: str) -> str:
    """Read contents of a file at the given path.

    Args:
        path: Filesystem path to read.
    """
    with open(path) as f:
        return f.read()

@tool
def write_file(path: str, content: str) -> str:
    """Write content to a file.

    Args:
        path: Filesystem path to write.
        content: Text content to write.
    """
    with open(path, 'w') as f:
        f.write(content)
    return f"Wrote {len(content)} bytes to {path}"

agent = Agent(model=model, tools=[read_file, write_file])
agent("Read /tmp/test.txt and summarize it")
```

### ToolContext

Tools can access agent state via `ToolContext`:

```python
from strands import tool
from strands.types.tools import ToolContext

@tool
def stateful_tool(query: str, tool_context: ToolContext) -> str:
    """A tool that accesses agent state.

    Args:
        query: Input query.
    """
    # Access shared agent state
    count = tool_context.state.get("call_count", 0) + 1
    tool_context.state["call_count"] = count
    return f"Call #{count}: {query}"
```

## Built-in Tools (46 available)

`strands-agents-tools` provides pre-built tools:

```python
from strands_tools import calculator, file_read, file_write, shell, http_request
agent = Agent(model=model, tools=[calculator, file_read, shell])
```

Full list: `calculator`, `file_read`, `file_write`, `shell`, `http_request`, `editor`, `image_reader`, `python_repl`, `current_time`, `think`, `stop`, `sleep`, `environment`, `retrieve`, `search_video`, `chat_video`, `speak`, `generate_image`, `generate_image_stability`, `diagram`, `journal`, `memory`, `agent_core_memory`, `elasticsearch_memory`, `mongodb_memory`, `mem0_memory`, `rss`, `cron`, `batch`, `workflow`, `use_agent`, `use_llm`, `use_aws`, `use_computer`, `load_tool`, `handoff_to_user`, `slack`, `swarm`, `graph`, `a2a_client`, `mcp_client`, `exa`, `tavily`, `bright_data`, `nova_reels`.

Hot reload: `Agent(load_tools_from_directory=True)` watches `./tools/` for changes.

## MCP Integration

Connect to any Model Context Protocol server. MCPClient implements `ToolProvider` — pass it directly in the tools list:

```python
from strands import Agent
from strands.tools.mcp import MCPClient
from mcp import stdio_client, StdioServerParameters

# MCPClient takes a callable that returns the transport
mcp = MCPClient(lambda: stdio_client(StdioServerParameters(
    command="uvx",
    args=["some-mcp-server@latest"]
)))

# Use as context manager — MCPClient is a ToolProvider
with mcp:
    agent = Agent(model=model, tools=[mcp])
    agent("Use the MCP tools to do something")
```

SSE transport:
```python
from mcp.client.sse import sse_client
mcp = MCPClient(lambda: sse_client("http://localhost:8080/sse"))
```

## Multi-Agent Patterns

### Agents as Tools

Nest agents — inner agents become tools for the outer agent:

```python
researcher = Agent(model=model, system_prompt="You are a research assistant.")
writer = Agent(model=model, system_prompt="You are a writer.")

orchestrator = Agent(
    model=model,
    tools=[researcher, writer],
    system_prompt="You coordinate research and writing tasks."
)
orchestrator("Research quantum computing and write a blog post")
```

### Swarm Pattern

Self-organizing agent teams with shared context and autonomous handoff coordination:

```python
from strands.multiagent.swarm import Swarm

# Agents need name + description for handoff identification
researcher = Agent(
    model=model,
    name="researcher",
    description="Finds and summarizes information"
)
writer = Agent(
    model=model,
    name="writer",
    description="Creates polished content"
)

swarm = Swarm(
    nodes=[researcher, writer],
    entry_point=researcher,    # optional — defaults to first agent
    max_handoffs=20,           # default
    max_iterations=20,         # default
    execution_timeout=900.0,   # 15 min default
    node_timeout=300.0         # 5 min per node default
)
result = swarm("Research AI agents, then hand off to writer for a blog post")
```

Swarm auto-injects a `handoff_to_agent` tool. Agents hand off by calling it with the target agent's name. Supports interrupt/resume, session persistence, and repetitive-handoff detection.

### Graph Pattern (DAG)

Deterministic dependency-based execution via `GraphBuilder`:

```python
from strands.multiagent.graph import GraphBuilder

builder = GraphBuilder()
research_node = builder.add_node(researcher, node_id="research")
writing_node = builder.add_node(writer, node_id="writing")
builder.add_edge("research", "writing")
builder.set_entry_point("research")

# Optional: conditional edges
# builder.add_edge("research", "writing",
#     condition=lambda state: "complete" in str(state.completed_nodes))

graph = builder.build()
result = graph("Write a blog post about AI agents")
```

Supports cycles (feedback loops) with `builder.reset_on_revisit(True)`, execution timeouts, and nested graphs (Graph as a node in another Graph).

### A2A Protocol (Agent-to-Agent)

Expose a Strands agent as an A2A-compatible server for inter-agent communication:

```python
from strands.multiagent.a2a import A2AServer

server = A2AServer(
    agent=my_agent,
    host="127.0.0.1",
    port=9000,
    version="0.0.1"
)
server.start()  # runs uvicorn
```

Connect to A2A agents with the `a2a_client` tool from strands-agents-tools. A2A implements Google's Agent-to-Agent protocol for standardized cross-process/cross-network agent communication.

## Session Persistence

Persist conversations across agent runs:

```python
from strands.session.file_session_manager import FileSessionManager

session = FileSessionManager(session_file_path="./sessions/my_session.json")
agent = Agent(model=model, session_manager=session)

# Also available:
from strands.session.s3_session_manager import S3SessionManager
session = S3SessionManager(bucket_name="my-bucket", session_id="session-1")
```

Both Swarm and Graph support session managers for persisting multi-agent state.

## Bidirectional Streaming (Experimental)

Real-time voice/text conversations with persistent audio streams:

```python
from strands.experimental.bidi.agent import BidiAgent
from strands.experimental.bidi.models.nova_sonic import NovaSonicModel

# Supports: NovaSonicModel, GeminiLiveModel, OpenAIRealtimeModel
model = NovaSonicModel(region="us-east-1")
agent = BidiAgent(model=model, tools=[my_tool])
```

Supports interruption detection, concurrent tool execution, and continuous back-and-forth audio. Experimental — API subject to change.

## System Prompts

```python
agent = Agent(
    model=model,
    system_prompt="You are Hex, a sharp and witty AI assistant.",
    tools=[read_file, write_file]
)
```

Strands also supports `list[SystemContentBlock]` for structured system prompts with cache control.

## Observability

Native OpenTelemetry tracing:

```python
agent = Agent(
    model=model,
    trace_attributes={"project": "my-agent", "environment": "dev"}
)
```

Every tool call, model invocation, handoff, and lifecycle event is instrumentable.

## Bedrock-Specific Features

- **Guardrails**: `guardrail_id` + `guardrail_version` in BedrockModel config — content filtering, PII detection, input/output redaction
- **Cache points**: System prompt and tool definition caching for cost optimization
- **Streaming**: On by default, disable with `streaming=False`
- **Region**: Defaults to `us-west-2`, override via `region_name` param or `AWS_REGION` env
- **Cross-region inference**: Model IDs prefixed with `us.` use cross-region inference profiles

## Scaffolding a New Agent

```bash
python3 {baseDir}/scripts/create-agent.py my-agent --provider ollama --model qwen3:latest
python3 {baseDir}/scripts/create-agent.py my-agent --provider anthropic
python3 {baseDir}/scripts/create-agent.py my-agent --provider bedrock
python3 {baseDir}/scripts/create-agent.py my-agent --provider openai --model gpt-4.1
```

Creates a ready-to-run agent directory with tools, config, and entry point.

## Running an Agent

```bash
python3 {baseDir}/scripts/run-agent.py path/to/agent.py "Your prompt here"
python3 {baseDir}/scripts/run-agent.py path/to/agent.py --interactive
```

## Model Providers Reference (11 total)

| Provider | Class | Init | Notes |
|----------|-------|------|-------|
| Bedrock | `BedrockModel` | `BedrockModel(model_id=...)` | **Default**, eagerly imported |
| Ollama | `OllamaModel` | `OllamaModel("http://host:11434", model_id=...)` | `host` is positional |
| Anthropic | `AnthropicModel` | `AnthropicModel(model_id=..., max_tokens=4096)` | `max_tokens` **required** |
| OpenAI | `OpenAIModel` | `OpenAIModel(model_id=...)` | `OPENAI_API_KEY` |
| Gemini | `GeminiModel` | `GeminiModel(model_id=...)` | `api_key` in client_args |
| Mistral | `MistralModel` | `MistralModel(model_id=...)` | Mistral API key |
| LiteLLM | `LiteLLMModel` | `LiteLLMModel(model_id=...)` | Meta-provider (Cohere, Groq, etc.) |
| LlamaAPI | `LlamaAPIModel` | `LlamaAPIModel(model_id=...)` | Meta Llama API |
| llama.cpp | `LlamaCppModel` | `LlamaCppModel(...)` | Local server, OpenAI-compatible |
| SageMaker | `SageMakerAIModel` | `SageMakerAIModel(...)` | Custom AWS endpoints |
| Writer | `WriterModel` | `WriterModel(model_id=...)` | Writer platform |

All non-Bedrock providers are **lazy-loaded** — dependencies imported only when referenced.

Import pattern: `from strands.models.<provider> import <Class>` (or `from strands.models import <Class>` for lazy-load).

## Tips

- `Agent()` without `model=` requires AWS credentials (Bedrock default)
- `AnthropicModel` requires `max_tokens` — omitting it causes a runtime error
- `OllamaModel` `host` is positional: `OllamaModel("http://...", model_id="...")`
- Abliterated Ollama models often lose tool-calling support — use stock models for tool-using agents
- Swarm agents need `name=` and `description=` for handoff routing
- `Agent(load_tools_from_directory=True)` watches `./tools/` for hot-reloaded tool files
- Use `agent.tool.my_tool()` to call tools directly without LLM routing
- `MCPClient` is a `ToolProvider` — pass it directly in `tools=[mcp]`, don't call `list_tools_sync()` manually when using with Agent
- Session managers work with Agent, Swarm, and Graph
- Pin your `strands-agents` version — the SDK is young and APIs evolve between releases
