# Advanced BAML Patterns

Complex extraction scenarios including hierarchical structures, dynamic types, tool calling, streaming, multimodal inputs, and runtime type modification.

## Union Return Types for Tool Selection

Union types enable LLM-based function routing and tool selection by allowing functions to return one of several possible types.

### Single Tool Selection

```baml
class SearchQuery {
  query string
}

class WeatherRequest {
  city string
  units "celsius" | "fahrenheit"
}

class CalendarEvent {
  title string
  date string
}

// LLM determines which tool to use based on user input
function RouteRequest(input: string) -> SearchQuery | WeatherRequest | CalendarEvent {
  client "openai/gpt-4o"
  prompt #"
    Determine what the user wants and extract the appropriate data.

    {{ _.role("user") }}
    {{ input }}

    {{ ctx.output_format }}
  "#
}
```

### Multiple Tool Selection

```baml
class GetWeather {
  location string
  units "celsius" | "fahrenheit"
}

class SearchWeb {
  query string
  max_results int
}

class Calculator {
  expression string
}

// Returns array of tools for multi-step workflows
function SelectTools(query: string) -> (GetWeather | SearchWeb | Calculator)[] {
  client "openai/gpt-4o"
  prompt #"
    Select ALL tools needed to answer: {{ query }}
    {{ ctx.output_format }}
  "#
}
```

### Using Tool Results in Code

**Python:**

```python
from baml_client import b
from baml_client.types import GetWeather, SearchWeb, Calculator

result = b.RouteRequest("What's the weather in Seattle?")

if isinstance(result, GetWeather):
    weather_data = fetch_weather(result.location, result.units)
elif isinstance(result, SearchWeb):
    search_results = search(result.query, result.max_results)
elif isinstance(result, Calculator):
    answer = evaluate(result.expression)
```

**TypeScript:**

```typescript
import { b } from './baml_client'
import type { GetWeather, SearchWeb, Calculator } from './baml_client/types'

const result = await b.RouteRequest("What's the weather in Seattle?")

if ('location' in result) {
  // GetWeather
  const weather = await fetchWeather(result.location, result.units)
} else if ('query' in result) {
  // SearchWeb
  const results = await search(result.query, result.max_results)
} else {
  // Calculator
  const answer = evaluate(result.expression)
}
```

## Chat History Pattern

The Message class pattern enables multi-turn conversational interfaces with proper role management.

### Message Class Definition

```baml
class Message {
  role "user" | "assistant"
  content string
}

function Chat(messages: Message[]) -> string {
  client "openai/gpt-4o"
  prompt #"
    {{ _.role("system") }}
    You are a helpful assistant.

    {% for message in messages %}
      {{ _.role(message.role) }}
      {{ message.content }}
    {% endfor %}

    {{ ctx.output_format }}
  "#
}
```

### Usage in Application Code

**Python:**

```python
from baml_client import b
from baml_client.types import Message

conversation = [
    Message(role="user", content="What is BAML?"),
    Message(role="assistant", content="BAML is a type-safe DSL for LLM prompts."),
    Message(role="user", content="How do I install it?")
]

response = b.Chat(messages=conversation)
print(response)
```

**TypeScript:**

```typescript
import { b } from './baml_client'
import type { Message } from './baml_client/types'

const conversation: Message[] = [
  { role: 'user', content: 'What is BAML?' },
  { role: 'assistant', content: 'BAML is a type-safe DSL for LLM prompts.' },
  { role: 'user', content: 'How do I install it?' },
]

const response = await b.Chat(conversation)
console.log(response)
```

## Template Strings

Template strings are reusable prompt snippets that can be composed into larger prompts.

### Basic Template String

```baml
template_string FormatMessages(messages: Message[]) #"
  {% for m in messages %}
    {{ _.role(m.role) }}
    {{ m.content }}
  {% endfor %}
"#

function Chat(messages: Message[]) -> string {
  client "openai/gpt-4o"
  prompt #"
    {{ _.role("system") }}
    You are a helpful assistant.

    {{ FormatMessages(messages) }}

    {{ ctx.output_format }}
  "#
}
```

### Reusable Context Templates

```baml
template_string SystemContext() #"
  {{ _.role("system") }}
  You are an expert data analyst.
  Always show your reasoning step by step.
"#

template_string OutputGuidelines() #"
  Be concise and precise.
  Use technical terminology appropriately.
"#

function AnalyzeData(data: string) -> string {
  client "openai/gpt-4o"
  prompt #"
    {{ SystemContext() }}
    {{ OutputGuidelines() }}

    {{ _.role("user") }}
    Analyze: {{ data }}

    {{ ctx.output_format }}
  "#
}
```

## Streaming with Semantic Attributes

BAML supports structured streaming with automatic partial JSON parsing and fine-grained control over field streaming behavior.

### Streaming Attributes

