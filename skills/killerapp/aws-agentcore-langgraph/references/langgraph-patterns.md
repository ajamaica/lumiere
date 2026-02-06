# LangGraph 1.0 Patterns

## State Definition

```python
from typing import Annotated
from typing_extensions import TypedDict
from langgraph.graph.message import add_messages

class State(TypedDict):
    messages: Annotated[list, add_messages]  # Accumulates
    current_step: str                         # Overwrites
```

Reducers: `add_messages` (built-in), `operator.add` (concat lists), `lambda a, b: a + b` (sum)

## Graph Building

```python
from langgraph.graph import StateGraph, START, END

builder = StateGraph(State)
builder.add_node("agent", agent_node)
builder.add_node("tools", ToolNode(tools))
builder.add_edge(START, "agent")
builder.add_edge("tools", "agent")
builder.add_conditional_edges("agent", tools_condition)  # Routes to "tools" or END
graph = builder.compile()
```

## Tools Pattern

```python
from langgraph.prebuilt import ToolNode, tools_condition
from langchain_core.tools import tool

@tool
def search(query: str) -> str:
    """Search the web."""
    return f"Results for: {query}"

tools = [search]
llm_with_tools = llm.bind_tools(tools)

def agent(state):
    return {"messages": [llm_with_tools.invoke(state["messages"])]}
```

## Command Pattern (State Updates from Tools)

```python
from langgraph.types import Command

@tool
def lookup_user(user_id: str) -> Command:
    return Command(update={"user_info": db.get(user_id), "messages": [...]})
```

## Checkpointing

```python
# In-memory (testing)
from langgraph.checkpoint.memory import InMemorySaver
graph = builder.compile(checkpointer=InMemorySaver())

# PostgreSQL (production)
from langgraph.checkpoint.postgres import AsyncPostgresSaver
async with AsyncPostgresSaver.from_conn_string(URL) as cp:
    graph = builder.compile(checkpointer=cp)

config = {"configurable": {"thread_id": "user-123"}}
result = graph.invoke(inputs, config)
```

State ops: `graph.get_state(config)`, `graph.get_state_history(config)`, `graph.update_state(config, {...})`

## Streaming

```python
# Updates only (recommended)
async for chunk in graph.astream(inputs, config, stream_mode="updates"):
    for node, output in chunk.items():
        print(f"{node}: {output}")
```

Modes: `"updates"` (changed keys), `"values"` (full state), `"messages"` (messages only)

## Migration Notes (1.0)

| Change                        | Notes                                           |
| ----------------------------- | ----------------------------------------------- |
| `create_react_agent`          | Deprecated, use `langchain.agents.create_agent` |
| `prompt=`                     | Changed to `system_prompt=`                     |
| Python 3.9                    | Requires 3.10+                                  |
| `ToolNode`, `tools_condition` | Still supported                                 |

## Best Practices

- **Compile once** at startup, not per-request
- **Use async** for production (`ainvoke`, `astream`)
- **Pure node functions** - return updates, don't mutate
- **Thread IDs** for multi-tenancy

## Documentation

| Resource      | URL                                                            |
| ------------- | -------------------------------------------------------------- |
| LangGraph     | https://langchain-ai.github.io/langgraph/                      |
| Concepts      | https://langchain-ai.github.io/langgraph/concepts/             |
| Checkpointing | https://langchain-ai.github.io/langgraph/concepts/persistence/ |
