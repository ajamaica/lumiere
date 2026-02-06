# Python + BAML Reference

Python-specific patterns for BAML with Pydantic generated types.

## Installation

```bash
# Install BAML for Python
pip install baml-py      # or: poetry add baml-py / uv add baml-py

# Initialize BAML in your project (creates baml_src/ directory)
baml-cli init

# Generate the client (REQUIRED after any .baml file changes)
baml-cli generate
```

**CRITICAL**: You MUST run `baml-cli generate` every time you modify any `.baml` file.

## Generator Configuration

Create `baml_src/generators.baml` (created automatically by `baml-cli init`):

```baml
generator target {
  // Target language - use "python/pydantic" for Python
  output_type "python/pydantic"

  // Output directory relative to baml_src/
  output_dir "../"

  // Runtime version - should match installed baml-py version
  version "0.76.2"

  // Default client mode: "sync" or "async"
  default_client_mode "sync"

  // Optional: Shell command to run after generation (e.g., formatters)
  on_generate "black . && isort ."
}

// For Pydantic v1 compatibility (if needed)
generator target_v1 {
  output_type "python/pydantic/v1"
  output_dir "../baml_client_v1"
  version "0.76.2"
}
```

After running `baml-cli generate`, this creates:

```
my-project/
├── baml_src/
│   ├── generators.baml
│   ├── clients.baml
│   └── *.baml
├── baml_client/           # Generated - don't edit
│   ├── __init__.py
│   ├── types.py           # Pydantic models
│   ├── sync_client.py
│   └── async_client.py
├── pyproject.toml
└── .env
```

## Import Pattern

```python
from baml_client import b
from baml_client.types import Person, Invoice, LineItem
```

The `b` object provides access to all your BAML functions.

## Basic Usage

### Sync Usage

```python
from baml_client import b
from baml_client.types import Person

# Simple extraction
person = b.ExtractPerson(text)
print(person.name)  # Type-safe access
print(person.age)   # Optional[int]

# With validation error handling
from baml_client.errors import BamlValidationError

try:
    invoice = b.ExtractInvoice(doc)
    print(invoice.total)
except BamlValidationError as e:
    print(f"Validation failed: {e}")
```

### Async Usage

```python
import asyncio
from baml_client import b

async def extract_async():
    person = await b.ExtractPerson(text)
    return person

result = asyncio.run(extract_async())

# Or in async context
async def main():
    results = await asyncio.gather(
        b.ExtractPerson(text1),
        b.ExtractPerson(text2),
        b.ExtractPerson(text3),
    )
    return results
```

## Streaming

BAML supports structured streaming with automatic partial JSON parsing.

### Sync Streaming

```python
from baml_client import b

# Stream with b.stream.FunctionName()
stream = b.stream.ExtractData(large_doc)

for partial in stream:
    # Partial object with nullable fields
    print(f"Progress: {len(partial.items) if partial.items else 0} items")

# Get the final, validated result
final = stream.get_final_response()
print(f"Complete: {final}")
```

### Async Streaming

```python
async def stream_extraction(doc: str):
    async for partial in b.stream.ExtractData(doc):
        # Update UI with partial results
        update_ui(partial)

    # Or get final result
    final = stream.get_final_response()
    return final
```

### Semantic Streaming

Control how fields stream with BAML attributes:

```baml
class BlogPost {
  // Post won't stream until title is complete
  title string @stream.done @stream.not_null

  // Content streams token-by-token
  content string

  // Tags only appear when fully parsed
  tags string[] @stream.done
}
```

## Type Safety with Pydantic

### Generated Pydantic Models

BAML classes generate full Pydantic models:

```python
# From baml_client/types.py (auto-generated)
from pydantic import BaseModel
from typing import Optional

class Person(BaseModel):
    name: str
    email: str
    age: Optional[int] = None

# Full type hints and IDE autocomplete
person = b.ExtractPerson(text)
person.name    # str - autocomplete works
person.age     # Optional[int]
```

### Union Type Handling

