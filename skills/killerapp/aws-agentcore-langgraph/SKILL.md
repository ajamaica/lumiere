---
name: aws-agentcore-langgraph
description: Deploy production LangGraph agents on AWS Bedrock AgentCore. Use for (1) multi-agent systems with orchestrator and specialist agent patterns, (2) building stateful agents with persistent cross-session memory, (3) connecting external tools via AgentCore Gateway (MCP, Lambda, APIs), (4) managing shared context across distributed agents, or (5) deploying complex agent ecosystems via CLI with production observability and scaling.
---

# AWS AgentCore + LangGraph

Multi-agent systems on AWS Bedrock AgentCore with LangGraph orchestration. Source: https://github.com/aws/bedrock-agentcore-starter-toolkit

## Install

```bash
pip install bedrock-agentcore bedrock-agentcore-starter-toolkit langgraph
uv tool install bedrock-agentcore-starter-toolkit  # installs agentcore CLI
```

## Quick Start

```python
from langgraph.graph import StateGraph, START
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition  # routing + tool execution
from bedrock_agentcore.runtime import BedrockAgentCoreApp
from typing import Annotated
from typing_extensions import TypedDict

class State(TypedDict):
    messages: Annotated[list, add_messages]

builder = StateGraph(State)
builder.add_node("agent", agent_node)
builder.add_node("tools", ToolNode(tools))  # prebuilt tool executor
builder.add_conditional_edges("agent", tools_condition)  # routes to tools or END
builder.add_edge(START, "agent")
graph = builder.compile()

app = BedrockAgentCoreApp()  # Wraps as HTTP service on port 8080 (/invocations, /ping)
@app.entrypoint
def invoke(payload, context):
    result = graph.invoke({"messages": [("user", payload.get("prompt", ""))]})
    return {"result": result["messages"][-1].content}
app.run()
```

## CLI Commands

| Command                                                                                | Purpose                         |
| -------------------------------------------------------------------------------------- | ------------------------------- |
| `agentcore configure -e agent.py --region us-east-1`                                   | Setup                           |
| `agentcore configure -e agent.py --region us-east-1 --name my_agent --non-interactive` | Scripted setup                  |
| `agentcore launch --deployment-type container`                                         | Deploy (container mode)         |
| `agentcore launch --disable-memory`                                                    | Deploy without memory subsystem |
| `agentcore dev`                                                                        | Hot-reload local dev server     |
| `agentcore invoke '{"prompt": "Hello"}'`                                               | Test                            |
| `agentcore destroy`                                                                    | Cleanup                         |

## Core Patterns

### Multi-Agent Orchestration

- Orchestrator delegates to specialists (customer service, e-commerce, healthcare, financial, etc.)
- Specialists: inline functions or separate deployed agents; all share `session_id` for context

### Memory (STM/LTM)

```python
from bedrock_agentcore.memory import MemoryClient
memory = MemoryClient()
memory.create_event(session_id, actor_id, event_type, payload)  # Store
events = memory.list_events(session_id)  # Retrieve (returns list)
```

- **STM**: Turn-by-turn within session | **LTM**: Facts/decisions across sessions/agents
- ~10s eventual consistency after writes

### Gateway Tools

```bash
python -m bedrock_agentcore.gateway.deploy --stack-name my-agents --region us-east-1
```

```python
from bedrock_agentcore.gateway import GatewayToolClient
gateway = GatewayToolClient()
result = gateway.call("tool_name", param1=value1, param2=value2)
```

- Transport: Fallback Mock (local), Local MCP servers, Production Gateway (Lambda/REST/MCP)
- Auto-configures `BEDROCK_AGENTCORE_GATEWAY_URL` after deploy

## Decision Tree

```
Multiple agents coordinating? → Orchestrator + specialists pattern
Persistent cross-session memory? → AgentCore Memory (not LangGraph checkpoints)
External APIs/Lambda? → AgentCore Gateway
Single agent, simple? → Quick Start above
Complex multi-step logic? → StateGraph + tools_condition + ToolNode
```

## Key Concepts

- **AgentCore Runtime**: HTTP service on port 8080 (handles `/invocations`, `/ping`)
- **AgentCore Memory**: Managed cross-session/cross-agent memory
- **LangGraph Routing**: `tools_condition` for agent→tool routing, `ToolNode` for execution
- **AgentCore Gateway**: Transforms APIs/Lambda into MCP tools with auth

## Naming Rules

- Start with letter, only letters/numbers/underscores, 1-48 chars: `my_agent` not `my-agent`

## Troubleshooting

| Issue                                  | Fix                                                            |
| -------------------------------------- | -------------------------------------------------------------- |
| `on-demand throughput isn't supported` | Use `us.anthropic.claude-*` inference profiles                 |
| `Model use case details not submitted` | Fill Anthropic form in Bedrock Console                         |
| `Invalid agent name`                   | Use underscores not hyphens                                    |
| Memory empty after write               | Wait ~10s (eventual consistency)                               |
| Container not reading .env             | Set ENV in Dockerfile, not .env                                |
| Memory not working after deploy        | Check logs for "Memory enabled/disabled"                       |
| `list_events` returns empty            | Check actor_id/session_id match; `event['payload']` is a list  |
| Gateway "Unknown tool"                 | Lambda must strip `___` prefix from `bedrockAgentCoreToolName` |
| Platform mismatch warning              | Normal - CodeBuild handles ARM64 cross-platform builds         |

## References

- [agentcore-cli.md](references/agentcore-cli.md) - CLI commands, deployment, lifecycle
- [agentcore-runtime.md](references/agentcore-runtime.md) - Streaming, async, observability
- [agentcore-memory.md](references/agentcore-memory.md) - STM/LTM patterns, API reference
- [agentcore-gateway.md](references/agentcore-gateway.md) - Tool integration, MCP, Lambda
- [langgraph-patterns.md](references/langgraph-patterns.md) - StateGraph design, routing
- [reference-architecture-advertising-agents-use-case.pdf](references/reference-architecture-advertising-agents-use-case.pdf) - Example multi-agent architecture
