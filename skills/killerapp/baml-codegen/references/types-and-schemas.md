# BAML Types and Schemas Reference

## Primitive Types

| Type     | Examples        |
| -------- | --------------- |
| `bool`   | `true`, `false` |
| `int`    | `42`, `-10`     |
| `float`  | `3.14`, `-0.5`  |
| `string` | `"text"`        |
| `null`   | `null`          |

## Composite Types

| Type     | Syntax                 | Notes                            |
| -------- | ---------------------- | -------------------------------- |
| Array    | `string[]`, `int[][]`  | Cannot be optional               |
| Optional | `string?`              | Shorthand for nullable           |
| Union    | `string \| int`        | Tries types in order             |
| Map      | `map<string, int>`     | Keys: string or enum only        |
| Literal  | `"a" \| "b"`, `1 \| 2` | Prefer over enums for small sets |

## Multimodal Types

`image`, `audio`, `video`, `pdf` - use in function inputs with vision/audio models.

```python
from baml_py import Image
result = b.DescribeImage(Image.from_url("https://example.com/photo.jpg"))
```

## Class Syntax

```baml
class MyObject {
  name string                              // Required
  nickname string?                         // Optional
  age int @description("Age in years")     // With description
  email string @alias("email_address")     // Renamed for LLM
  tags string[]                            // Array
  status "pending" | "done"                // Literal union
  metadata map<string, string>             // Map
}
```

## Field Attributes

| Attribute      | Purpose              | Example                              |
| -------------- | -------------------- | ------------------------------------ |
| `@description` | Guide LLM extraction | `@description("Format: yyyy-mm-dd")` |
| `@alias`       | Rename for LLM       | `@alias("full_name")`                |
| `@skip`        | Exclude from prompt  | `@skip`                              |

## Class Attributes

| Attribute   | Purpose                                       |
| ----------- | --------------------------------------------- |
| `@@dynamic` | Allow runtime field additions via TypeBuilder |

## Enum Syntax

```baml
enum Status {
  PENDING
  ACTIVE @description("Currently processing")
  CANCELLED @alias("CANCELED")
  INTERNAL @skip
  @@dynamic  // Optional: runtime additions
}
```

## TypeBuilder (Runtime Types)

**Python**:

```python
from baml_client.type_builder import TypeBuilder
tb = TypeBuilder()
tb.Category.add_value("NEW_VALUE")
tb.User.add_property("email", tb.string())
result = b.Extract(text, {"tb": tb})
```

| Method                                | Description      |
| ------------------------------------- | ---------------- |
| `tb.string()/.int()/.float()/.bool()` | Primitive types  |
| `.list()`                             | Array wrapper    |
| `.optional()`                         | Optional wrapper |
| `tb.add_class("Name")`                | Create new class |
| `tb.add_enum("Name")`                 | Create new enum  |
| `.add_property(name, type)`           | Add to class     |
| `.add_value(name)`                    | Add to enum      |

## Union Types for Tool Selection

```baml
function RouteRequest(input: string) -> SearchQuery | WeatherRequest | CalendarEvent {
  client "openai/gpt-4o"
  prompt #"{{ input }} {{ ctx.output_format }}"#
}
```

```python
if isinstance(result, WeatherRequest): handle_weather(result.city)
```

## Recursive Types

```baml
class Section {
  heading string
  subsections Section[]  // Self-reference
}
```

## Best Practices

| Category        | Recommendation                                              |
| --------------- | ----------------------------------------------------------- |
| Accuracy        | `temperature 0.0`, `@description` for ambiguous fields      |
| Design          | Max 3-4 nesting levels, one class per concept               |
| Efficiency      | Use `@skip` for non-LLM fields, rely on `ctx.output_format` |
| Maintainability | Type aliases for complex types, composition over nesting    |

**Docs**: https://docs.boundaryml.com/guide/baml-basics/types