```python
from baml_client.types import GetWeather, SearchWeb, Calculator

result = b.SelectTool(query)

# Pattern matching (Python 3.10+)
match result:
    case GetWeather(location=loc, units=u):
        return fetch_weather(loc, u)
    case SearchWeb(query=q):
        return search(q)
    case Calculator(expression=expr):
        return eval_safe(expr)

# isinstance (all Python versions)
if isinstance(result, GetWeather):
    return fetch_weather(result.location, result.units)
elif isinstance(result, SearchWeb):
    return search(result.query)
elif isinstance(result, Calculator):
    return eval_safe(result.expression)
```

## Multimodal Inputs

### Image Handling

```python
from baml_py import Image
from baml_client import b

# From URL
result = b.DescribeImage(
    img=Image.from_url("https://example.com/image.png")
)

# From local file
result = b.DescribeImage(
    img=Image.from_url("file:///path/to/image.jpg")
)

# From base64
result = b.DescribeImage(
    img=Image.from_base64("image/png", base64_string)
)
```

### BAML Function Definition

```baml
function DescribeImage(img: image) -> string {
  client "openai/gpt-4o"
  prompt #"
    {{ _.role("user") }}
    Describe this image in detail:
    {{ img }}
  "#
}
```

## TypeBuilder (Dynamic Types)

Modify output schemas at runtime - useful for dynamic categories from databases.

### Setup: Mark Types as @@dynamic

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
```

### Add Values/Properties at Runtime

```python
from baml_client.type_builder import TypeBuilder
from baml_client import b

tb = TypeBuilder()

# Add enum values dynamically
tb.Category.add_value('GREEN')
tb.Category.add_value('YELLOW')

# Add class properties dynamically
tb.User.add_property('email', tb.string())
tb.User.add_property('address', tb.string().optional())

# Pass TypeBuilder when calling function
result = b.Categorize("The sun is bright", {"tb": tb})
```

### Create New Types at Runtime

```python
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
address.add_property("zip", tb.string().optional())

# Attach to existing type
tb.User.add_property("hobbies", hobbies.type().list())
tb.User.add_property("address", address.type())

result = b.ExtractUser(data, {"tb": tb})
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

Modify LLM clients at runtime - useful for A/B testing, user-specific API keys, or dynamic model selection.

```python
from baml_py import ClientRegistry
from baml_client import b
import os

cr = ClientRegistry()

# Add a new client at runtime
cr.add_llm_client(
    name='CustomGPT4',
    provider='openai',
    options={
        "model": "gpt-4o",
        "temperature": 0.7,
        "api_key": os.environ.get('CUSTOM_OPENAI_KEY')
    }
)

# Set as the primary client for this call
cr.set_primary('CustomGPT4')

# Use the custom client
result = b.ExtractResume(resume_text, {"client_registry": cr})
```

### ClientRegistry Methods

| Method                                    | Description             |
| ----------------------------------------- | ----------------------- |
| `add_llm_client(name, provider, options)` | Add a new LLM client    |
| `set_primary(name)`                       | Set which client to use |

**Note**: Using the same name as a BAML-defined client overwrites it for that call.

## Validation and Checks

### Check Results

BAML provides access to validation checks:

```python
result = b.ExtractData(text)

# Access individual checks (from @check attributes)
if result.__baml_checks__.has_source.passed:
    process(result.source)
else:
    log_warning("Missing source")

# Check all validations
all_passed = all(
    check.passed
    for check in result.__baml_checks__.__dict__.values()
)
```

### Error Handling

```python
from baml_client.errors import BamlValidationError

try:
    result = b.ExtractInvoice(doc)
    process_invoice(result)
except BamlValidationError as e:
    logger.error(f"Validation failed: {e}")
    result = fallback_extraction(doc)
```

## Testing

### Run BAML Tests

```bash
# Run all tests defined in .baml files
baml-cli test

# Run specific test
baml-cli test -i "ExtractPerson:TestJohnSmith"

# See all options
baml-cli test --help
```

### Python Unit Tests