| Attribute            | Effect                             | Use Case                           |
| -------------------- | ---------------------------------- | ---------------------------------- |
| `@stream.done`       | Field only appears when complete   | Atomic values, IDs, complete items |
| `@stream.not_null`   | Parent object waits for this field | Discriminators, required fields    |
| `@stream.with_state` | Adds completion state metadata     | UI loading indicators              |

### Field-Level Streaming Control

```baml
class BlogPost {
  // Post won't stream until title is complete
  title string @stream.done @stream.not_null

  // Content streams token-by-token with state tracking
  content string @stream.with_state

  // Tags only appear when fully parsed
  tags string[] @stream.done

  // Author streams normally (partial strings allowed)
  author string
}
```

### Class-Level Streaming Control

```baml
// Entire item streams atomically (all-or-nothing)
class ReceiptItem {
  name string
  price float
  quantity int
  @@stream.done
}

class Receipt {
  store string
  items ReceiptItem[]  // Each item appears only when complete
  total float @stream.done
}
```

### Discriminated Union Streaming

```baml
class Message {
  // Message won't stream until type is known
  type "error" | "success" @stream.not_null
  content string
  code int?
}
```

### StreamState with @stream.with_state

When using `@stream.with_state`, the field is wrapped in a `StreamState` object:

```typescript
interface StreamState<T> {
  value: T
  state: 'Pending' | 'Incomplete' | 'Complete'
}
```

### Basic Streaming Usage

**Python:**

```python
from baml_client import b

stream = b.stream.GenerateBlogPost("AI safety")

for partial in stream:
    # partial is a BlogPost with nullable fields
    if partial.title:
        print(f"Title: {partial.title}")
    if partial.content:
        print(f"Content so far: {partial.content[:100]}...")

# Get complete validated object
final = stream.get_final_response()
print(f"Final post: {final.title} - {len(final.content)} chars")
```

**TypeScript:**

```typescript
import { b } from './baml_client'

const stream = b.stream.GenerateBlogPost('AI safety')

for await (const partial of stream) {
  // partial is Partial<BlogPost>
  if (partial.title) {
    console.log(`Title: ${partial.title}`)
  }
  if (partial.content) {
    console.log(`Content: ${partial.content.substring(0, 100)}...`)
  }
}

const final = await stream.getFinalResponse()
console.log(`Final: ${final.title} - ${final.content.length} chars`)
```

## TypeBuilder (Dynamic Types at Runtime)

`TypeBuilder` allows you to modify output schemas at runtime - useful for dynamic categories from databases, user-provided schemas, or A/B testing.

### Mark Types as @@dynamic

```baml
enum Category {
  RED
  BLUE
  @@dynamic  // Allows runtime modification
}

class User {
  name string
  age int
  @@dynamic  // Allows adding properties at runtime
}

function Categorize(input: string) -> Category {
  client "openai/gpt-4o"
  prompt #"
    Categorize: {{ input }}
    {{ ctx.output_format }}
  "#
}
```

### Modify Types at Runtime

**Python:**

```python
from baml_client.type_builder import TypeBuilder
from baml_client import b

tb = TypeBuilder()

# Add enum values from database
tb.Category.add_value('GREEN')
tb.Category.add_value('YELLOW')

# Add class properties dynamically
tb.User.add_property('email', tb.string())
tb.User.add_property('address', tb.string().optional())

# Pass TypeBuilder when calling function
result = b.Categorize("The grass is lush", {"tb": tb})
# result can now be 'GREEN', 'YELLOW', 'RED', or 'BLUE'
```

**TypeScript:**

```typescript
import { TypeBuilder } from './baml_client/type_builder'
import { b } from './baml_client'

const tb = new TypeBuilder()

// Add enum values
tb.Category.addValue('GREEN')
tb.Category.addValue('YELLOW')

// Add class properties
tb.User.addProperty('email', tb.string())
tb.User.addProperty('address', tb.string().optional())

// Pass TypeBuilder when calling function
const result = await b.Categorize('The grass is lush', { tb })
```

### Create New Types at Runtime

```python
from baml_client.type_builder import TypeBuilder
from baml_client import b

tb = TypeBuilder()

# Create a new enum
hobbies = tb.add_enum("Hobbies")
hobbies.add_value("Soccer")
hobbies.add_value("Reading")
hobbies.add_value("Gaming")

# Create a new class
address = tb.add_class("Address")
address.add_property("street", tb.string())
address.add_property("city", tb.string())
address.add_property("zip_code", tb.string())

# Attach to existing dynamic type
tb.User.add_property("hobbies", hobbies.type().list())
tb.User.add_property("address", address.type())

result = b.ExtractUser(text, {"tb": tb})
```

### TypeBuilder Methods

