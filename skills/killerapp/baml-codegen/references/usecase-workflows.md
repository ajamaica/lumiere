# Workflow & Agent Patterns

Building stateful agents and multi-step workflows with BAML.

## Agent Loop Pattern

### Core Schema

```baml
class State {
  context map<string, string>?
  last_result string?
  recent_messages Message[]
}

class Message {
  role Role
  content string
  timestamp int
}

enum Role {
  User
  Assistant
  Tool
}
```

### Tool Definitions with Discriminators

```baml
class GetWeatherReport {
  type "get_weather_report"
  location string
  @@stream.done  // Only stream when complete
}

class ComputeValue {
  type "compute_value"
  expression string
  @@stream.done
}

class MessageToUser {
  type "message_to_user"
  message string @stream.with_state  // Stream incrementally
}

class Resume {
  type "resume"
  @@stream.done
}
```

### Agent Function

```baml
function ChooseTools(
  state: State,
  query: Query
) -> (GetWeatherReport | ComputeValue | MessageToUser | Resume)[] {
  client GPT4
  prompt #"
    {{ Instructions() }}

    Current state: {{ state }}
    Current query: {{ query }}

    {{ ctx.output_format }}
  "#
}

template_string Instructions() #"
  You are a helpful assistant.

  Issue tool calls according to the schema.
  If you need results before continuing, end with a Resume call.

  IMPORTANT: Every tool call that needs client to update state
  should end in a resume call.
"#
```

### Python Agent Loop

```python
from baml_client import b
from baml_client.types import (
    GetWeatherReport, ComputeValue,
    MessageToUser, Resume, State, Query
)

state = State(recent_messages=[])

while True:
    user_input = input("> ")
    query = Query(message=user_input, timestamp=int(time.time()))

    tools = b.ChooseTools(state=state, query=query)

    for tool in tools:
        if isinstance(tool, GetWeatherReport):
            weather = fetch_weather(tool.location)
            state.context["weather"] = weather

        elif isinstance(tool, ComputeValue):
            result = safe_eval(tool.expression)
            state.last_result = str(result)

        elif isinstance(tool, MessageToUser):
            print(f"Assistant: {tool.message}")
            state.recent_messages.append(
                Message(role=Role.Assistant, content=tool.message)
            )

        elif isinstance(tool, Resume):
            # Loop will call ChooseTools again with updated state
            break
```

## State Machine Pattern

### Workflow States

```baml
enum WorkflowState {
  PENDING
  PROCESSING
  AWAITING_APPROVAL
  APPROVED
  REJECTED
  COMPLETED
}

class WorkflowTransition {
  from_state WorkflowState
  to_state WorkflowState
  reason string
}

function DetermineTransition(
  current: WorkflowState,
  context: string
) -> WorkflowTransition {
  client GPT4
  prompt #"
    Current workflow state: {{ current }}
    Context: {{ context }}

    Determine the next state transition.
    {{ ctx.output_format }}
  "#
}
```

## Multi-Step Extraction

For complex documents, extract in passes.

```baml
// Pass 1: Structure
class DocumentStructure {
  title string
  section_ids string[]
  has_tables bool
  has_images bool
}

function ExtractStructure(doc: string) -> DocumentStructure {
  client GPT4
  prompt #"Extract document structure: {{ doc }} {{ ctx.output_format }}"#
}

// Pass 2: Section details
class SectionContent {
  id string
  heading string
  summary string
  key_points string[]
}

function ExtractSection(
  doc: string,
  section_id: string
) -> SectionContent {
  client GPT4
  prompt #"
    Extract section {{ section_id }} from:
    {{ doc }}
    {{ ctx.output_format }}
  "#
}
```

**Python orchestration:**

```python
structure = b.ExtractStructure(doc)

sections = []
for section_id in structure.section_ids:
    section = b.ExtractSection(doc, section_id)
    sections.append(section)

complete_doc = combine(structure, sections)
```

## Streaming Agents

### Stream Control Decorators

```baml
class ImportantData @stream.done {
  // Only streams when fully parsed
  id string
  data string
}

class ProgressUpdate {
  status string @stream.not_null  // Must exist before streaming
  items ImportantData[]
}
```

### Async Streaming

```python
async def run_agent_streaming():
    stream = b.stream.ChooseTools(state=state, query=query)

    async for partial in stream:
        # Show progress as tools are selected
        for tool in partial:
            if isinstance(tool, MessageToUser) and tool.message:
                print(tool.message, end="", flush=True)

    final_tools = await stream.get_final_response()
    return final_tools
```

## Testing Workflows

```baml
test WeatherToolInit {
  functions [ChooseTools]
  args {
    state { recent_messages [] }
    query { message "What is the weather?" timestamp 1715222400 }
  }
  @@assert({{ this[0].type == "message_to_user" }})
  @@assert({{ this[0].message|regex_match("location") }})
  @@assert({{ this[1].type == "resume" }})
}

test WeatherAfterLocation {
  functions [ChooseTools]
  args {
    state {
      recent_messages [
        { role User content "Weather?" timestamp 1 },
        { role Assistant content "Where?" timestamp 2 },
        { role User content "Seattle" timestamp 3 }
      ]
    }
    query { message "Seattle" timestamp 4 }
  }
  @@assert({{ this[0].type == "get_weather_report" }})
}
```

## Example Projects

See complete agent implementations:

- `baml-examples/python-chatbot/server/baml_src/agent.baml` - Full agent with state, tools, and streaming
- `baml-examples/form-filler/` - Multi-turn form workflow

## Best Practices

1. **Discriminated unions** - Use `type "action_name"` for routing
2. **State immutability** - Return new state, don't mutate
3. **Resume pattern** - Use Resume tool to continue after state updates
4. **Stream control** - `@@stream.done` for atomic actions, `@stream.with_state` for progressive text
5. **Test state transitions** - Test each workflow state with `@@assert`
