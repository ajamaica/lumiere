# LangGraph + BAML Integration Reference

**Last Updated**: 2025-12-25
**Source**: BAML-REFERENCE-SOURCE.md (BoundaryML official gist), Hekmatica project, BoundaryML documentation

---

## Complementary Architecture

**LangGraph's Role**: Orchestration engine for complex agent workflows

- `StateGraph` coordinates data flow between processing steps
- Manages state transitions and conditional routing
- Handles cycles, loops, and multi-agent coordination
- Provides streaming infrastructure for real-time updates

**BAML's Role**: Type-safe LLM interaction layer

- Defines all LLM calls as typed functions with validated schemas
- Provides structured output parsing with fuzzy JSON handling
- Manages retries, fallbacks, and multi-provider resilience
- Separates prompts from orchestration code for maintainability

**Integration Pattern**:

```
LangGraph manages: WHEN to call LLMs, WHERE in the workflow
BAML defines: WHAT those LLM calls look like, HOW outputs are validated
```

---

## Why BAML + LangGraph

| LangGraph Provides       | BAML Provides           |
| ------------------------ | ----------------------- |
| Graph orchestration      | Type-safe LLM calls     |
| State management         | Schema validation       |
| Conditional routing      | Fuzzy JSON parsing      |
| Cycles and loops         | Retry/fallback handling |
| Streaming infrastructure | Structured streaming    |

**Key Benefit**: Clean separation of concerns

- `agent.py` (LangGraph) stays focused on workflow logic
- `baml_src/` contains all LLM prompts and schemas
- Type safety across the entire pipeline
- Testable LLM functions independent of graph execution

---

## Basic Integration Pattern

### 1. State Definition

```python
from typing import TypedDict
from baml_client.types import ToolCall, ExtractedData

class AgentState(TypedDict):
    messages: list[dict]
    extracted: ExtractedData | None
    tool_calls: list[ToolCall]
    iteration: int
```

### 2. BAML Functions as Graph Nodes

BAML functions can be called directly from LangGraph nodes:

```python
from langgraph.graph import StateGraph
from baml_client import b

def extract_node(state: AgentState) -> AgentState:
    """Use BAML for structured extraction."""
    result = b.ExtractData(state["messages"][-1]["content"])
    return {"extracted": result}

def route_node(state: AgentState) -> AgentState:
    """Use BAML union types for tool selection."""
    tools = b.SelectTools(state["messages"][-1]["content"])
    return {"tool_calls": tools}

# Build graph
graph = StateGraph(AgentState)
graph.add_node("extract", extract_node)
graph.add_node("route", route_node)
```

### 3. Union Types for Conditional Routing

BAML's union return types integrate naturally with LangGraph's routing:

```python
from baml_client.types import GetWeather, SearchWeb, Calculator

def route_by_tool(state: AgentState) -> str:
    """Route based on BAML union type discriminator."""
    if not state["tool_calls"]:
        return "end"

    tool = state["tool_calls"][0]
    if isinstance(tool, GetWeather):
        return "weather_node"
    elif isinstance(tool, SearchWeb):
        return "search_node"
    elif isinstance(tool, Calculator):
        return "calc_node"
    return "end"

graph.add_conditional_edges("route", route_by_tool)
```

---

## BAML Schemas for LangGraph

### Tool Selection with Union Types

Union return types are ideal for tool selection and routing:

```baml
class GetWeather {
  type "get_weather"
  location string
  @@stream.done  // Stream atomically when complete
}

class SearchWeb {
  type "search"
  query string
  @@stream.done
}

class MessageToUser {
  type "message"
  content string @stream.with_state  // Stream with completion state
}

class Resume {
  type "resume"
  @@stream.done
}

function SelectAction(
  state: string,
  query: string
) -> (GetWeather | SearchWeb | MessageToUser | Resume)[] {
  client "openai/gpt-4o"
  prompt #"
    {{ _.role("system") }}
    You are an agent that selects actions based on user queries.
    Current state: {{ state }}

    {{ _.role("user") }}
    Query: {{ query }}

    {{ ctx.output_format }}
  "#
}
```