| Method                      | Description           |
| --------------------------- | --------------------- |
| `tb.string()`               | String type           |
| `tb.int()`                  | Integer type          |
| `tb.float()`                | Float type            |
| `tb.bool()`                 | Boolean type          |
| `tb.string().list()`        | List of strings       |
| `tb.string().optional()`    | Optional string       |
| `tb.add_class("Name")`      | Create new class      |
| `tb.add_enum("Name")`       | Create new enum       |
| `.add_property(name, type)` | Add property to class |
| `.add_value(name)`          | Add value to enum     |
| `.description("...")`       | Add description       |

## ClientRegistry (Dynamic Client Selection)

`ClientRegistry` allows you to modify LLM clients at runtime - useful for A/B testing, dynamic model selection, user-specific API keys, or cost optimization.

### Basic Usage

**Python:**

```python
from baml_py import ClientRegistry
from baml_client import b
import os

cr = ClientRegistry()

# Add a new client with custom configuration
cr.add_llm_client(
    name='MyCustomClient',
    provider='openai',
    options={
        "model": "gpt-4o",
        "temperature": 0.7,
        "max_tokens": 2000,
        "api_key": os.environ.get('OPENAI_API_KEY')
    }
)

# Set as the primary client for this call
cr.set_primary('MyCustomClient')

# Use the registry
result = b.ExtractResume(resume_text, {"client_registry": cr})
```

**TypeScript:**

```typescript
import { ClientRegistry } from '@boundaryml/baml'
import { b } from './baml_client'

const cr = new ClientRegistry()

// Add a new client
cr.addLlmClient('MyCustomClient', 'openai', {
  model: 'gpt-4o',
  temperature: 0.7,
  max_tokens: 2000,
  api_key: process.env.OPENAI_API_KEY,
})

// Set as the primary client
cr.setPrimary('MyCustomClient')

// Use the registry
const result = await b.ExtractResume(resumeText, { clientRegistry: cr })
```

### Runtime Model Selection

```python
from baml_py import ClientRegistry
from baml_client import b

def process_with_model(text: str, use_premium: bool):
    cr = ClientRegistry()

    if use_premium:
        cr.add_llm_client('SelectedModel', 'openai', {
            "model": "gpt-4o",
            "temperature": 0.3
        })
    else:
        cr.add_llm_client('SelectedModel', 'openai', {
            "model": "gpt-4o-mini",
            "temperature": 0.5
        })

    cr.set_primary('SelectedModel')
    return b.ExtractData(text, {"client_registry": cr})
```

### User-Specific API Keys

```python
from baml_py import ClientRegistry

def extract_for_user(text: str, user_api_key: str):
    cr = ClientRegistry()

    cr.add_llm_client('UserClient', 'openai', {
        "model": "gpt-4o",
        "api_key": user_api_key
    })

    cr.set_primary('UserClient')
    return b.ExtractData(text, {"client_registry": cr})
```

### ClientRegistry Methods

| Method                                    | Description                           |
| ----------------------------------------- | ------------------------------------- |
| `add_llm_client(name, provider, options)` | Add a new LLM client                  |
| `set_primary(name)`                       | Set which client to use for this call |

**Note:** Using the same name as a BAML-defined client overwrites it for that specific call only.

## Multimodal Inputs

BAML supports images, audio, video, and PDF inputs for vision and multimodal models.

### Image Inputs

```baml
class ImageAnalysis {
  description string
  main_objects string[]
  text_detected string?
  colors string[]
}

function AnalyzeImage(img: image) -> ImageAnalysis {
  client "openai/gpt-4o"
  prompt #"
    {{ _.role("user") }}
    Analyze this image in detail:
    {{ img }}

    {{ ctx.output_format }}
  "#
}
```

**Python usage:**

```python
from baml_py import Image
from baml_client import b

# From URL
result = b.AnalyzeImage(Image.from_url("https://example.com/photo.jpg"))

# From base64
result = b.AnalyzeImage(Image.from_base64("image/png", base64_string))

# From file
with open("invoice.jpg", "rb") as f:
    result = b.AnalyzeImage(Image.from_base64("image/jpeg", f.read()))
```

**TypeScript usage:**

```typescript
import { Image } from '@boundaryml/baml'
import { b } from './baml_client'

// From URL
const result = await b.AnalyzeImage(Image.fromUrl('https://example.com/photo.jpg'))

// From base64
const result = await b.AnalyzeImage(Image.fromBase64('image/png', base64String))
```

### Audio Inputs

```baml
class Transcription {
  text string
  language string
  confidence "high" | "medium" | "low"
}

function TranscribeAudio(audio: audio) -> Transcription {
  client "openai/gpt-4o"
  prompt #"
    {{ _.role("user") }}
    Transcribe this audio and identify the language:
    {{ audio }}

    {{ ctx.output_format }}
  "#
}
```

### Multiple Images

