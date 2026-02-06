# Other Languages Reference

BAML supports multiple language targets beyond Python and TypeScript. The workflow is consistent across all languages: define `.baml` files → run `baml-cli generate` → import generated client.

## Supported Languages

| Language         | Generator Type     | Status |
| ---------------- | ------------------ | ------ |
| Python/Pydantic  | `python/pydantic`  | Stable |
| TypeScript       | `typescript`       | Stable |
| TypeScript/React | `typescript/react` | Stable |
| Go               | `go`               | Stable |
| Ruby/Sorbet      | `ruby/sorbet`      | Stable |

## Go Support

### Generator Configuration

```baml
generator target {
  // Target language - Go
  output_type "go"

  // Output directory relative to baml_src/
  output_dir "../"

  // Runtime version - should match installed package version
  version "0.76.2"

  // Go module path for imports (optional but recommended)
  package_name "github.com/your-org/your-project"

  // Shell command to run after generation (e.g., formatters)
  on_generate "gofmt -w . && goimports -w ."
}
```

### Usage Workflow

1. **Install BAML CLI** (if not already installed):

   ```bash
   # Via Homebrew (macOS/Linux)
   brew install boundaryml/baml/baml

   # Or download from releases
   # https://github.com/BoundaryML/baml/releases
   ```

2. **Initialize BAML** in your Go project:

   ```bash
   baml-cli init
   ```

3. **Define your BAML schemas** in `baml_src/`:

   ```baml
   class Resume {
     name string
     email string
     skills string[]
   }

   function ExtractResume(text: string) -> Resume {
     client "openai/gpt-4o"
     prompt #"
       Extract resume information from:
       {{ text }}

       {{ ctx.output_format }}
     "#
   }
   ```

4. **Generate the Go client**:

   ```bash
   baml-cli generate
   ```

5. **Import and use** in your Go code:

   ```go
   package main

   import (
       "context"
       "fmt"
       "github.com/your-org/your-project/baml_client"
   )

   func main() {
       client := baml_client.NewBamlClient()

       resume, err := client.ExtractResume(
           context.Background(),
           "John Doe, john@example.com, Skills: Go, Python, Rust",
       )
       if err != nil {
           panic(err)
       }

       fmt.Printf("Name: %s\n", resume.Name)
       fmt.Printf("Email: %s\n", resume.Email)
       fmt.Printf("Skills: %v\n", resume.Skills)
   }
   ```

## Ruby Support

### Generator Configuration

```baml
generator target {
  // Target language - Ruby with Sorbet types
  output_type "ruby/sorbet"

  // Output directory relative to baml_src/
  output_dir "../"

  // Runtime version - should match installed package version
  version "0.76.2"

  // Shell command to run after generation (optional)
  on_generate "bundle exec rubocop -a"
}
```

### Usage Workflow

1. **Install BAML** for Ruby:

   ```bash
   # Add to Gemfile
   gem 'baml'

   # Install
   bundle install
   ```

2. **Initialize BAML**:

   ```bash
   baml-cli init
   ```

3. **Define your BAML schemas** in `baml_src/`:

   ```baml
   class Product {
     name string
     price float
     category "electronics" | "clothing" | "food"
   }

   function ClassifyProduct(description: string) -> Product {
     client "openai/gpt-4o"
     prompt #"
       Classify this product:
       {{ description }}

       {{ ctx.output_format }}
     "#
   }
   ```

4. **Generate the Ruby client** (with Sorbet types):

   ```bash
   baml-cli generate
   ```

5. **Import and use** in your Ruby code:

   ```ruby
   require_relative 'baml_client'

   client = BamlClient.new

   product = client.classify_product(
     "Apple MacBook Pro 16-inch, M3 Max, $3499"
   )

   puts "Name: #{product.name}"
   puts "Price: #{product.price}"
   puts "Category: #{product.category}"
   ```

## Generator Block Configuration

The `generator` block in `baml_src/generators.baml` configures code generation. Created by `baml-cli init`.

### Common Options