### State Extraction and Updates

Extract structured state from unstructured conversation:

```baml
class AgentState {
  context string?
  last_tool_result string?
  iteration int
  next_action "continue" | "stop" | "retry"
}

function ParseState(messages: string[]) -> AgentState {
  client "openai/gpt-4o"
  prompt #"
    Extract agent state from conversation history:

    {% for msg in messages %}
    {{ msg }}
    {% endfor %}

    {{ ctx.output_format }}
  "#
}
```

---

## TypeBuilder for Dynamic Schemas

`TypeBuilder` enables runtime schema modification based on graph state - powerful for adaptive agents:

### Dynamic Schema from Graph State

```python
from baml_client.type_builder import TypeBuilder
from baml_client import b

def adaptive_extraction_node(state: AgentState) -> AgentState:
    """Adapt schema based on discovered data."""
    tb = TypeBuilder()

    # Add dynamic categories from previous results
    for category in state.get("discovered_categories", []):
        tb.Category.add_value(category)

    # Add dynamic fields based on context
    if state.get("needs_location"):
        tb.User.add_property("location", tb.string())

    if state.get("needs_preferences"):
        tb.User.add_property("preferences", tb.string().list())

    # Call BAML with dynamic schema
    result = b.ExtractUser(state["input"], {"tb": tb})
    return {"extracted_user": result}
```

### Database-Driven Schemas

```python
def db_driven_node(state: AgentState) -> AgentState:
    """Build schema from database configuration."""
    tb = TypeBuilder()

    # Fetch valid categories from database
    categories = fetch_categories_from_db()
    for cat in categories:
        tb.ProductCategory.add_value(cat)

    # Fetch custom fields from user config
    custom_fields = fetch_user_schema_config(state["user_id"])
    for field_name, field_type in custom_fields.items():
        tb.Product.add_property(field_name, getattr(tb, field_type)())

    result = b.ClassifyProduct(state["product_description"], {"tb": tb})
    return {"classified": result}
```

### BAML Schema with @@dynamic

```baml
enum ProductCategory {
  ELECTRONICS
  CLOTHING
  @@dynamic  // Allows runtime additions
}

class Product {
  name string
  price float
  category ProductCategory
  @@dynamic  // Allows runtime field additions
}

function ClassifyProduct(description: string) -> Product {
  client "openai/gpt-4o"
  prompt #"
    Classify this product: {{ description }}
    {{ ctx.output_format }}
  "#
}
```

---

## Streaming Integration

BAML's structured streaming works seamlessly with LangGraph's streaming capabilities:

### Basic Streaming Node

```python
async def streaming_node(state: AgentState):
    """Stream BAML responses through LangGraph."""
    stream = b.stream.GenerateResponse(state["messages"])

    async for partial in stream:
        # Yield partial results for real-time UI updates
        yield {"partial_response": partial.content}

    final = await stream.get_final_response()
    return {"response": final}
```

### Semantic Streaming Attributes

Control streaming behavior with BAML attributes:

```baml
class BlogPost {
  // Post won't stream until title is complete
  title string @stream.done @stream.not_null

  // Content streams token-by-token with state tracking
  content string @stream.with_state

  // Tags only appear when fully parsed
  tags string[] @stream.done

  // Author info streams when complete
  author Author @stream.done
}

class Author {
  name string
  bio string
}

function WriteBlogPost(topic: string) -> BlogPost {
  client "openai/gpt-4o"
  prompt #"
    Write a blog post about: {{ topic }}
    {{ ctx.output_format }}
  "#
}
```

### Advanced Streaming with State