```baml
class ComparisonResult {
  similarity_score float
  differences string[]
  main_difference string
}

function CompareImages(img1: image, img2: image) -> ComparisonResult {
  client "openai/gpt-4o"
  prompt #"
    {{ _.role("user") }}
    Compare these two images:
    {{ img1 }}
    {{ img2 }}

    {{ ctx.output_format }}
  "#
}
```

## Hierarchical Extraction

### Nested Organizations

```baml
class Employee {
  name string
  title string
  email string
}

class Department {
  name string
  manager Employee
  employees Employee[]
}

class Company {
  name string
  departments Department[]
  ceo Employee
}

function ExtractOrgChart(doc: string) -> Company {
  client "openai/gpt-4o"
  prompt #"
    Extract the complete organizational structure from this document.

    {{ _.role("user") }}
    {{ doc }}

    {{ ctx.output_format }}
  "#
}
```

### Recursive Document Structure

```baml
class Section {
  heading string
  level int @description("1 = H1, 2 = H2, etc.")
  content string
  subsections Section[]  // Recursive
}

class Document {
  title string
  author string?
  sections Section[]
}

function ExtractDocStructure(doc: string) -> Document {
  client "openai/gpt-4o"
  prompt #"
    Extract the complete document structure including nested sections.

    {{ _.role("user") }}
    {{ doc }}

    {{ ctx.output_format }}
  "#
}
```

## Table Parsing with Calculations

### Invoice with Calculated Fields

```baml
class LineItem {
  description string
  quantity int @assert(valid_qty, {{ this > 0 }})
  unit_price float @assert(valid_price, {{ this >= 0 }})
  subtotal float @description("quantity * unit_price")
}

class Invoice {
  invoice_number string
  date string
  vendor string
  line_items LineItem[] @assert(has_items, {{ this|length > 0 }})
  subtotal float @description("Sum of all line item subtotals")
  tax_rate float
  tax_amount float @description("subtotal * tax_rate")
  total float @description("subtotal + tax_amount")

  @@assert(valid_total, {{ this.total == this.subtotal + this.tax_amount }})
}

function ExtractInvoice(doc: image) -> Invoice {
  client "openai/gpt-4o"
  prompt #"
    Extract the complete invoice with ALL calculated fields.

    Important calculations:
    - Line item subtotal = quantity × unit_price
    - Invoice subtotal = sum of all line item subtotals
    - Tax amount = subtotal × tax_rate
    - Total = subtotal + tax_amount

    {{ _.role("user") }}
    {{ doc }}

    {{ ctx.output_format }}
  "#
}
```

## Best Practices

### Keep Nesting Reasonable

**Good** (2-3 levels):

```baml
class Invoice {
  vendor Company
  line_items LineItem[]
}
```

**Too Deep** (5+ levels) - split into multiple extraction passes.

### Progressive Extraction for Large Documents

For large complex documents, use multiple passes:

```python
from baml_client import b

# Pass 1: Extract structure
structure = b.ExtractStructure(document)

# Pass 2: Extract details for each section
sections = []
for section_ref in structure.section_ids:
    section = b.ExtractSection(document, section_ref)
    sections.append(section)

# Pass 3: Combine results
complete = combine(structure, sections)
```

### Token-Efficient Schemas

**Verbose** (wastes tokens):

```baml
class Person {
  fullNameIncludingMiddle string @description("Complete name with first, middle, and last name")
  currentAgeInYears int @description("The person's current age measured in years")
}
```

**Concise** (efficient):

```baml
class Person {
  name string  // Clear from context
  age int      // Years is implied
}
```

### Error Recovery with Fallbacks

```python
from baml_client import b
from baml_py.errors import BamlValidationError

try:
    # Try complex extraction first
    result = b.ExtractComplexInvoice(document)
except BamlValidationError as e:
    # Fallback to simpler schema
    print(f"Complex extraction failed: {e}, trying simple extraction")
    result = b.ExtractSimpleInvoice(document)
```

### Use Appropriate Streaming Attributes

```baml
class RealTimeAnalysis {
  // User sees title immediately when complete
  title string @stream.done @stream.not_null

  // Shows progressive updates to user
  analysis string @stream.with_state

  // Only show confidence when calculation complete
  confidence_score float @stream.done

  // Stream tags as they're extracted
  tags string[]
}
```

### Dynamic Types for User-Generated Categories

```python
from baml_client.type_builder import TypeBuilder
from baml_client import b

def classify_with_custom_categories(text: str, categories: list[str]):
    """Allow users to define their own classification categories"""
    tb = TypeBuilder()

    # Add user-provided categories
    for category in categories:
        tb.Category.add_value(category.upper())

    return b.Classify(text, {"tb": tb})

# Usage
result = classify_with_custom_categories(
    "This is urgent!",
    categories=["URGENT", "NORMAL", "LOW_PRIORITY"]
)
```
