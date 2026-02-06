---
name: CSVKit Next - Advanced CSV Toolkit
description: Transform, filter, merge, validate, and analyze CSV files. Zero dependencies. Powerful CSV processing from command line. Free CLI tool.
---

# CSVKit Next

Swiss army knife for CSV files. Filter, transform, merge, validate, analyze.

## Installation

```bash
npm install -g @lxgicstudios/csvkit-next
```

## Commands

### Filter Rows

```bash
csvkit filter data.csv age gt 30
csvkit filter users.csv email contains @gmail
csvkit filter sales.csv status eq completed
```

Operators: eq, ne, gt, lt, gte, lte, contains, startswith, endswith, regex, empty, notempty

### Transform Columns

```bash
csvkit transform data.csv "full_name=first+' '+last"
csvkit transform prices.csv "total=price*quantity"
csvkit transform users.csv "domain=email.split('@')[1]"
```

### Merge Files

```bash
csvkit merge users.csv orders.csv -o combined.csv
```

### Validate

```bash
csvkit validate data.csv
csvkit validate data.csv schema.json
```

Schema example:

```json
{
  "required": ["id", "email"],
  "types": { "age": "number", "email": "email" }
}
```

### Statistics

```bash
csvkit stats sales.csv
```

Shows: rows, columns, min/max/avg, unique values.

### Other Commands

```bash
csvkit head data.csv 20          # First 20 rows
csvkit tail data.csv 20          # Last 20 rows
csvkit columns data.csv          # List columns
csvkit sort data.csv price desc  # Sort
csvkit unique data.csv category  # Unique values
csvkit sample data.csv 50        # Random rows
csvkit convert data.csv -t json  # To JSON
```

## Common Use Cases

**Filter high-value orders:**

```bash
csvkit filter orders.csv total gt 1000 -o high_value.csv
```

**Add calculated column:**

```bash
csvkit transform sales.csv "profit=revenue-cost" -o with_profit.csv
```

**Quick data overview:**

```bash
csvkit stats large_dataset.csv
```

## Features

- Zero dependencies
- Fast streaming for large files
- Expression-based transforms
- Schema validation
- Multiple output formats

---

**Built by [LXGIC Studios](https://lxgicstudios.com)**

🔗 [GitHub](https://github.com/lxgicstudios/csvkit-next) · [Twitter](https://x.com/lxgicstudios)
