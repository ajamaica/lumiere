# Validation Patterns Reference

## Overview

| Decorator | Behavior                       | Use Case                |
| --------- | ------------------------------ | ----------------------- |
| `@assert` | Raises exception on failure    | Critical business rules |
| `@check`  | Tracks pass/fail, non-blocking | Quality monitoring      |

Both use Jinja2 expressions: `{{ expression }}`

## Syntax Levels

| Level  | Assert                                 | Check                                 |
| ------ | -------------------------------------- | ------------------------------------- |
| Field  | `field Type @assert(name, {{ expr }})` | `field Type @check(name, {{ expr }})` |
| Block  | `@@assert(name, {{ expr }})`           | `@@check(name, {{ expr }})`           |
| Return | `-> Type @assert(name, {{ expr }})`    | `-> Type @check(name, {{ expr }})`    |

## @assert Examples

```baml
class Payment {
  amount float @assert(positive, {{ this > 0 }})
  currency string @assert(valid, {{ this in ["USD", "EUR", "GBP"] }})
  discount float @assert(range, {{ this >= 0 and this <= 100 }})
}

class User {
  username string @assert(length, {{ this|length >= 3 and this|length <= 20 }})
  email string @assert(format, {{ this|regex_match("^[^@]+@[^@]+\\.[^@]+$") }})
}

class Data {
  tags string[] @assert(non_empty, {{ this|length > 0 }})
  scores int[] @assert(range, {{ this|min >= 0 and this|max <= 100 }})
}
```

## @check Examples

```baml
class Citation {
  quote string @check(found, {{ this|length > 0 }})
  link string @check(https, {{ "https://" in this }})
}
```

**Accessing results**:

```python
if result.__baml_checks__.found.passed:
    print("Valid")
```

## Block-Level (Cross-Field)

```baml
class Invoice {
  subtotal float
  tax float
  total float
  @@assert(valid_total, {{ this.total == this.subtotal + this.tax }})
}
```

## Return Type Assertions

```baml
function GetScore(input: string) -> int @assert(valid, {{ this >= 0 and this <= 100 }}) {
  client "openai/gpt-4o"
  prompt #"Rate 0-100: {{ input }} {{ ctx.output_format }}"#
}
```

## Jinja Operators & Filters

| Type       | Examples                                            |
| ---------- | --------------------------------------------------- |
| Comparison | `{{ this > 0 }}`, `{{ this >= 10 and this < 100 }}` |
| Membership | `{{ this in ["a", "b"] }}`, `{{ "@" in this }}`     |
| Filters    | `\|length`, `\|lower`, `\|regex_match("pattern")`   |
| Collection | `\|min`, `\|max`, `\|sum`, `\|unique`               |

## Patterns

**Layered Validation**:

```baml
class Transaction {
  amount float
    @assert(positive, {{ this > 0 }})
    @check(reasonable, {{ this <= 10000 }})
}
```

**Calculated Field Verification**:

```baml
class LineItem {
  quantity int
  unit_price float
  subtotal float @check(calc, {{ this == quantity * unit_price }})
}
```

**Confidence Scoring**:

```python
confidence = sum(1 for c in result.__baml_checks__.__dict__.values() if c.passed) / len(result.__baml_checks__.__dict__)
if confidence < 0.7: queue_for_review(result)
```

## Best Practices

| Use @assert For         | Use @check For                |
| ----------------------- | ----------------------------- |
| Critical business rules | Quality monitoring            |
| Data integrity          | Optional validations          |
| Type constraints        | Calculated field verification |
| Security validations    | Confidence tracking           |

## Error Handling

```python
from baml_client.errors import BamlValidationError
try:
    result = b.ExtractData(text)
except BamlValidationError:
    result = fallback_extract(text)
```