```python
async def advanced_streaming_node(state: AgentState):
    """Stream with completion state tracking."""
    stream = b.stream.WriteBlogPost(state["topic"])

    async for partial in stream:
        # partial.title is None until complete
        # partial.content has StreamState wrapper with completion status
        if hasattr(partial, 'content') and partial.content:
            progress = {
                "value": partial.content.value,
                "state": partial.content.state  # "Pending" | "Incomplete" | "Complete"
            }
            yield {"streaming_content": progress}

    final = await stream.get_final_response()
    return {"blog_post": final}
```

### Stream Mode Integration

LangGraph supports multiple stream modes - combine with BAML streaming:

```python
# LangGraph stream modes: "values", "updates", "messages", "custom", "debug"
async for chunk in graph.astream(
    {"input": user_query},
    stream_mode="updates"  # Get node-by-node updates
):
    node_name = list(chunk.keys())[0]
    node_output = chunk[node_name]

    # Handle BAML streaming outputs
    if "partial_response" in node_output:
        print(f"Streaming from {node_name}: {node_output['partial_response']}")
```

---

## Real-World Example: Research Agent

**10-Step Research Workflow** (inspired by [Hekmatica](https://github.com/kargarisaac/Hekmatica)):

1. **Clarification** (BAML) - Extract user intent and constraints
2. **User Interaction** (LangGraph) - Conditional routing based on clarity
3. **Query Decomposition** (BAML) - Break complex questions into sub-queries
4. **Planning** (BAML) - Generate research plan with typed steps
5. **Information Gathering** (Python tools) - Web search, API calls
6. **Filtering** (BAML) - Rank/filter results by relevance
7. **Answer Synthesis** (BAML) - Generate structured response with citations
8. **Self-Critique** (BAML) - Evaluate answer quality
9. **Refinement** (LangGraph conditional) - Iterate if quality insufficient
10. **Completion** (LangGraph) - Return final result

**Architecture Split**:

- **LangGraph (agent.py)**: Orchestration (steps 2, 5, 9, 10)
- **BAML (baml_src/)**: Cognitive tasks (steps 1, 3, 4, 6, 7, 8)
- **Python Tools**: External actions (step 5)

**Key Insight**: BAML handles 6/10 steps - all involving LLM reasoning. LangGraph handles state transitions, routing, and tool execution.

---

## Migration from Pure LangGraph

### Before: String Prompts

```python
def planning_node(state: dict) -> dict:
    response = llm.invoke([
        SystemMessage("You are a planner. Output JSON with fields: steps, priority"),
        HumanMessage(state["query"])
    ])
    # Fragile parsing
    plan = json.loads(response.content)
    return {"plan": plan}
```

### After: BAML Integration

```baml
// baml_src/planner.baml
class Plan {
  steps string[]
  priority "high" | "medium" | "low"
  estimated_time_minutes int?
}

function CreatePlan(query: string) -> Plan {
  client "openai/gpt-4o"
  prompt #"
    {{ _.role("system") }}
    You are a research planning expert.

    {{ _.role("user") }}
    Create a research plan for: {{ query }}

    {{ ctx.output_format }}
  "#
}
```

```python
# agent.py
from baml_client import b

def planning_node(state: dict) -> dict:
    plan = b.CreatePlan(state["query"])  # Type-safe!
    return {"plan": plan}
```

**Benefits**:

- Type safety: `plan.steps` is guaranteed `list[str]`
- Fuzzy parsing: Handles messy LLM output automatically
- Centralized prompts: All in `baml_src/`, version controlled
- Testable: `baml-cli test` without running full graph
- Prompts separate from code: Easier iteration by prompt engineers

### Migration Checklist

- [ ] Identify all LLM calls in LangGraph nodes
- [ ] Extract prompts to `.baml` files with type definitions
- [ ] Replace `llm.invoke()` with `b.FunctionName()`
- [ ] Keep LangGraph for orchestration (don't change graph structure)
- [ ] Run `baml-cli generate` to create client
- [ ] Update imports: `from baml_client import b`
- [ ] Test nodes individually with `baml-cli test`
- [ ] Test full graph integration

---

## Common Patterns

### 1. Message Formatting

```baml
class Message {
  role "user" | "assistant" | "system"
  content string
}

function SummarizeConversation(history: Message[]) -> string {
  client "openai/gpt-4o"
  prompt #"
    {{ _.role("system") }}
    Summarize the conversation concisely.

    {% for msg in history %}
      {{ _.role(msg.role) }}
      {{ msg.content }}
    {% endfor %}

    {{ ctx.output_format }}
  "#
}
```

### 2. State Update Decisions

```baml
class StateUpdate {
  new_context string?
  iteration_complete bool
  next_action "continue" | "stop" | "retry"
  reasoning string @description("Why this action was chosen")
}

function DecideNextAction(
  current_state: string,
  latest_result: string
) -> StateUpdate {
  client "openai/gpt-4o"
  prompt #"
    {{ _.role("system") }}
    You are a decision engine for a research agent.

    Current state: {{ current_state }}
    Latest result: {{ latest_result }}

    Decide the next action.

    {{ ctx.output_format }}
  "#
}
```

### 3. Multi-Step Reasoning

```baml
class ReasoningStep {
  thought string
  action "search" | "analyze" | "conclude"
  confidence "high" | "medium" | "low"
}

class ReasoningChain {
  steps ReasoningStep[]
  final_conclusion string
}

function ReasonAboutQuery(query: string, context: string) -> ReasoningChain {
  client "openai/gpt-4o"
  prompt #"
    {{ _.role("system") }}
    Break down your reasoning into explicit steps.

    Query: {{ query }}
    Context: {{ context }}

    {{ ctx.output_format }}
  "#
}
```

---

## Performance Optimization

### When to Use BAML in LangGraph

**✅ Use BAML for**:

- Any LLM call requiring structured output
- Tool selection/routing decisions (union types)
- State parsing and updates
- Multi-step reasoning with validation
- Data extraction with complex schemas
- Classification and categorization tasks

**⚠️ Keep in LangGraph**:

- Simple string responses (no structure needed)
- State management (TypedDict containers)
- Conditional routing logic (Python `isinstance` checks)
- External tool execution (web search, DB queries)
- Non-LLM computations

### Optimization Tips

**1. Cache BAML Client Initialization**

```python
from baml_client import b  # Initialize once at module level

def node_function(state):
    return b.Extract(state["data"])  # Reuse client
```

**2. Async for Parallel Nodes**

```python
import asyncio

async def parallel_extraction(state):
    results = await asyncio.gather(
        b.ExtractA(state["doc_a"]),
        b.ExtractB(state["doc_b"]),
        b.ExtractC(state["doc_c"])
    )
    return {"results": results}
```

**3. Use Streaming for Long Operations**

```python
async def long_running_node(state):
    stream = b.stream.ComplexExtraction(state["large_doc"])

    async for partial in stream:
        # Update state incrementally for responsive UX
        yield {"progress": partial}

    final = await stream.get_final_response()
    return {"result": final}
```

**4. Leverage Retry Policies**

```baml
// baml_src/clients.baml
retry_policy AgentRetry {
  max_retries 3
  strategy {
    type exponential_backoff
    delay_ms 200
    multiplier 1.5
    max_delay_ms 10000
  }
}

client<llm> ResilientGPT {
  provider openai
  retry_policy AgentRetry
  options {
    model "gpt-4o"
  }
}
```

**5. Use Fallback for Reliability**

```baml
client<llm> PrimaryModel {
  provider openai
  options { model "gpt-4o" }
}

client<llm> BackupModel {
  provider anthropic
  options { model "claude-sonnet-4-20250514" }
}

client<llm> ResilientAgent {
  provider fallback
  options {
    strategy [PrimaryModel, BackupModel]
  }
}
```

---

## Troubleshooting

### Issue: BAML Types Don't Match LangGraph State

**Problem**: `TypedDict` vs Pydantic model mismatch

**Solution**: Convert at boundaries

```python
from baml_client.types import ExtractedData

def baml_node(state: TypedDict) -> dict:
    result: ExtractedData = b.Extract(state["text"])

    # Convert Pydantic → dict for LangGraph state
    return {"extracted": result.model_dump()}

# Or keep as Pydantic if LangGraph state accepts it
def baml_node_alt(state: TypedDict) -> dict:
    result: ExtractedData = b.Extract(state["text"])
    return {"extracted": result}  # LangGraph can handle Pydantic
```

### Issue: Streaming Not Working in Graph

**Problem**: LangGraph requires generators for streaming

**Solution**: Use `yield` with BAML streams

```python
async def node(state):
    stream = b.stream.Function(state["input"])

    async for partial in stream:
        yield {"partial": partial.model_dump()}  # Must yield

    final = await stream.get_final_response()
    yield {"final": final.model_dump()}
```

### Issue: TypeBuilder Changes Not Reflected

**Problem**: TypeBuilder modifications not appearing in output schema

**Solution**: Ensure type is marked `@@dynamic` in BAML

```baml
enum Category {
  DEFAULT_VALUE
  @@dynamic  // Required for TypeBuilder
}

class DynamicClass {
  base_field string
  @@dynamic  // Required for adding properties
}
```

### Issue: Graph State Too Large for Context

**Problem**: Entire state passed to BAML function exceeds context limits

**Solution**: Extract only relevant state

```python
def smart_node(state: AgentState) -> AgentState:
    # Don't pass entire state to BAML
    # Extract only what's needed
    relevant_context = {
        "last_message": state["messages"][-1],
        "iteration": state["iteration"]
    }
    result = b.MakeDecision(relevant_context)
    return {"decision": result}
```

---

## Best Practices Summary

1. **BAML for LLM Nodes** - Use BAML functions for any node that calls an LLM
2. **Type Guards for Routing** - Use `isinstance()` with BAML union types for clean routing
3. **State Types Aligned** - Keep LangGraph state types aligned with BAML types
4. **Stream for UX** - Use `b.stream.FunctionName()` for long-running extractions
5. **Separate Concerns** - LangGraph orchestrates, BAML handles LLM interactions
6. **Test Independently** - Use `baml-cli test` to test LLM functions before graph integration
7. **Version Prompts** - Keep prompts in `baml_src/` under version control
8. **Use TypeBuilder** - Leverage dynamic schemas for adaptive agents
9. **Async First** - Use async/await for better concurrency in graphs
10. **Handle Boundaries** - Convert Pydantic ↔ dict at LangGraph/BAML boundaries

---

## References

### Official Documentation

- [BAML Documentation](https://docs.boundaryml.com/home)
- [BAML Streaming Guide](https://docs.boundaryml.com/guide/baml-basics/streaming)
- [TypeBuilder Reference](https://docs.boundaryml.com/ref/baml_client/type-builder)
- [Dynamic Types Guide](https://docs.boundaryml.com/guide/baml-advanced/dynamic-types)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [LangGraph Streaming](https://docs.langchain.com/oss/python/langgraph/streaming)

### Example Projects

- [Hekmatica Research Agent](https://github.com/kargarisaac/Hekmatica) - Production BAML + LangGraph integration
- [BAML Examples Repository](https://github.com/BoundaryML/baml-examples) - Official examples

### Community Resources

- [BAML is Building Blocks for AI Engineers](https://thedataquarry.com/blog/baml-is-building-blocks-for-ai-engineers/)
- [BoundaryML GitHub](https://github.com/BoundaryML)

---

**Last Updated**: 2025-12-25
**BAML Version**: 0.76.2+
**LangGraph Version**: Compatible with latest LangChain ecosystem