```python
import pytest
from baml_client import b

def test_person_extraction():
    text = "John Smith, john@example.com, age 30"
    result = b.ExtractPerson(text)

    assert result.name == "John Smith"
    assert result.email == "john@example.com"
    assert result.age == 30

@pytest.mark.asyncio
async def test_async_extraction():
    text = "Jane Doe, jane@example.com"
    result = await b.ExtractPerson(text)
    assert result.name == "Jane Doe"
    assert result.email == "jane@example.com"

def test_streaming():
    stream = b.stream.ExtractData(large_doc)
    partials = list(stream)

    assert len(partials) > 0
    final = stream.get_final_response()
    assert final is not None
```

## Environment Variables

```python
# .env file
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...

# Load environment variables before importing baml_client
from dotenv import load_dotenv
load_dotenv()

from baml_client import b

# BAML functions will automatically use environment variables
# referenced in clients.baml with env.OPENAI_API_KEY syntax
```

## Project Setup Examples

### With uv (Recommended)

```bash
# Create project
uv init my-baml-project
cd my-baml-project

# Add BAML
uv add baml-py

# Initialize BAML structure
baml-cli init

# Generate client code
baml-cli generate

# Run your code
uv run python main.py
```

### With pip

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install BAML
pip install baml-py

# Initialize and generate
baml-cli init
baml-cli generate
```

### With Poetry

```bash
# Create project
poetry new my-baml-project
cd my-baml-project

# Add BAML
poetry add baml-py

# Initialize and generate
baml-cli init
baml-cli generate

# Run
poetry run python main.py
```

## Complete Example

```python
from baml_client import b
from baml_client.types import Resume, WorkExperience
from baml_py import Image
from baml_client.errors import BamlValidationError
import asyncio

def sync_example():
    """Synchronous extraction"""
    resume_text = """
    John Smith
    Software Engineer at Google (2020-2023)
    Python, TypeScript, Go
    """

    try:
        resume = b.ExtractResume(resume_text)
        print(f"Name: {resume.name}")
        for job in resume.work_experience:
            print(f"  {job.title} at {job.company}")
    except BamlValidationError as e:
        print(f"Extraction failed: {e}")

async def async_example():
    """Async extraction with concurrency"""
    resumes = [resume1, resume2, resume3]

    results = await asyncio.gather(
        *[b.ExtractResume(r) for r in resumes]
    )

    return results

def streaming_example():
    """Stream results for large documents"""
    stream = b.stream.ExtractResume(large_resume)

    for partial in stream:
        # Show partial results as they arrive
        if partial.name:
            print(f"Found name: {partial.name}")
        if partial.work_experience:
            print(f"Jobs so far: {len(partial.work_experience)}")

    final = stream.get_final_response()
    return final

def image_example():
    """Vision model example"""
    result = b.AnalyzeScreenshot(
        img=Image.from_url("https://example.com/screenshot.png")
    )
    return result

if __name__ == "__main__":
    sync_example()
    asyncio.run(async_example())
    streaming_example()
```

## Best Practices

1. **Always run `baml-cli generate`** - After ANY change to `.baml` files
2. **Use type hints** - Generated code has full type hints for IDE support
3. **Handle validation errors** - Wrap in try/except for production code
4. **Stream for large documents** - Better UX and memory efficiency
5. **Use async for high throughput** - Better concurrency than threads
6. **Use uv for dependency management** - Faster and more reliable than pip
7. **Load environment variables first** - Before importing `baml_client`
8. **Leverage Pydantic features** - Generated models support `.dict()`, `.json()`, validation

## Documentation

For detailed documentation, visit: **https://docs.boundaryml.com**

Key pages:

- Python Client: `docs.boundaryml.com/ref/baml-client/python`
- TypeBuilder: `docs.boundaryml.com/ref/baml-client/typebuilder`
- ClientRegistry: `docs.boundaryml.com/guide/baml-advanced/client-registry`
- Streaming: `docs.boundaryml.com/guide/baml-basics/streaming`
