# Image & Form Extraction Patterns

Extracting structured data from images, PDFs, and multi-turn form conversations.

## Receipt/Invoice Extraction

### Schema Design

```baml
class LineItem {
  name string
  price float
  quantity int @description("If not specified, assume 1")
}

class Receipt {
  establishment_name string
  date string @description("ISO8601 formatted date")
  total int @description("Total amount in cents")
  currency string
  items LineItem[]
}

function ExtractReceipt(receipt: image) -> Receipt {
  client GPT4o  // Vision-capable model required
  prompt #"
    {{ _.role("user") }}
    Extract info from this receipt:
    {{ receipt }}
    {{ ctx.output_format }}
  "#
}
```

### Image Input Methods

**Python:**

```python
from baml_py import Image

# From URL
result = b.ExtractReceipt(
    receipt=Image.from_url("https://example.com/receipt.jpg")
)

# From local file
result = b.ExtractReceipt(
    receipt=Image.from_url("file:///path/to/receipt.jpg")
)

# From base64
result = b.ExtractReceipt(
    receipt=Image.from_base64("image/jpeg", base64_data)
)
```

**TypeScript:**

```typescript
import { Image } from '@boundaryml/baml'

const result = await b.ExtractReceipt({
  receipt: Image.fromUrl('https://example.com/receipt.jpg'),
})
```

## Multi-Turn Form Filling

Use union types for action-based responses.

### Schema

```baml
class Form {
  leaveType ("annual" | "sick" | "personal")?
  fromDate string? @description("DD-MM-YYYY format")
  toDate string?
  reason string?
  confidence ("high" | "medium" | "low")?
}

class UpdateForm {
  action "update_form"
  form Form
  completed bool
  next_question string?
}

class RespondToUser {
  action "reply_to_user"
  message string
}

class Cancel {
  action "cancel"
}

function Chat(
  current_form: Form,
  chat: Message[]
) -> UpdateForm | RespondToUser | Cancel {
  client GPT4o
  prompt #"
    Help user complete this form.

    Form so far: {{ current_form }}

    {% for m in chat %}
    {{ _.role(m.role) }}
    {{ m.content }}
    {% endfor %}

    {{ _.role('system') }}
    {{ ctx.output_format }}
  "#
}
```

### Python Loop

```python
form = Form()
chat_history = []

while True:
    user_input = input("> ")
    chat_history.append(Message(role="user", content=user_input))

    result = b.Chat(current_form=form, chat=chat_history)

    if isinstance(result, UpdateForm):
        form = result.form
        if result.completed:
            print("Form complete!")
            break
        if result.next_question:
            print(f"Bot: {result.next_question}")
            chat_history.append(Message(role="assistant", content=result.next_question))
    elif isinstance(result, RespondToUser):
        print(f"Bot: {result.message}")
        chat_history.append(Message(role="assistant", content=result.message))
    elif isinstance(result, Cancel):
        print("Cancelled")
        break
```

## Document Classification + Extraction

Two-pass pattern for mixed document types.

```baml
enum DocumentType {
  INVOICE
  RECEIPT
  CONTRACT
  RESUME
  UNKNOWN
}

function ClassifyDocument(doc: image) -> DocumentType {
  client GPT4o
  prompt #"
    {{ _.role("user") }}
    What type of document is this?
    {{ doc }}
    {{ ctx.output_format }}
  "#
}

// Then route to specific extractors
function ExtractInvoice(doc: image) -> Invoice { ... }
function ExtractReceipt(doc: image) -> Receipt { ... }
function ExtractResume(doc: image) -> Resume { ... }
```

**Python routing:**

```python
doc_type = b.ClassifyDocument(doc)

match doc_type:
    case DocumentType.INVOICE:
        result = b.ExtractInvoice(doc)
    case DocumentType.RECEIPT:
        result = b.ExtractReceipt(doc)
    case DocumentType.RESUME:
        result = b.ExtractResume(doc)
```

## Validation for Forms

```baml
class Payment {
  amount float @assert(this > 0)
  currency string @assert(this in ["USD", "EUR", "GBP"])
  date string @check(this|regex_match("\\d{4}-\\d{2}-\\d{2}"), valid_date)
}
```

## Example Projects

See working examples:

- `baml-examples/java-gradle-openapi-starter/baml_src/01-extract-receipt.baml`
- `baml-examples/java-gradle-openapi-starter/baml_src/multi-modal/image-input.baml`
- `baml-examples/form-filler/` - Complete form-filling chatbot

## Tips

1. **Use vision models** - GPT-4o, Claude 3 Opus/Sonnet for images
2. **ISO dates** - Always specify date format in @description
3. **Optional fields** - Use `?` for fields that may not exist
4. **Confidence tracking** - Add confidence field for uncertain extractions
5. **Literal type discriminators** - Use `action "type_name"` for union routing