| Option                | Description                                            | Required |
| --------------------- | ------------------------------------------------------ | -------- |
| `output_type`         | Target language/format                                 | Yes      |
| `output_dir`          | Directory for generated code (relative to `baml_src/`) | Yes      |
| `version`             | BAML runtime version (must match CLI)                  | Yes      |
| `default_client_mode` | Client mode: `"sync"` or `"async"`                     | No       |
| `on_generate`         | Shell command to run after generation                  | No       |

### Language-Specific Options

#### Go

```baml
generator go {
  output_type "go"
  output_dir "../"
  version "0.76.2"

  // Go module path for imports
  package_name "github.com/your-org/your-project"

  // Post-generation formatting
  on_generate "gofmt -w . && goimports -w . && go mod tidy"
}
```

#### Ruby/Sorbet

```baml
generator ruby {
  output_type "ruby/sorbet"
  output_dir "../"
  version "0.76.2"

  // Post-generation linting/formatting
  on_generate "bundle exec rubocop -a"
}
```

#### TypeScript (for reference)

```baml
generator typescript {
  output_type "typescript"
  output_dir "../"
  version "0.76.2"

  // Module format: "esm" or "cjs" (CommonJS)
  module_format "esm"

  // Post-generation formatting
  on_generate "prettier --write ."
}
```

## Multiple Generators

You can configure multiple generators in one project to generate clients for different languages:

```baml
// Python backend
generator python {
  output_type "python/pydantic"
  output_dir "../backend/baml_client"
  version "0.76.2"
  on_generate "black . && isort ."
}

// TypeScript frontend
generator typescript {
  output_type "typescript"
  output_dir "../frontend/baml_client"
  version "0.76.2"
  module_format "esm"
}

// Go service
generator go {
  output_type "go"
  output_dir "../go-service/baml_client"
  version "0.76.2"
  package_name "github.com/your-org/go-service"
  on_generate "gofmt -w . && go mod tidy"
}

// Ruby microservice
generator ruby {
  output_type "ruby/sorbet"
  output_dir "../ruby-service/baml_client"
  version "0.76.2"
}
```

This allows the same BAML schemas to generate type-safe clients for different parts of your stack.

## Version Synchronization

**Critical:** The `version` field must match your installed BAML CLI version.

```bash
# Check CLI version
baml-cli --version

# Update generator to match
generator target {
  output_type "go"
  output_dir "../"
  version "0.76.2"  // Must match CLI version!
}
```

If versions mismatch, you'll get errors during generation.

## Post-Generation Hooks

Use `on_generate` for automatic formatting and validation:

```baml
// Go - format, imports, and tidy
generator go {
  output_type "go"
  output_dir "../"
  version "0.76.2"
  on_generate "gofmt -w . && goimports -w . && go mod tidy"
}

// Ruby - run rubocop
generator ruby {
  output_type "ruby/sorbet"
  output_dir "../"
  version "0.76.2"
  on_generate "bundle exec rubocop -a"
}

// Python - run black and isort
generator python {
  output_type "python/pydantic"
  output_dir "../"
  version "0.76.2"
  on_generate "black . && isort ."
}

// TypeScript - run prettier
generator typescript {
  output_type "typescript"
  output_dir "../"
  version "0.76.2"
  on_generate "prettier --write ."
}
```

## Workflow Summary

Regardless of the target language, the workflow is the same:

1. **Install BAML CLI** and language-specific package
2. **Run `baml-cli init`** to create `baml_src/` directory and generator config
3. **Define `.baml` files** with classes, enums, and functions
4. **Run `baml-cli generate`** after ANY change to `.baml` files
5. **Import the generated client** in your application code

The generated code is type-safe and provides:

- Strongly-typed function calls
- Automatic JSON parsing and validation
- Language-native data structures (structs in Go, classes in Ruby, etc.)
- Sync and async support (where applicable)

## Notes

- **Go**: Generates standard Go structs with JSON tags
- **Ruby**: Generates Sorbet-typed classes for static type checking
- **TypeScript**: Generates interfaces and typed client functions
- **Python**: Generates Pydantic models for validation

All languages benefit from the same BAML features:

- Type safety
- Automatic schema generation
- Validation and assertions
- Multimodal support (images, audio, etc.)
- Streaming (where supported by the language runtime)
