# AgentCore Memory Integration

## Memory Types

| Type                    | Scope           | Use Case                  |
| ----------------------- | --------------- | ------------------------- |
| Short-Term (STM)        | Within session  | Turn-by-turn conversation |
| Long-Term (LTM)         | Across sessions | User preferences, facts   |
| LangGraph Checkpointing | Per thread      | Graph state persistence   |

## Short-Term Memory API

```python
from bedrock_agentcore.memory import MemoryClient
client = MemoryClient(region_name="us-east-1")

# Store event
client.create_event(
    memory_id=memory_id, actor_id="user-123", session_id="session-abc",
    messages=[("Question?", "USER"), ("Answer.", "ASSISTANT")]
)

# Retrieve - returns LIST directly (not dict)
events = client.list_events(memory_id=memory_id, actor_id="user-123", session_id="session-abc")
```

**Event structure**: `events` is a list; each event's `payload` is also a LIST of messages.

**CRITICAL**: ~10 second eventual consistency delay after `create_event`.

## Parsing Events

```python
for event in events:
    for msg in event.get("payload", []):
        if "conversational" in msg:
            role = msg["conversational"].get("role", "").lower()
            content = msg["conversational"].get("content", {}).get("text", "")
```

## Memory ID Injection

Toolkit auto-injects `BEDROCK_AGENTCORE_MEMORY_ID` via `agentcore launch`. Access with:

```python
memory_id = os.getenv("BEDROCK_AGENTCORE_MEMORY_ID")
```

## CLI Commands

| Command                                              | Purpose       |
| ---------------------------------------------------- | ------------- |
| `agentcore memory create --name NAME --strategy STM` | Create memory |
| `agentcore memory list`                              | List memories |
| `agentcore memory get --memory-id ID`                | Get details   |
| `agentcore memory delete --memory-id ID`             | Delete        |

## Production Checkpointers

```python
# PostgreSQL (recommended)
from langgraph.checkpoint.postgres import AsyncPostgresSaver
async with AsyncPostgresSaver.from_conn_string(DATABASE_URL) as checkpointer:
    graph = builder.compile(checkpointer=checkpointer)

# SQLite (local dev)
from langgraph.checkpoint.sqlite import SqliteSaver
checkpointer = SqliteSaver.from_conn_string("checkpoints.db")
```

Install: `pip install langgraph-checkpoint-postgres` (or `-sqlite`, `-redis`)

## Environment Variables

| Variable                        | Source        |
| ------------------------------- | ------------- |
| `BEDROCK_AGENTCORE_MEMORY_ID`   | Auto-injected |
| `BEDROCK_AGENTCORE_MEMORY_NAME` | Auto-injected |

Custom: `agentcore launch --env GUARDRAIL_ID="xyz"`

## Episodic Memory (Dec 2025)

Agents learn from experiences across sessions. Auto-enabled with LTM. Available: US/EU/APAC regions.

## Documentation

| Resource          | URL                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------ |
| Memory Overview   | https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory.html            |
| Memory Strategies | https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory-strategies.html |
